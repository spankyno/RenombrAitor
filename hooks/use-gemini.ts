"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import type { ChatMessage, RenameProposal } from "@/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Exponential backoff with Retry-After support ─────────────────────────────
async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  onRetry?: (waitMs: number, attempt: number) => void,
  maxAttempts = 4
): Promise<Response> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, init);

    if (res.status !== 429) return res;

    // Last attempt — return the 429 so caller can handle it
    if (attempt === maxAttempts - 1) return res;

    // Read Retry-After from server (in seconds) or fall back to exponential
    const retryAfterSec = Number(res.headers.get("Retry-After") ?? 0);
    const baseDelay = retryAfterSec > 0
      ? retryAfterSec * 1000
      : Math.min(2000 * Math.pow(2, attempt), 30_000); // 2s → 4s → 8s → 30s cap
    const jitter = Math.random() * 500;
    const waitMs = Math.round(baseDelay + jitter);

    console.warn(`[RenombrAitor] 429 on attempt ${attempt + 1}/${maxAttempts} — waiting ${(waitMs / 1000).toFixed(1)}s`);
    onRetry?.(waitMs, attempt + 1);

    await new Promise((r) => setTimeout(r, waitMs));
  }
  // unreachable
  throw new Error("Max retries exceeded");
}

export function useGemini() {
  const store = useAppStore();

  // Prevent double-fire (StrictMode / React 19 double-mount guard)
  const isInflightRef = useRef(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;
    if (isInflightRef.current) return;
    isInflightRef.current = true;

    const {
      files,
      messages,
      providerId,
      addMessage,
      updateLastMessage,
      setProposals,
      setStep,
      setIsGenerating,
    } = useAppStore.getState();

    setIsGenerating(true);

    // Snapshot history BEFORE adding new messages (avoids stale loading placeholder)
    const conversationHistory = messages
      .filter((m) => !m.isLoading && m.content?.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    addMessage({
      id: generateId(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    } as ChatMessage);

    // Loading placeholder
    addMessage({
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    } as ChatMessage);

    try {
      const fileList = files.map((f) => ({
        name: f.name,
        size: f.size,
        extension: f.extension,
      }));

      // Callback shown in the loading bubble while waiting to retry
      const onRetry = (waitMs: number, attempt: number) => {
        const secs = Math.ceil(waitMs / 1000);
        updateLastMessage(
          `⏳ Límite de peticiones alcanzado (intento ${attempt}). Reintentando en ${secs}s…`,
          true // keep isLoading=true so spinner stays
        );
      };

      const response = await fetchWithBackoff(
        "/api/gemini",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: fileList,
            instruction: userInput,
            conversationHistory,
            providerId,
          }),
        },
        onRetry
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.proposals?.length > 0) {
        const proposals: RenameProposal[] = data.proposals.map(
          (p: { fileId: string; originalName: string; proposedName: string }) => ({
            fileId: p.fileId,
            originalName: p.originalName,
            proposedName: p.proposedName,
            isEdited: false,
            hasConflict: false,
          })
        );

        // Detect name conflicts
        const names = proposals.map((p) => p.proposedName);
        const dupes = new Set(names.filter((n, i) => names.indexOf(n) !== i));
        const checked = proposals.map((p) => ({ ...p, hasConflict: dupes.has(p.proposedName) }));

        setProposals(checked);
        updateLastMessage(
          data.message || `✅ Propuesta generada para **${proposals.length} archivos**. Revisa y edita antes de aplicar.`,
          false
        );
        setStep("preview");
      } else {
        updateLastMessage(data.message || "Entendido. ¿Puedes darme más detalles?", false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      updateLastMessage(`❌ ${msg}`, false);
    } finally {
      setIsGenerating(false);
      isInflightRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sendMessage };
}
