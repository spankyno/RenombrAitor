"use client";

import { motion } from "framer-motion";
import { FolderOpen, MessageSquare, Eye, CheckCircle, Sparkles, RotateCcw } from "lucide-react";
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
  { id: "chatting", label: "Instrucciones", icon: MessageSquare },
  { id: "preview", label: "Vista previa", icon: Eye },
  { id: "done", label: "Listo", icon: CheckCircle },
];

const STEP_ORDER: AppStep[] = ["idle", "folder-selected", "chatting", "preview", "applying", "done"];

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
        background: "hsl(222 20% 8% / 0.9)",
        borderColor: "hsl(220 15% 16%)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(195 100% 55% / 0.15)" }}
        >
          <Sparkles size={14} style={{ color: "hsl(195 100% 65%)" }} />
        </div>
        <span className="font-bold text-sm">
          <span className="gradient-text">Renombr</span>
          <span>Aitor</span>
        </span>
        {folderName && (
          <>
            <span style={{ color: "hsl(220 15% 30%)" }}>/</span>
            <span className="text-sm font-mono truncate max-w-[160px]" style={{ color: "hsl(215 15% 55%)" }}>
              {folderName}
            </span>
            {filesCount !== undefined && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "hsl(220 15% 18%)", color: "hsl(215 15% 50%)" }}
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
                      ? "hsl(195 100% 55% / 0.12)"
                      : active
                      ? "transparent"
                      : "transparent",
                    color: current
                      ? "hsl(195 100% 65%)"
                      : active
                      ? "hsl(215 15% 60%)"
                      : "hsl(215 15% 35%)",
                  }}
                >
                  <s.icon size={12} />
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-4 h-px"
                    style={{ background: active ? "hsl(220 15% 25%)" : "hsl(220 15% 18%)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reset button */}
      {step !== "idle" && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.05]"
          style={{ color: "hsl(215 15% 50%)" }}
        >
          <RotateCcw size={12} />
          Nueva sesión
        </button>
      )}
    </motion.nav>
  );
}
