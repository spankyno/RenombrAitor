"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bot, Wrench } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useAppStore } from "@/store/app-store";
import { useFileSystem } from "@/hooks/use-file-system";
import { useGemini } from "@/hooks/use-gemini";
import { useUsage } from "@/hooks/use-usage";
import { HeroScreen } from "@/components/features/hero-screen";
import { FileListPanel } from "@/components/features/file-list-panel";
import { ChatPanel } from "@/components/features/chat-panel";
import { ToolboxPanel } from "@/components/features/toolbox-panel";
import { PreviewTable } from "@/components/features/preview-table";
import { DoneScreen } from "@/components/features/done-screen";
import { NavBar } from "@/components/features/nav-bar";
import { Footer } from "@/components/features/footer";
import type { ChatMessage, RenameProposal } from "@/types";
import { cn } from "@/lib/utils";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

type WorkspaceTab = "ai" | "toolbox";

export default function HomePage() {
  const { isSignedIn } = useUser();
  const usage = useUsage();

  const {
    step, setStep,
    sourceFolder, destinationFolder,
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

  // Guests can only use toolbox — enforce that as the default tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(isSignedIn ? "ai" : "toolbox");

  const { selectSourceFolder, applyRenames } = useFileSystem();
  const { sendMessage } = useGemini();

  // ── Select folder ─────────────────────────────────────────────────────────
  const handleSelectFolder = useCallback(async () => {
    // Guest: enforce max files limit before opening picker
    if (!isSignedIn && usage.maxFiles < 999) {
      // We'll check after scanning — warn here
    }
    try {
      await selectSourceFolder();

      // Guest: enforce file count limit
      const currentFiles = useAppStore.getState().files;
      if (!isSignedIn && currentFiles.length > usage.maxFiles) {
        toast.error(`Como invitado puedes procesar máx. ${usage.maxFiles} archivos. Esta carpeta tiene ${currentFiles.length}. Regístrate para uso ilimitado.`);
        reset();
        return;
      }

      // Record session usage for guests
      if (!isSignedIn) {
        const ok = await usage.recordSession();
        if (!ok) {
          toast.error("Límite diario alcanzado. Regístrate para uso ilimitado.");
          reset();
          return;
        }
      }

      addMessage({
        id: generateId(), role: "assistant", timestamp: new Date(),
        content: isSignedIn
          ? "¡Listo! Carpeta escaneada. Usa el **Chat IA** o el **Toolbox** para renombrar tus archivos."
          : "¡Listo! Como invitado tienes acceso al **Toolbox**. Regístrate para usar la IA.",
      } as ChatMessage);

      // Guests go straight to toolbox
      if (!isSignedIn) setActiveTab("toolbox");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al seleccionar la carpeta");
    }
  }, [isSignedIn, usage, selectSourceFolder, addMessage, reset]);

  // ── AI chat (signed-in only) ──────────────────────────────────────────────
  const handleChatSend = useCallback(async (userInput: string) => {
    if (!isSignedIn) {
      toast.error("Inicia sesión para usar la IA.");
      return;
    }
    if (step === "folder-selected") setStep("chatting");
    await sendMessage(userInput);
  }, [isSignedIn, step, setStep, sendMessage]);

  // ── Toolbox proposals ─────────────────────────────────────────────────────
  const handleToolboxProposals = useCallback((newProposals: RenameProposal[]) => {
    const names = newProposals.map((p) => p.proposedName);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    setProposals(newProposals.map((p) => ({ ...p, hasConflict: dupes.includes(p.proposedName) })));
    setStep("preview");
    toast.success(`Propuesta generada para ${newProposals.length} archivos.`);
  }, [setProposals, setStep]);

  // ── Apply renames ─────────────────────────────────────────────────────────
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
        ? toast.success(`¡${result.success} archivos renombrados!`)
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
    setActiveTab(isSignedIn ? "ai" : "toolbox");
    toast.info("Sesión reiniciada.");
  }, [reset, isSignedIn]);

  // ── Tab change (guests can't use AI) ─────────────────────────────────────
  const handleTabChange = (tab: WorkspaceTab) => {
    if (tab === "ai" && !isSignedIn) {
      toast.error("Inicia sesión para usar el Chat IA.");
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {step !== "idle" && (
        <NavBar step={step} folderName={sourceFolder?.name} filesCount={files.length} onReset={handleReset} />
      )}

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* ── IDLE ──────────────────────────────────────────────── */}
          {step === "idle" && (
            <motion.div key="hero"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}>
              <HeroScreen onSelectFolder={handleSelectFolder} isLoading={isLoadingFiles} usage={usage} />
            </motion.div>
          )}

          {/* ── WORKSPACE ─────────────────────────────────────────── */}
          {(step === "folder-selected" || step === "chatting" ||
            step === "preview" || step === "applying") && (
            <motion.div key="workspace"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="p-4 md:p-6">

              {step === "preview" || step === "applying" ? (
                <div className="max-w-5xl mx-auto">
                  <button onClick={() => setStep("chatting")} disabled={isApplying}
                    className="flex items-center gap-1.5 text-xs mb-4 hover:opacity-70 transition-opacity disabled:opacity-30"
                    style={{ color: "hsl(var(--muted-foreground))" }}>
                    ← Volver
                  </button>
                  <PreviewTable
                    proposals={proposals} onUpdateProposal={updateProposal}
                    onApply={handleApplyRenames} isApplying={isApplying}
                    applyProgress={applyProgress} destinationName={destinationFolder?.name}
                  />
                </div>
              ) : (
                <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col gap-3">
                  {/* Tab switcher */}
                  <div className="flex items-center gap-1 self-end">
                    <div className="flex gap-0.5 p-1 rounded-xl border"
                      style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))" }}>
                      {([
                        { id: "ai" as WorkspaceTab, label: "Chat IA", Icon: Bot, color: "hsl(var(--primary))", restricted: !isSignedIn },
                        { id: "toolbox" as WorkspaceTab, label: "Toolbox", Icon: Wrench, color: "hsl(var(--accent))", restricted: false },
                      ] as const).map(({ id, label, Icon, color, restricted }) => (
                        <button key={id} onClick={() => handleTabChange(id)}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all", restricted && "opacity-40")}
                          style={{
                            background: activeTab === id ? "hsl(var(--card))" : "transparent",
                            color: activeTab === id ? color : "hsl(var(--muted-foreground))",
                            boxShadow: activeTab === id ? "0 1px 3px hsl(var(--shadow)/0.15)" : "none",
                          }}>
                          <Icon size={12} />
                          {label}
                          {restricted && <span className="text-[9px] ml-0.5">🔒</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Panels */}
                  <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
                    <FileListPanel files={files} folderName={sourceFolder?.name || ""} />
                    <AnimatePresence mode="wait">
                      {activeTab === "ai" ? (
                        <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="min-h-0">
                          <ChatPanel messages={messages} onSend={handleChatSend} isGenerating={isGenerating}
                            filesCount={files.length} providerId={providerId} onProviderChange={setProviderId} />
                        </motion.div>
                      ) : (
                        <motion.div key="toolbox" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="min-h-0">
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
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <DoneScreen result={applyResult} destinationName={destinationFolder?.name || "_Renamed"} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
