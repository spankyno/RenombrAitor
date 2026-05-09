"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, FolderOpen, RefreshCw } from "lucide-react";
import type { ApplyResult } from "@/types";

interface DoneScreenProps {
  result: ApplyResult;
  destinationName: string;
  onReset: () => void;
}

export function DoneScreen({ result, destinationName, onReset }: DoneScreenProps) {
  const allSuccess = result.failed === 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: allSuccess
            ? "hsl(130 60% 45% / 0.15)"
            : "hsl(30 80% 50% / 0.15)",
          border: `2px solid ${allSuccess ? "hsl(130 60% 45% / 0.4)" : "hsl(30 80% 50% / 0.4)"}`,
        }}
      >
        {allSuccess ? (
          <CheckCircle size={36} style={{ color: "hsl(130 60% 60%)" }} />
        ) : (
          <XCircle size={36} style={{ color: "hsl(30 80% 65%)" }} />
        )}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold mb-2"
      >
        {allSuccess ? "¡Renombrado completado!" : "Completado con errores"}
      </motion.h2>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4 mt-4 mb-6"
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          style={{
            background: "hsl(130 60% 45% / 0.08)",
            borderColor: "hsl(130 60% 45% / 0.25)",
          }}
        >
          <CheckCircle size={16} style={{ color: "hsl(130 60% 60%)" }} />
          <span className="font-semibold" style={{ color: "hsl(130 60% 65%)" }}>
            {result.success} exitosos
          </span>
        </div>

        {result.failed > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{
              background: "hsl(0 70% 50% / 0.08)",
              borderColor: "hsl(0 70% 50% / 0.25)",
            }}
          >
            <XCircle size={16} style={{ color: "hsl(0 70% 65%)" }} />
            <span className="font-semibold" style={{ color: "hsl(0 70% 65%)" }}>
              {result.failed} fallidos
            </span>
          </div>
        )}
      </motion.div>

      {/* Destination info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3 px-5 py-3 rounded-xl border mb-4"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        <FolderOpen size={18} style={{ color: "hsl(var(--primary))" }} />
        <div className="text-left">
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Archivos guardados en
          </p>
          <p className="text-sm font-mono font-medium">{destinationName}</p>
        </div>
      </motion.div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg rounded-xl border overflow-hidden mb-6"
          style={{
            background: "hsl(0 70% 50% / 0.06)",
            borderColor: "hsl(0 70% 50% / 0.2)",
          }}
        >
          <div className="px-4 py-2.5 border-b" style={{ borderColor: "hsl(0 70% 50% / 0.2)" }}>
            <p className="text-xs font-semibold" style={{ color: "hsl(0 70% 65%)" }}>
              Errores
            </p>
          </div>
          <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
            {result.errors.map((err, i) => (
              <div key={i} className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span style={{ color: "hsl(0 70% 65%)" }}>{err.file}</span>
                {" → "}
                {err.error}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onReset}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
        style={{
          background: "hsl(var(--muted))",
          border: "1px solid hsl(220 15% 22%)",
          color: "hsl(var(--foreground))",
        }}
      >
        <RefreshCw size={16} />
        Renombrar otra carpeta
      </motion.button>
    </div>
  );
}
