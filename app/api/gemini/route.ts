import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateRenamesRequest } from "@/types";
import { sanitizeFileName, getExtension, getBaseName } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30; // Vercel free tier allows up to 60s

const SYSTEM_PROMPT = `Eres RenombrAitor, un asistente experto en renombrar archivos de forma inteligente y consistente.

Reglas CRÍTICAS que SIEMPRE debes seguir:
1. SIEMPRE mantén la extensión original del archivo (ej: .pdf, .jpg, .mp3)
2. NUNCA uses caracteres inválidos: < > : " / \\ | ? * y caracteres de control
3. Los nombres propuestos deben ser únicos (sin duplicados)
4. Sé consistente con el formato solicitado en todos los archivos
5. Si el usuario pide snake_case, TODOS los archivos deben estar en snake_case
6. Responde SIEMPRE en español

Cuando el usuario te dé instrucciones de renombrado:
- Analiza TODOS los archivos en la lista
- Genera un nombre nuevo para CADA archivo siguiendo exactamente las instrucciones
- Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto:

{
  "type": "proposals",
  "message": "Descripción breve de lo que hiciste",
  "proposals": [
    {"fileId": "file-0", "originalName": "archivo.jpg", "proposedName": "nuevo_nombre.jpg"},
    ...
  ]
}

Si el usuario hace una pregunta general, pide aclaraciones o hace conversación (NO está dando instrucciones de renombrado concretas):
Responde con:
{
  "type": "conversation",
  "message": "Tu respuesta conversacional aquí"
}

Ejemplos de instrucciones de renombrado (responde con proposals):
- "Renombra en snake_case"
- "Añade el prefijo '2024_'"
- "Formato: fecha_descripción.ext"
- "Elimina los espacios y ponlos en minúsculas"
- "Numera los archivos del 001 al 999"

Ejemplos de conversación (responde con conversation):
- "¿Puedes ayudarme?"
- "¿Qué formatos soportas?"
- "Hola"`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no configurada. Añádela en las variables de entorno de Vercel." },
      { status: 500 }
    );
  }

  let body: GenerateRenamesRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { files, instruction, conversationHistory } = body;

  if (!files || !instruction) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: files, instruction" },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build conversation context
    const fileListText = files
      .map(
        (f, idx) =>
          `[file-${idx}] ${f.name} (${formatSize(f.size)}, .${f.extension || "sin extensión"})`
      )
      .join("\n");

    const contextMessage = `Lista de archivos a renombrar (${files.length} archivos):
${fileListText}

Instrucción del usuario: ${instruction}`;

    // Build message history — Gemini requires history to start with "user"
    // and alternate user/model. Filter out leading model messages and empty ones.
    const rawHistory = conversationHistory
      .slice(-8)
      .filter((m) => m.content?.trim())
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));

    // Drop leading "model" messages — Gemini requires first to be "user"
    while (rawHistory.length > 0 && rawHistory[0].role === "model") {
      rawHistory.shift();
    }

    // Ensure alternating roles (collapse consecutive same-role messages)
    const history: typeof rawHistory = [];
    for (const msg of rawHistory) {
      if (history.length > 0 && history[history.length - 1].role === msg.role) {
        history[history.length - 1] = msg;
      } else {
        history.push(msg);
      }
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(contextMessage);
    const responseText = result.response.text().trim();

    // Parse the JSON response
    let parsed: { type: string; message: string; proposals?: Array<{ fileId: string; originalName: string; proposedName: string }> };
    try {
      // Strip markdown code fences if present
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If we can't parse JSON, treat as conversational
      return NextResponse.json({
        isConversational: true,
        message: responseText,
      });
    }

    if (parsed.type === "proposals" && parsed.proposals) {
      // Validate and sanitize proposals
      const validatedProposals = parsed.proposals
        .map((p) => {
          // Ensure extension is preserved
          const originalExt = getExtension(p.originalName);
          const proposedExt = getExtension(p.proposedName);

          let finalName = p.proposedName;

          // If extension was lost, add it back
          if (originalExt && proposedExt !== originalExt) {
            const base = getBaseName(p.proposedName);
            finalName = `${base}.${originalExt}`;
          }

          // Sanitize the name
          finalName = sanitizeFileName(finalName);

          return {
            fileId: p.fileId,
            originalName: p.originalName,
            proposedName: finalName || p.originalName,
          };
        })
        .filter((p) => p.proposedName); // Remove empty names

      return NextResponse.json({
        proposals: validatedProposals,
        message: parsed.message,
      });
    }

    // Conversational response
    return NextResponse.json({
      isConversational: true,
      message: parsed.message || responseText,
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    const message =
      err instanceof Error ? err.message : "Error desconocido de la API";

    if (message.includes("API_KEY")) {
      return NextResponse.json(
        { error: "API Key de Gemini inválida o sin permisos." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
