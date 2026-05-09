"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import type { ChatMessage, RenameProposal } from "@/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useGemini() {
  const store = useAppStore();

  // BUG FIX: use a ref to track in-flight requests.
  // The previous implementation had `messages` in the useCallback dep array.
  // Adding the loading message to the store caused `messages` to change, which
  // invalidated and re-created the callback mid-execution in StrictMode / React 19,
  // resulting in the fetch being called twice and a spurious 429 from our own
  // rate-limit error handler misclassifying the duplicate request.
  const isInflightRef = useRef(false);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    // Prevent double-fire
    if (isInflightRef.current) return;
    isInflightRef.current = true;

    // Read current state directly from store (avoids stale closure)
    const { files, messages, providerId, addMessage, updateLastMessage, setProposals, setStep, setIsGenerating } =
      useAppStore.getState();

    setIsGenerating(true);

    // Snapshot the conversation history BEFORE adding new messages,
    // so the history sent to the API never includes the loading placeholder.
    const conversationHistory = messages
      .filter((m) => !m.isLoading && m.content?.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    // Add user message to UI
    addMessage({
      id: generateId(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    } as ChatMessage);

    // Add loading placeholder to UI
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

        // Detect conflicts
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
  // No store state in deps — we read from getState() to avoid stale closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sendMessage };
}
