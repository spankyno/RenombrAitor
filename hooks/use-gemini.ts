"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import type { ChatMessage, RenameProposal } from "@/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useGemini() {
  // Single inflight guard — the server also has a dedup window, but this
  // prevents the UI from sending a second request before the first resolves.
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

    // Snapshot history BEFORE adding new messages — prevents stale placeholder
    const conversationHistory = messages
      .filter((m) => !m.isLoading && m.content?.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    addMessage({
      id: generateId(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    } as ChatMessage);

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

      // Single fetch — no client-side retry. The server handles quota retries.
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: fileList,
          instruction: userInput,
          conversationHistory,
          providerId,
        }),
      });

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
