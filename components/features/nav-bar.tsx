"use client";

import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/features/theme-toggle";
import { FolderOpen, Eye, CheckCircle, Wrench, RotateCcw } from "lucide-react";
import type { AppStep } from "@/types";
import { cn } from "@/lib/utils";

interface NavBarProps {
  step: AppStep;
  folderName?: string;
  filesCount?: number;
  onReset: () => void;
}

const STEPS: { id: AppStep; label: string; icon: React.ElementType }[] = [
  { id: "folder-selected", label: "Archivos", icon: FolderOpen },
  { id: "preview", label: "Vista previa", icon: Eye },
  { id: "done", label: "Listo", icon: CheckCircle },
];

const STEP_ORDER: AppStep[] = ["idle", "folder-selected", "preview", "applying", "done"];

export function NavBar({ step, folderName, filesCount, onReset }: NavBarProps) {
  const currentIdx = STEP_ORDER.indexOf(step);

  const isStepActive = (s: AppStep) => {
    return STEP_ORDER.indexOf(s) <= currentIdx;
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between"
      style={{
        background: "hsl(var(--background) / 0.9)",
        borderColor: "hsl(var(--border))",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--primary) / 0.15)" }}
        >
          <Wrench size={14} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <span className="font-bold text-sm">
          <span className="gradient-text">Renombr</span>
          <span>Aitor</span>
        </span>
        {folderName && (
          <>
            <span style={{ color: "hsl(220 15% 30%)" }}>/</span>
            <span className="text-sm font-mono truncate max-w-[160px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {folderName}
            </span>
            {filesCount !== undefined && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
              >
                {filesCount} archivos
              </span>
            )}
          </>
        )}
      </div>

      {/* Step indicators */}
      {step !== "idle" && (
        <div className="hidden sm:flex items-center gap-1">
          {STEPS.map((s, i) => {
            const active = isStepActive(s.id);
            const current = step === s.id || (step === "applying" && s.id === "preview");
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  )}
                  style={{
                    background: current
                      ? "hsl(var(--primary) / 0.12)"
                      : active
                      ? "transparent"
                      : "transparent",
                    color: current
                      ? "hsl(var(--primary))"
                      : active
                      ? "hsl(var(--muted-foreground))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  <s.icon size={12} />
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-4 h-px"
                    style={{ background: active ? "hsl(220 15% 25%)" : "hsl(var(--border))" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {step !== "idle" && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <RotateCcw size={12} />
            Nueva sesión
          </button>
        )}
      </div>
    </motion.nav>
  );
}
