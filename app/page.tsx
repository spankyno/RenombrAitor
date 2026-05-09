"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useAppStore } from "@/store/app-store";
import { useFileSystem } from "@/hooks/use-file-system";
import { useUsage } from "@/hooks/use-usage";
import { HeroScreen } from "@/components/features/hero-screen";
import { FileListPanel } from "@/components/features/file-list-panel";
import { ToolboxPanel } from "@/components/features/toolbox-panel";
import { PreviewTable } from "@/components/features/preview-table";
import { DoneScreen } from "@/components/features/done-screen";
import { NavBar } from "@/components/features/nav-bar";
import { Footer } from "@/components/features/footer";
import type { RenameProposal } from "@/types";

export default function HomePage() {
  const { isSignedIn } = useUser();
  const usage = useUsage();

  const {
    step, setStep,
    sourceFolder, destinationFolder,
    files,
    proposals, updateProposal, setProposals,
    applyResult, setApplyResult,
    isLoadingFiles,
    isApplying, setIsApplying,
    applyProgress, setApplyProgress,
    reset,
  } = useAppStore();

  const { selectSourceFolder, applyRenames } = useFileSystem();

  // ── Select folder ─────────────────────────────────────────────────────────
  const handleSelectFolder = useCallback(async () => {
    try {
      await selectSourceFolder();

      // Enforce file count limit for guests
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

      toast.success("Carpeta escaneada correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al seleccionar la carpeta");
    }
  }, [isSignedIn, usage, selectSourceFolder, reset]);

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
    toast.info("Sesión reiniciada.");
  }, [reset]);

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
          {(step === "folder-selected" || step === "preview" || step === "applying") && (
            <motion.div key="workspace"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="p-4 md:p-6">

              {step === "preview" || step === "applying" ? (
                <div className="max-w-5xl mx-auto">
                  <button onClick={() => setStep("folder-selected")} disabled={isApplying}
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
                  <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
                    <FileListPanel files={files} folderName={sourceFolder?.name || ""} />
                    <ToolboxPanel files={files} onApplyProposals={handleToolboxProposals} />
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
