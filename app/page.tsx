"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useFileSystem } from "@/hooks/use-file-system";
import { useGemini } from "@/hooks/use-gemini";
import { HeroScreen } from "@/components/features/hero-screen";
import { FileListPanel } from "@/components/features/file-list-panel";
import { ChatPanel } from "@/components/features/chat-panel";
import { PreviewTable } from "@/components/features/preview-table";
import { DoneScreen } from "@/components/features/done-screen";
import { NavBar } from "@/components/features/nav-bar";
import type { ChatMessage } from "@/types";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function HomePage() {
  const {
    step,
    setStep,
    sourceFolder,
    destinationFolder,
    files,
    messages,
    addMessage,
    providerId,
    setProviderId,
    proposals,
    updateProposal,
    setProposals,
    applyResult,
    setApplyResult,
    isLoadingFiles,
    isGenerating,
    isApplying,
    setIsApplying,
    applyProgress,
    setApplyProgress,
    reset,
  } = useAppStore();

  const { selectSourceFolder, createDestinationFolder, applyRenames } =
    useFileSystem();
  const { sendMessage } = useGemini();

  // ── Select source folder ──────────────────────────────────────────────────
  const handleSelectFolder = useCallback(async () => {
    try {
      await selectSourceFolder();

      // Add welcome message to chat
      const welcomeMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "¡Listo! He escaneado tu carpeta. Ahora dime cómo quieres renombrar los archivos. Puedes usar el chat o hacer clic en una sugerencia rápida.",
        timestamp: new Date(),
      };
      addMessage(welcomeMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al seleccionar la carpeta";
      toast.error(msg);
    }
  }, [selectSourceFolder, addMessage]);

  // ── Handle chat messages ─────────────────────────────────────────────────
  const handleChatSend = useCallback(
    async (userInput: string) => {
      if (step === "folder-selected") {
        setStep("chatting");
      }
      await sendMessage(userInput);
    },
    [step, setStep, sendMessage]
  );

  // ── Apply renames ─────────────────────────────────────────────────────────
  const handleApplyRenames = useCallback(async () => {
    if (!sourceFolder || proposals.length === 0) return;

    setIsApplying(true);
    setApplyProgress(0);

    try {
      // Create destination folder if not already done
      let destHandle = destinationFolder?.handle;

      if (!destHandle) {
        toast.info(
          "Selecciona la carpeta que CONTIENE tu carpeta origen para crear la carpeta destino al mismo nivel."
        );

        const result = await createDestinationFolder(
          sourceFolder.handle,
          "Destino-RenombrAitor"
        );

        if (!result) {
          toast.error("No se seleccionó carpeta destino.");
          setIsApplying(false);
          return;
        }

        destHandle = result.handle;
        toast.success(`Carpeta "${result.name}" creada correctamente.`);
      }

      // Apply
      const result = await applyRenames(
        files,
        proposals,
        destHandle,
        (done, total) => {
          setApplyProgress(done);
          // We'll use the store's progress
          useAppStore.getState().setApplyProgress(done);
        }
      );

      setApplyResult(result);
      setStep("done");

      if (result.failed === 0) {
        toast.success(`¡${result.success} archivos renombrados con éxito!`);
      } else {
        toast.warning(
          `${result.success} archivos copiados, ${result.failed} fallaron.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al aplicar renombrado";
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  }, [
    sourceFolder,
    destinationFolder,
    proposals,
    files,
    createDestinationFolder,
    applyRenames,
    setIsApplying,
    setApplyProgress,
    setApplyResult,
    setStep,
  ]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    reset();
    toast.info("Sesión reiniciada.");
  }, [reset]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(222 20% 8%)" }}>
      {/* Navigation */}
      {step !== "idle" && (
        <NavBar
          step={step}
          folderName={sourceFolder?.name}
          filesCount={files.length}
          onReset={handleReset}
        />
      )}

      <AnimatePresence mode="wait">
        {/* ── IDLE: Hero screen ─────────────────────────────────── */}
        {step === "idle" && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <HeroScreen
              onSelectFolder={handleSelectFolder}
              isLoading={isLoadingFiles}
            />
          </motion.div>
        )}

        {/* ── FOLDER SELECTED / CHATTING / PREVIEW ─────────────── */}
        {(step === "folder-selected" ||
          step === "chatting" ||
          step === "preview" ||
          step === "applying") && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex-1 p-4 md:p-6"
          >
            {step === "preview" || step === "applying" ? (
              /* ── PREVIEW MODE ────────────────────────────────── */
              <div className="max-w-5xl mx-auto">
                {/* Back to chat button */}
                <button
                  onClick={() => setStep("chatting")}
                  disabled={isApplying}
                  className="flex items-center gap-1.5 text-xs mb-4 transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ color: "hsl(215 15% 55%)" }}
                >
                  ← Volver al chat
                </button>

                <PreviewTable
                  proposals={proposals}
                  onUpdateProposal={updateProposal}
                  onApply={handleApplyRenames}
                  isApplying={isApplying}
                  applyProgress={applyProgress}
                  destinationName={destinationFolder?.name}
                />
              </div>
            ) : (
              /* ── CHAT + FILE LIST MODE ──────────────────────── */
              <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
                {/* File list */}
                <FileListPanel
                  files={files}
                  folderName={sourceFolder?.name || ""}
                />

                {/* Chat */}
                <ChatPanel
                  messages={messages}
                  onSend={handleChatSend}
                  isGenerating={isGenerating}
                  filesCount={files.length}
                  providerId={providerId}
                  onProviderChange={setProviderId}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* ── DONE ─────────────────────────────────────────────── */}
        {step === "done" && applyResult && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <DoneScreen
              result={applyResult}
              destinationName={destinationFolder?.name || "Destino-RenombrAitor"}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
