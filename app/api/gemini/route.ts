import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRenamesRequest } from "@/types";
import { sanitizeFileName, getExtension, getBaseName } from "@/types";
import { getProvider, DEFAULT_PROVIDER, type ProviderId } from "@/lib/ai-providers";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres RenombrAitor, un asistente experto en renombrar archivos de forma inteligente y consistente.

IMPORTANTE: Solo recibes NOMBRES de archivos (no su contenido). Trabaja únicamente con los nombres.

Reglas CRÍTICAS que SIEMPRE debes seguir:
1. SIEMPRE mantén la extensión original del archivo (ej: .pdf, .jpg, .mp3)
2. NUNCA uses caracteres inválidos: < > : " / \\ | ? * y caracteres de control
3. Los nombres propuestos deben ser únicos (sin duplicados)
4. Sé consistente con el formato solicitado en todos los archivos
5. Si el usuario pide snake_case, TODOS los archivos deben estar en snake_case
6. Responde SIEMPRE en español

Cuando el usuario te dé instrucciones de renombrado, responde ÚNICAMENTE con JSON válido (sin texto antes ni después):
{"type":"proposals","message":"Descripción breve","proposals":[{"fileId":"file-0","originalName":"archivo.jpg","proposedName":"nuevo.jpg"}]}

Si el usuario hace conversación:
{"type":"conversation","message":"Tu respuesta aquí"}`;

// ─── Retry with exponential backoff ──────────────────────────────────────────
// Retries on quota/rate-limit errors (429, 503) up to maxAttempts times.
// Waits: 2s → 4s → 8s → 16s between attempts.

const RETRYABLE_CODES = new Set([429, 503, 500]);
const RETRYABLE_MESSAGES = ["quota", "rate", "limit", "overloaded", "resource exhausted"];

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (RETRYABLE_MESSAGES.some((kw) => msg.includes(kw))) return true;
  }
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 2000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts - 1) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
      const jitter = Math.random() * 500;               // ±500ms jitter
      console.warn(`[RenombrAitor] Attempt ${attempt + 1} failed, retrying in ${Math.round((delay + jitter) / 1000)}s…`);
      await sleep(delay + jitter);
    }
  }
  throw lastErr;
}

// ─── Rate-limited sequential fetch ───────────────────────────────────────────
// When a large file list needs to be split into batches, process them
// sequentially with a delay to avoid flooding free-tier APIs.
// Currently the entire list is sent in one request (names only = tiny payload),
// so rate limiting mainly guards against retried bursts.

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── OpenAI-compatible call ───────────────────────────────────────────────────
async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://renombraitor.vercel.app",
      "X-Title": "RenombrAitor",
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096, temperature: 0.2 }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
    // Attach status so isRetryable can inspect it
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Gemini call ──────────────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  model: string,
  contextMessage: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(contextMessage);
  return result.response.text().trim();
}

// ─── Parse & validate proposals ──────────────────────────────────────────────
function parseResponse(responseText: string, files: GenerateRenamesRequest["files"]) {
  let parsed: {
    type: string;
    message: string;
    proposals?: Array<{ fileId: string; originalName: string; proposedName: string }>;
  };

  try {
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { isConversational: true, message: responseText };
  }

  if (parsed.type === "proposals" && parsed.proposals) {
    const validated = parsed.proposals
      .map((p) => {
        const originalExt = getExtension(p.originalName);
        const proposedExt = getExtension(p.proposedName);
        let finalName = p.proposedName;
        if (originalExt && proposedExt !== originalExt) {
          finalName = `${getBaseName(p.proposedName)}.${originalExt}`;
        }
        finalName = sanitizeFileName(finalName);
        return { fileId: p.fileId, originalName: p.originalName, proposedName: finalName || p.originalName };
      })
      .filter((p) => p.proposedName);
    return { proposals: validated, message: parsed.message };
  }

  return { isConversational: true, message: parsed.message ?? responseText };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: GenerateRenamesRequest & { providerId?: ProviderId };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { files, instruction, conversationHistory, providerId } = body;

  // Only authenticated users can use the AI API
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para usar la IA. El Toolbox está disponible sin cuenta." },
      { status: 401 }
    );
  }

  if (!files || !instruction) {
    return NextResponse.json({ error: "Faltan campos: files, instruction" }, { status: 400 });
  }

  const provider = getProvider(providerId ?? DEFAULT_PROVIDER);
  const apiKey = process.env[provider.envKey];

  if (!apiKey) {
    return NextResponse.json(
      { error: `API key para ${provider.label} no configurada. Variable de entorno: "${provider.envKey}"` },
      { status: 500 }
    );
  }

  // Build file list — ONLY names, never file contents (keeps tokens minimal)
  const fileListText = files.map((f, idx) => `[file-${idx}] ${f.name}`).join("\n");
  const contextMessage = `Lista de nombres de archivo (${files.length} archivos) — solo se procesan nombres, no contenido:\n${fileListText}\n\nInstrucción: ${instruction}`;

  try {
    let responseText: string;

    if (provider.id === "gemini-flash" || provider.id === "gemini-flash-lite") {
      // ── Gemini SDK — with retry ──────────────────────────────────────────
      const rawHistory = conversationHistory
        .slice(-8)
        .filter((m) => m.content?.trim())
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          parts: [{ text: m.content }],
        }));

      while (rawHistory.length > 0 && rawHistory[0].role === "model") rawHistory.shift();

      const history: typeof rawHistory = [];
      for (const msg of rawHistory) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg;
        } else {
          history.push(msg);
        }
      }

      responseText = await withRetry(() =>
        callGemini(apiKey, provider.model, contextMessage, history)
      );
    } else {
      // ── OpenAI-compatible — with retry ───────────────────────────────────
      // Build messages array sequentially (for…of, not Promise.all)
      // to respect rate limits on free-tier APIs.
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      // Add conversation history one by one (sequential, rate-limited)
      const historyItems = conversationHistory
        .slice(-6)
        .filter((m) => m.content?.trim());

      for (const m of historyItems) {
        messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
        // Small delay between building context to avoid any burst
        await sleep(50);
      }

      messages.push({ role: "user", content: contextMessage });

      responseText = await withRetry(() =>
        callOpenAICompat(provider.baseUrl!, apiKey, provider.model, messages)
      );
    }

    return NextResponse.json(parseResponse(responseText, files));
  } catch (err) {
    console.error(`[${provider.label}] error:`, err);
    const msg = err instanceof Error ? err.message : "Error desconocido";

    // Return a friendly quota/rate-limit message
    if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("429") || msg.toLowerCase().includes("rate")) {
      return NextResponse.json(
        { error: `⏳ Cuota de ${provider.label} agotada. Espera unos minutos o cambia de proveedor en el selector de modelo.` },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: `[${provider.label}] ${msg}` }, { status: 500 });
  }
}
