import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRenamesRequest } from "@/types";
import { sanitizeFileName, getExtension, getBaseName } from "@/types";
import { getProvider, DEFAULT_PROVIDER, type ProviderId } from "@/lib/ai-providers";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── Singleton Gemini client (reuse across warm invocations) ──────────────────
declare global {
  // eslint-disable-next-line no-var
  var __genAI: GoogleGenerativeAI | undefined;
}

function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!globalThis.__genAI) {
    globalThis.__genAI = new GoogleGenerativeAI(apiKey);
  }
  return globalThis.__genAI;
}

// ─── Per-user dedup guard (blocks double-fire within 2s) ─────────────────────
// Solves React StrictMode / double-mount sending two requests simultaneously.
const inflightMap = new Map<string, number>(); // userId → timestamp of last accepted request
const DEDUP_WINDOW_MS = 2_000;

function isDuplicate(userId: string): boolean {
  const last = inflightMap.get(userId) ?? 0;
  const now = Date.now();
  if (now - last < DEDUP_WINDOW_MS) return true;
  inflightMap.set(userId, now);
  return false;
}

// ─── sleep ────────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Quota-error classifier ───────────────────────────────────────────────────
const QUOTA_KEYWORDS = [
  "resource_exhausted",
  "resource exhausted",
  "quota exceeded",
  "ratelimitexceeded",
  "rate_limit_exceeded",
  "too many requests",
  "requests per minute",
  "requests per day",
];

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return QUOTA_KEYWORDS.some((kw) => msg.includes(kw));
}

// ─── Server-side retry (quota errors only, 2 attempts max) ───────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isQuotaError(err) || attempt === maxAttempts - 1) throw err;
      const delay = 4_000 * (attempt + 1); // 4s, 8s
      console.warn(`[RenombrAitor] Quota hit attempt ${attempt + 1}, waiting ${delay / 1000}s`);
      await sleep(delay);
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres RenombrAitor, un asistente experto en renombrar archivos de forma inteligente y consistente.

IMPORTANTE: Solo recibes NOMBRES de archivos (no su contenido). Trabaja únicamente con los nombres.

Reglas CRÍTICAS:
1. SIEMPRE mantén la extensión original del archivo
2. NUNCA uses caracteres inválidos: < > : " / \\ | ? * ni caracteres de control
3. Los nombres propuestos deben ser únicos
4. Sé consistente en todos los archivos
5. Responde SIEMPRE en español

Cuando recibas instrucciones de renombrado, responde ÚNICAMENTE con JSON válido sin texto adicional:
{"type":"proposals","message":"Descripción breve","proposals":[{"fileId":"file-0","originalName":"archivo.jpg","proposedName":"nuevo.jpg"}]}

Para conversación general:
{"type":"conversation","message":"Tu respuesta"}`;

// ─── Gemini call — generateContent (no chat session overhead) ─────────────────
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  // Small throttle before hitting the API — avoids burst rejections on free tier
  await sleep(300);

  const genAI = getGenAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });

  const result = await geminiModel.generateContent(prompt);

  const candidate = result.response.candidates?.[0];
  if (!candidate) throw new Error("Gemini devolvió una respuesta vacía. Intenta de nuevo.");
  if (candidate.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason as string)) {
    throw new Error(`Gemini bloqueó la respuesta (${candidate.finishReason}). Simplifica la instrucción.`);
  }

  return result.response.text().trim();
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
    throw new Error(`HTTP_${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Parse & validate proposals ──────────────────────────────────────────────
function parseResponse(responseText: string) {
  let parsed: {
    type: string;
    message: string;
    proposals?: Array<{ fileId: string; originalName: string; proposedName: string }>;
  };

  try {
    const cleaned = responseText
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { isConversational: true, message: responseText };
  }

  if (parsed.type === "proposals" && Array.isArray(parsed.proposals)) {
    const validated = parsed.proposals
      .map((p) => {
        const origExt = getExtension(p.originalName);
        const propExt = getExtension(p.proposedName);
        let name = p.proposedName;
        if (origExt && propExt !== origExt) {
          name = `${getBaseName(p.proposedName)}.${origExt}`;
        }
        name = sanitizeFileName(name);
        return { fileId: p.fileId, originalName: p.originalName, proposedName: name || p.originalName };
      })
      .filter((p) => p.proposedName);
    return { proposals: validated, message: parsed.message };
  }

  return { isConversational: true, message: parsed.message ?? responseText };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // auth() MUST be called before req.json() in Next.js 15 App Router
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para usar la IA. El Toolbox está disponible sin cuenta." },
      { status: 401 }
    );
  }

  // ── Dedup guard: reject duplicate requests arriving within 2s ────────────
  if (isDuplicate(userId)) {
    console.warn(`[RenombrAitor] Duplicate request blocked for user ${userId.slice(0, 8)}`);
    return NextResponse.json(
      { error: "Petición duplicada ignorada. Por favor espera la respuesta anterior." },
      { status: 429 }
    );
  }

  let body: GenerateRenamesRequest & { providerId?: ProviderId };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la petición." }, { status: 400 });
  }

  const { files, instruction, conversationHistory, providerId } = body;

  if (!files?.length || !instruction?.trim()) {
    return NextResponse.json({ error: "Faltan campos: files, instruction." }, { status: 400 });
  }

  const provider = getProvider(providerId ?? DEFAULT_PROVIDER);
  const apiKey = process.env[provider.envKey];

  if (!apiKey) {
    return NextResponse.json(
      { error: `API key para "${provider.label}" no configurada. Añade "${provider.envKey}" en Vercel → Settings → Environment Variables.` },
      { status: 500 }
    );
  }

  // Only filenames — never file contents
  const fileListText = files.map((f, idx) => `[file-${idx}] ${f.name}`).join("\n");
  const prompt = `Lista de nombres de archivo (${files.length} archivos):\n${fileListText}\n\nInstrucción del usuario: ${instruction}`;

  try {
    let responseText: string;

    if (provider.id === "gemini-flash" || provider.id === "gemini-flash-lite") {
      // generateContent — simpler, faster, no chat session overhead
      responseText = await withRetry(() => callGemini(apiKey, provider.model, prompt));
    } else {
      // OpenAI-compatible providers (DeepSeek, OpenRouter, Grok)
      const msgs: Array<{ role: string; content: string }> = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory
          .slice(-6)
          .filter((m) => m.content?.trim())
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        { role: "user", content: prompt },
      ];
      responseText = await withRetry(() => callOpenAICompat(provider.baseUrl!, apiKey, provider.model, msgs));
    }

    return NextResponse.json(parseResponse(responseText));

  } catch (err) {
    console.error(`[${provider.label}] Final error:`, err);
    const msg = err instanceof Error ? err.message : String(err);

    if (isQuotaError(err) || msg.includes("HTTP_429")) {
      return NextResponse.json(
        { error: `⏳ Cuota de ${provider.label} agotada. Espera 1 minuto o cambia de proveedor.` },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Error en ${provider.label}: ${msg.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
