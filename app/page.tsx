"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bot, Wrench } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useFileSystem } from "@/hooks/use-file-system";
import { useGemini } from "@/hooks/use-gemini";
import { HeroScreen } from "@/components/features/hero-screen";
import { FileListPanel } from "@/components/features/file-list-panel";
import { ChatPanel } from "@/components/features/chat-panel";
import { ToolboxPanel } from "@/components/features/toolbox-panel";
import { PreviewTable } from "@/components/features/preview-table";
import { DoneScreen } from "@/components/features/done-screen";
import { NavBar } from "@/components/features/nav-bar";
import type { ChatMessage, RenameProposal } from "@/types";
import { cn } from "@/lib/utils";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

type WorkspaceTab = "ai" | "toolbox";

export default function HomePage() {
  const {
    step, setStep,
    sourceFolder,
    destinationFolder,
    files,
    messages, addMessage,
    providerId, setProviderId,
    proposals, updateProposal, setProposals,
    applyResult, setApplyResult,
    isLoadingFiles,
    isGenerating,
    isApplying, setIsApplying,
    applyProgress, setApplyProgress,
    reset,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("ai");
  const { selectSourceFolder, applyRenames } = useFileSystem();
  const { sendMessage } = useGemini();

  // ── Select folder — destination is created automatically inside source ────
  const handleSelectFolder = useCallback(async () => {
    try {
      await selectSourceFolder();
      addMessage({
        id: generateId(), role: "assistant", timestamp: new Date(),
        content: "¡Listo! Carpeta escaneada y carpeta destino **_Renamed** creada dentro. Describe cómo quieres renombrar los archivos, o usa el **Toolbox** para transformaciones sin IA.",
      } as ChatMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al seleccionar la carpeta");
    }
  }, [selectSourceFolder, addMessage]);

  // ── AI chat ───────────────────────────────────────────────────────────────
  const handleChatSend = useCallback(async (userInput: string) => {
    if (step === "folder-selected") setStep("chatting");
    await sendMessage(userInput);
  }, [step, setStep, sendMessage]);

  // ── Toolbox proposals ─────────────────────────────────────────────────────
  const handleToolboxProposals = useCallback((newProposals: RenameProposal[]) => {
    const names = newProposals.map((p) => p.proposedName);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    setProposals(newProposals.map((p) => ({ ...p, hasConflict: dupes.includes(p.proposedName) })));
    setStep("preview");
    toast.success(`Propuesta generada para ${newProposals.length} archivos.`);
  }, [setProposals, setStep]);

  // ── Apply renames — destination already exists inside source ──────────────
  const handleApplyRenames = useCallback(async () => {
    if (!destinationFolder || proposals.length === 0) return;
    setIsApplying(true);
    setApplyProgress(0);
    try {
      const result = await applyRenames(files, proposals, destinationFolder.handle, (done) => {
        useAppStore.getState().setApplyProgress(done);
      });
      setApplyResult(result);
      setStep("done");
      result.failed === 0
        ? toast.success(`¡${result.success} archivos renombrados con éxito!`)
        : toast.warning(`${result.success} copiados, ${result.failed} fallaron.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aplicar renombrado");
    } finally {
      setIsApplying(false);
    }
  }, [destinationFolder, proposals, files, applyRenames, setIsApplying, setApplyProgress, setApplyResult, setStep]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    reset();
    setActiveTab("ai");
    toast.info("Sesión reiniciada.");
  }, [reset]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {step !== "idle" && (
        <NavBar step={step} folderName={sourceFolder?.name} filesCount={files.length} onReset={handleReset} />
      )}

      <AnimatePresence mode="wait">
        {/* ── IDLE ──────────────────────────────────────────────── */}
        {step === "idle" && (
          <motion.div key="hero"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }} className="flex-1">
            <HeroScreen onSelectFolder={handleSelectFolder} isLoading={isLoadingFiles} />
          </motion.div>
        )}

        {/* ── WORKSPACE ─────────────────────────────────────────── */}
        {(step === "folder-selected" || step === "chatting" ||
          step === "preview" || step === "applying") && (
          <motion.div key="workspace"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            className="flex-1 p-4 md:p-6">

            {step === "preview" || step === "applying" ? (
              /* ── PREVIEW ─────────────────────────────────────── */
              <div className="max-w-5xl mx-auto">
                <button onClick={() => setStep("chatting")} disabled={isApplying}
                  className="flex items-center gap-1.5 text-xs mb-4 transition-colors hover:opacity-70 disabled:opacity-30"
                  style={{ color: "hsl(var(--muted-foreground))" }}>
                  ← Volver
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
              /* ── CHAT / TOOLBOX ──────────────────────────────── */
              <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col gap-3">

                {/* Tab switcher */}
                <div className="flex items-center gap-1 self-end">
                  <div className="flex gap-0.5 p-1 rounded-xl border"
                    style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))" }}>
                    {([
                      { id: "ai" as WorkspaceTab,      label: "Chat IA",  Icon: Bot,    color: "hsl(var(--primary))" },
                      { id: "toolbox" as WorkspaceTab,  label: "Toolbox",  Icon: Wrench, color: "hsl(var(--accent))" },
                    ] as const).map(({ id, label, Icon, color }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all")}
                        style={{
                          background: activeTab === id ? "hsl(var(--card))" : "transparent",
                          color: activeTab === id ? color : "hsl(var(--muted-foreground))",
                          boxShadow: activeTab === id ? "0 1px 3px hsl(var(--shadow)/0.15)" : "none",
                        }}>
                        <Icon size={12} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panels */}
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
                  <FileListPanel files={files} folderName={sourceFolder?.name || ""} />

                  <AnimatePresence mode="wait">
                    {activeTab === "ai" ? (
                      <motion.div key="ai"
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                        className="min-h-0">
                        <ChatPanel
                          messages={messages} onSend={handleChatSend}
                          isGenerating={isGenerating} filesCount={files.length}
                          providerId={providerId} onProviderChange={setProviderId}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="toolbox"
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                        className="min-h-0">
                        <ToolboxPanel files={files} onApplyProposals={handleToolboxProposals} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── DONE ──────────────────────────────────────────────── */}
        {step === "done" && applyResult && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="flex-1">
            <DoneScreen
              result={applyResult}
              destinationName={destinationFolder?.name || "_Renamed"}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
