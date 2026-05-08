import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRenamesRequest } from "@/types";
import { sanitizeFileName, getExtension, getBaseName } from "@/types";
import { getProvider, DEFAULT_PROVIDER, type ProviderId } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── System prompt ────────────────────────────────────────────────────────────
// Note: we only receive FILENAMES, never file contents.
// This keeps token consumption minimal across all providers.
const SYSTEM_PROMPT = `Eres RenombrAitor, un asistente experto en renombrar archivos de forma inteligente y consistente.

IMPORTANTE: Solo recibes NOMBRES de archivos (no su contenido). Trabaja únicamente con los nombres.

Reglas CRÍTICAS que SIEMPRE debes seguir:
1. SIEMPRE mantén la extensión original del archivo (ej: .pdf, .jpg, .mp3)
2. NUNCA uses caracteres inválidos: < > : " / \\ | ? * y caracteres de control
3. Los nombres propuestos deben ser únicos (sin duplicados)
4. Sé consistente con el formato solicitado en todos los archivos
5. Si el usuario pide snake_case, TODOS los archivos deben estar en snake_case
6. Responde SIEMPRE en español

Cuando el usuario te dé instrucciones de renombrado:
- Analiza TODOS los nombres de archivo en la lista
- Genera un nombre nuevo para CADA archivo siguiendo exactamente las instrucciones
- Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto (sin texto antes ni después):

{"type":"proposals","message":"Descripción breve de lo que hiciste","proposals":[{"fileId":"file-0","originalName":"archivo.jpg","proposedName":"nuevo_nombre.jpg"}]}

Si el usuario hace una pregunta general, pide aclaraciones o hace conversación:
{"type":"conversation","message":"Tu respuesta aquí"}`;

// ─── OpenAI-compatible call (DeepSeek, OpenRouter, Grok) ─────────────────────
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
      // OpenRouter requires these headers
      "HTTP-Referer": "https://renombraitor.vercel.app",
      "X-Title": "RenombrAitor",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${err.slice(0, 200)}`);
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
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
  });
  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(contextMessage);
  return result.response.text().trim();
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

  if (!files || !instruction) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: files, instruction" },
      { status: 400 }
    );
  }

  // Resolve provider
  const provider = getProvider(providerId ?? DEFAULT_PROVIDER);
  const apiKey = process.env[provider.envKey];

  if (!apiKey) {
    return NextResponse.json(
      {
        error: `API key para ${provider.label} no configurada. Añade la variable de entorno "${provider.envKey}" en Vercel.`,
      },
      { status: 500 }
    );
  }

  // Build the file list — ONLY names (+ size for context), never file contents.
  // This is intentional: keeps token usage minimal and protects user privacy.
  const fileListText = files
    .map((f, idx) => `[file-${idx}] ${f.name}`)
    .join("\n");

  const contextMessage = `Lista de nombres de archivo (${files.length} archivos) — solo se procesan los nombres, no el contenido:
${fileListText}

Instrucción: ${instruction}`;

  try {
    let responseText: string;

    if (provider.id === "gemini-flash" || provider.id === "gemini-flash-lite") {
      // ── Gemini SDK path ──────────────────────────────────────────────────
      const rawHistory = conversationHistory
        .slice(-8)
        .filter((m) => m.content?.trim())
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          parts: [{ text: m.content }],
        }));

      while (rawHistory.length > 0 && rawHistory[0].role === "model") {
        rawHistory.shift();
      }

      const history: typeof rawHistory = [];
      for (const msg of rawHistory) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg;
        } else {
          history.push(msg);
        }
      }

      responseText = await callGemini(apiKey, provider.model, contextMessage, history);
    } else {
      // ── OpenAI-compatible path (DeepSeek / OpenRouter / Grok) ───────────
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: SYSTEM_PROMPT },
        // Include last 6 turns of history as context
        ...conversationHistory
          .slice(-6)
          .filter((m) => m.content?.trim())
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        { role: "user", content: contextMessage },
      ];

      responseText = await callOpenAICompat(
        provider.baseUrl!,
        apiKey,
        provider.model,
        messages
      );
    }

    // ── Parse response ─────────────────────────────────────────────────────
    let parsed: {
      type: string;
      message: string;
      proposals?: Array<{
        fileId: string;
        originalName: string;
        proposedName: string;
      }>;
    };

    try {
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ isConversational: true, message: responseText });
    }

    if (parsed.type === "proposals" && parsed.proposals) {
      const validatedProposals = parsed.proposals
        .map((p) => {
          const originalExt = getExtension(p.originalName);
          const proposedExt = getExtension(p.proposedName);
          let finalName = p.proposedName;
          if (originalExt && proposedExt !== originalExt) {
            finalName = `${getBaseName(p.proposedName)}.${originalExt}`;
          }
          finalName = sanitizeFileName(finalName);
          return {
            fileId: p.fileId,
            originalName: p.originalName,
            proposedName: finalName || p.originalName,
          };
        })
        .filter((p) => p.proposedName);

      return NextResponse.json({ proposals: validatedProposals, message: parsed.message });
    }

    return NextResponse.json({ isConversational: true, message: parsed.message ?? responseText });
  } catch (err) {
    console.error(`[${provider.label}] error:`, err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `[${provider.label}] ${message}` }, { status: 500 });
  }
}
