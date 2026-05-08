"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { ChatMessage, RenameProposal } from "@/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useGemini() {
  const {
    files,
    messages,
    providerId,
    addMessage,
    updateLastMessage,
    setProposals,
    setStep,
    setIsGenerating,
  } = useAppStore();

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      setIsGenerating(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      // Add loading assistant message
      const loadingMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };
      addMessage(loadingMessage);

      try {
        const fileList = files.map((f) => ({
          name: f.name,
          size: f.size,
          extension: f.extension,
        }));

        // Exclude loading messages and the initial welcome message (role: assistant
        // with no prior user message) — Gemini history must start with "user".
        const conversationHistory = messages
          .filter((m) => !m.isLoading && m.content?.trim())
          .map((m) => ({ role: m.role, content: m.content }));

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
          const err = await response.json();
          throw new Error(err.error || "Error al contactar con Gemini");
        }

        const data = await response.json();

        if (data.proposals && data.proposals.length > 0) {
          // We got rename proposals
          const proposals: RenameProposal[] = data.proposals.map(
            (p: { fileId: string; originalName: string; proposedName: string }) => ({
              fileId: p.fileId,
              originalName: p.originalName,
              proposedName: p.proposedName,
              isEdited: false,
              hasConflict: false,
            })
          );

          // Check for conflicts
          const names = proposals.map((p) => p.proposedName);
          const duplicates = names.filter(
            (name, idx) => names.indexOf(name) !== idx
          );
          const checkedProposals = proposals.map((p) => ({
            ...p,
            hasConflict: duplicates.includes(p.proposedName),
          }));

          setProposals(checkedProposals);

          const assistantMsg =
            data.message ||
            `✅ He generado una propuesta de renombrado para **${proposals.length} archivos**. Revisa la vista previa y edita cualquier nombre antes de aplicar.`;

          updateLastMessage(assistantMsg, false);
          setStep("preview");
        } else {
          // Conversational response
          updateLastMessage(
            data.message || "Entendido. ¿Puedes darme más detalles?",
            false
          );
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? `❌ Error: ${err.message}`
            : "❌ Error desconocido al procesar tu solicitud.";
        updateLastMessage(errorMsg, false);
      } finally {
        setIsGenerating(false);
      }
    },
    [files, messages, providerId, addMessage, updateLastMessage, setProposals, setStep, setIsGenerating]
  );

  return { sendMessage };
}
