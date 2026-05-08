/**
 * AI Provider definitions for RenombrAitor.
 *
 * IMPORTANT: This app only sends FILENAMES (never file contents) to the AI.
 * This keeps token usage minimal and protects privacy.
 *
 * Provider priority (cheapest/freest first):
 *   1. DeepSeek  — default, very cheap, great reasoning
 *   2. Gemini Flash-Lite — Google free tier, lightest model
 *   3. Gemini Flash    — Google free tier, balanced
 *   4. OpenRouter      — meta-router, pay-per-use or free models
 *   5. Grok 3 Mini     — xAI free tier
 */

export type ProviderId =
  | "deepseek"
  | "gemini-flash-lite"
  | "gemini-flash"
  | "openrouter"
  | "grok3mini";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  model: string;
  envKey: string;         // env var name for the API key
  description: string;
  baseUrl?: string;       // only needed for OpenAI-compat providers
  isDefault?: boolean;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    model: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    description: "DeepSeek Chat — muy económico, excelente para tareas de texto",
    isDefault: true,
  },
  {
    id: "gemini-flash-lite",
    label: "Gemini Flash-Lite",
    model: "gemini-2.0-flash-lite",
    envKey: "GEMINI_API_KEY",
    description: "Google Gemini 2.0 Flash-Lite — el más ligero, ideal para no agotar cuota",
  },
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    model: "gemini-2.0-flash",
    envKey: "GEMINI_API_KEY",
    description: "Google Gemini 2.0 Flash — rápido y equilibrado",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",   // free tier model
    envKey: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    description: "OpenRouter — acceso a múltiples modelos, usa Llama 3.1 8B (gratuito)",
  },
  {
    id: "grok3mini",
    label: "Grok 3 Mini",
    model: "grok-3-mini",
    envKey: "GROK_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    description: "xAI Grok 3 Mini — ligero, disponible en plan gratuito de xAI",
  },
];

export function getProvider(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS.find((p) => p.isDefault)!;
}

export const DEFAULT_PROVIDER: ProviderId = "deepseek";
