import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRenamesRequest } from "@/types";
import { sanitizeFileName, getExtension, getBaseName } from "@/types";
import { getProvider, DEFAULT_PROVIDER, type ProviderId } from "@/lib/ai-providers";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── Per-user rate limiter (sliding window) ───────────────────────────────────
// Gemini 2.0 Flash-Lite free tier: 30 RPM / 1500 RPD.
// We enforce 20 RPM per user (conservative) to leave headroom for retries.
const RATE_WINDOW_MS = 60_000;      // 1-minute window
const RATE_MAX_REQUESTS = 20;       // max requests per window per user

interface RateEntry { timestamps: number[] }
const rateMap = new Map<string, RateEntry>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateMap.get(userId) ?? { timestamps: [] };
  // Drop timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (entry.timestamps.length >= RATE_MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = RATE_WINDOW_MS - (now - oldest) + 500; // +500ms buffer
    rateMap.set(userId, entry);
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  rateMap.set(userId, entry);
  return { allowed: true, retryAfterMs: 0 };
}

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

// ─── sleep ────────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Retry with exponential backoff ──────────────────────────────────────────
// BUG FIX: Previously isRetryable matched "limit" which appears in normal error
// messages (e.g. "File limit exceeded"), causing false 429s.
// Now we only match specific quota/rate-limit strings from Gemini/OpenAI APIs.
const QUOTA_KEYWORDS = [
  "resource_exhausted",
  "resource exhausted",
  "quota exceeded",
  "rateLimitExceeded",
  "rate_limit_exceeded",
  "too many requests",
  "requests per minute",
  "requests per day",
];

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return QUOTA_KEYWORDS.some((kw) => msg.includes(kw.toLowerCase()));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,       // reduced: 3 attempts max (was 4)
  baseDelayMs = 3000     // increased: start at 3s (was 2s)
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts - 1;
      if (!isQuotaError(err) || isLast) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt); // 3s → 6s → 12s
      const jitter = Math.random() * 1000;
      console.warn(`[RenombrAitor] Quota hit on attempt ${attempt + 1}, waiting ${Math.round((delay + jitter) / 1000)}s…`);
      await sleep(delay + jitter);
    }
  }
  // unreachable but satisfies TS
  throw new Error("Max retries exceeded");
}

// ─── Gemini call via SDK ──────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  model: string,
  contextMessage: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(contextMessage);

  // BUG FIX: check for blocked/empty responses before accessing text()
  const response = result.response;
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini devolvió una respuesta vacía. Intenta de nuevo.");
  }
  if (candidate.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason as string)) {
    throw new Error(`Gemini bloqueó la respuesta (${candidate.finishReason}). Simplifica la instrucción.`);
  }

  return response.text().trim();
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
    // BUG FIX: preserve the HTTP status in the error message so isQuotaError
    // can detect real 429s from the upstream API, not confuse them with our own.
    throw new Error(`HTTP_${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Build sanitised Gemini history ──────────────────────────────────────────
function buildGeminiHistory(
  conversationHistory: Array<{ role: string; content: string }>
) {
  const raw = conversationHistory
    .slice(-8)
    .filter((m) => m.content?.trim())
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    }));

  // Must start with "user"
  while (raw.length > 0 && raw[0].role === "model") raw.shift();

  // Collapse consecutive same-role messages (keep last)
  const history: typeof raw = [];
  for (const msg of raw) {
    if (history.length > 0 && history[history.length - 1].role === msg.role) {
      history[history.length - 1] = msg;
    } else {
      history.push(msg);
    }
  }
  return history;
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
    // Model returned plain text — treat as conversational
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
  // BUG FIX: auth() must be called BEFORE req.json() in Next.js 15 App Router.
  // Calling it after can cause the request body stream to be consumed twice,
  // which throws internally and gets misclassified as a quota/rate error.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para usar la IA. El Toolbox está disponible sin cuenta." },
      { status: 401 }
    );
  }

  // ── Per-user rate limit check ─────────────────────────────────────────────
  const { allowed, retryAfterMs } = checkRateLimit(userId);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: `⏳ Demasiadas peticiones. Espera ${retryAfterSec}s antes de reintentar.`, retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
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
      { error: `API key para "${provider.label}" no configurada. Añade la variable "${provider.envKey}" en Vercel → Settings → Environment Variables.` },
      { status: 500 }
    );
  }

  // Only filenames are sent — never file contents. Keeps token usage minimal.
  const fileListText = files.map((f, idx) => `[file-${idx}] ${f.name}`).join("\n");
  const contextMessage =
    `Lista de nombres de archivo (${files.length} archivos):\n${fileListText}\n\nInstrucción del usuario: ${instruction}`;

  try {
    let responseText: string;

    if (provider.id === "gemini-flash" || provider.id === "gemini-flash-lite") {
      const history = buildGeminiHistory(conversationHistory);
      responseText = await withRetry(() =>
        callGemini(apiKey, provider.model, contextMessage, history)
      );
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
        { role: "user", content: contextMessage },
      ];

      responseText = await withRetry(() =>
        callOpenAICompat(provider.baseUrl!, apiKey, provider.model, msgs)
      );
    }

    return NextResponse.json(parseResponse(responseText));

  } catch (err) {
    console.error(`[${provider.label}] Final error:`, err);
    const msg = err instanceof Error ? err.message : String(err);

    // Only surface quota errors as 429; everything else is 500
    if (isQuotaError(err) || msg.includes("HTTP_429")) {
      return NextResponse.json(
        { error: `⏳ La API de ${provider.label} ha devuelto un error de cuota (429). Espera 1 minuto e inténtalo de nuevo, o cambia de proveedor en el selector.` },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Error en ${provider.label}: ${msg.slice(0, 200)}` },
      { status: 500 }
    );
  }
}
