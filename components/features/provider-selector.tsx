"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, CheckCircle } from "lucide-react";
import { PROVIDERS, type ProviderId } from "@/lib/ai-providers";
import { cn } from "@/lib/utils";

interface ProviderSelectorProps {
  value: ProviderId;
  onChange: (id: ProviderId) => void;
}

// Color accent per provider
const PROVIDER_COLORS: Record<ProviderId, string> = {
  deepseek:         "hsl(215 90% 60%)",
  "gemini-flash-lite": "hsl(130 60% 55%)",
  "gemini-flash":   "hsl(145 60% 50%)",
  openrouter:       "hsl(var(--accent))",
  grok3mini:        "hsl(var(--primary))",
};

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = PROVIDERS.find((p) => p.id === value) ?? PROVIDERS[0];
  const accentColor = PROVIDER_COLORS[current.id];

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
          "hover:bg-white/[0.04]"
        )}
        style={{
          background: "hsl(var(--input))",
          borderColor: open ? accentColor + "66" : "hsl(var(--border))",
          color: "hsl(var(--foreground))",
        }}
        title="Cambiar modelo de IA"
      >
        <Zap size={11} style={{ color: accentColor }} />
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border shadow-2xl overflow-hidden"
              style={{
                background: "hsl(222 20% 11%)",
                borderColor: "hsl(var(--border))",
                boxShadow: "0 20px 40px hsl(var(--shadow) / 0.6)",
              }}
            >
              {/* Header */}
              <div
                className="px-3 py-2 border-b"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(var(--muted-foreground))" }}>
                  Modelo de IA
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Solo se envían nombres de archivo, nunca el contenido
                </p>
              </div>

              {/* Options */}
              <div className="p-1.5 space-y-0.5">
                {PROVIDERS.map((p) => {
                  const isSelected = p.id === value;
                  const color = PROVIDER_COLORS[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onChange(p.id); setOpen(false); }}
                      className={cn(
                        "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors",
                        isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                      )}
                    >
                      {/* Color dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: isSelected ? color : "hsl(var(--foreground))" }}
                          >
                            {p.label}
                          </span>
                          {p.isDefault && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                background: color + "22",
                                color: color,
                              }}
                            >
                              por defecto
                            </span>
                          )}
                          {isSelected && (
                            <CheckCircle
                              size={11}
                              className="ml-auto flex-shrink-0"
                              style={{ color }}
                            />
                          )}
                        </div>
                        <p
                          className="text-[10px] mt-0.5 leading-relaxed"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {p.description}
                        </p>
                        <p
                          className="text-[10px] mt-0.5 font-mono"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          env: {p.envKey}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer hint */}
              <div
                className="px-3 py-2 border-t"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Configura las API keys como variables de entorno en Vercel
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
