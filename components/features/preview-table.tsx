"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  AlertTriangle,
  Edit3,
  X,
  FolderOutput,
  Download,
} from "lucide-react";
import type { RenameProposal } from "@/types";
import { cn } from "@/lib/utils";

interface PreviewTableProps {
  proposals: RenameProposal[];
  onUpdateProposal: (fileId: string, proposedName: string) => void;
  onApply: () => void;
  isApplying: boolean;
  applyProgress: number;
  destinationName?: string;
}

interface EditingState {
  fileId: string;
  value: string;
}

export function PreviewTable({
  proposals,
  onUpdateProposal,
  onApply,
  isApplying,
  applyProgress,
  destinationName,
}: PreviewTableProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [filter, setFilter] = useState<"all" | "changed" | "conflicts">("all");

  const conflicts = proposals.filter((p) => p.hasConflict);
  const changed = proposals.filter((p) => p.originalName !== p.proposedName);

  const filtered = proposals.filter((p) => {
    if (filter === "changed") return p.originalName !== p.proposedName;
    if (filter === "conflicts") return p.hasConflict;
    return true;
  });

  const startEdit = (proposal: RenameProposal) => {
    setEditing({ fileId: proposal.fileId, value: proposal.proposedName });
  };

  const commitEdit = () => {
    if (editing && editing.value.trim()) {
      onUpdateProposal(editing.fileId, editing.value.trim());
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const progressPercent = isApplying
    ? Math.round((applyProgress / proposals.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Vista previa del renombrado</h2>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215 15% 55%)" }}>
            {changed.length} de {proposals.length} archivos serán renombrados
            {conflicts.length > 0 && (
              <span className="ml-2" style={{ color: "hsl(30 80% 65%)" }}>
                · {conflicts.length} conflictos
              </span>
            )}
          </p>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ background: "hsl(220 15% 13%)" }}
        >
          {[
            { id: "all", label: `Todos (${proposals.length})` },
            { id: "changed", label: `Cambios (${changed.length})` },
            { id: "conflicts", label: `Conflictos (${conflicts.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                filter === tab.id
                  ? "text-[hsl(210_20%_92%)]"
                  : "text-[hsl(215_15%_50%)] hover:text-[hsl(210_20%_75%)]"
              )}
              style={
                filter === tab.id
                  ? { background: "hsl(220 15% 20%)" }
                  : {}
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(220 15% 16%)" }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_auto_1fr_auto] items-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b"
          style={{
            background: "hsl(222 18% 10%)",
            borderColor: "hsl(220 15% 16%)",
            color: "hsl(215 15% 45%)",
          }}
        >
          <span>Nombre actual</span>
          <span className="px-4"></span>
          <span>Nombre propuesto</span>
          <span className="pl-4">Estado</span>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "hsl(220 15% 14%)" }}>
          {filtered.map((proposal, i) => {
            const isEditing = editing?.fileId === proposal.fileId;
            const isUnchanged = proposal.originalName === proposal.proposedName;

            return (
              <motion.div
                key={proposal.fileId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr_auto] items-center px-4 py-2.5 group transition-colors",
                  "hover:bg-white/[0.02]",
                  proposal.hasConflict && "bg-[hsl(30_80%_50%/0.04)]"
                )}
              >
                {/* Original name */}
                <span
                  className="text-xs font-mono truncate pr-3"
                  style={{ color: isUnchanged ? "hsl(215 15% 50%)" : "hsl(210 20% 75%)" }}
                  title={proposal.originalName}
                >
                  {proposal.originalName}
                </span>

                {/* Arrow */}
                <ArrowRight
                  size={14}
                  style={{
                    color: isUnchanged
                      ? "hsl(215 15% 35%)"
                      : "hsl(195 100% 55%)",
                  }}
                />

                {/* Proposed name - editable */}
                <div className="flex items-center gap-1 pl-3">
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        autoFocus
                        value={editing.value}
                        onChange={(e) =>
                          setEditing({ ...editing, value: e.target.value })
                        }
                        onKeyDown={handleEditKeyDown}
                        onBlur={commitEdit}
                        className="flex-1 text-xs font-mono bg-transparent outline-none border-b pb-0.5"
                        style={{
                          borderColor: "hsl(195 100% 55%)",
                          color: "hsl(210 20% 92%)",
                        }}
                      />
                      <button onClick={commitEdit}>
                        <Check size={12} style={{ color: "hsl(130 70% 60%)" }} />
                      </button>
                      <button onClick={cancelEdit}>
                        <X size={12} style={{ color: "hsl(0 70% 60%)" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(proposal)}
                      className="flex items-center gap-1.5 group/edit text-left flex-1"
                      disabled={isApplying}
                    >
                      <span
                        className={cn(
                          "text-xs font-mono truncate",
                          proposal.isEdited && "underline decoration-dashed underline-offset-2"
                        )}
                        style={{
                          color: isUnchanged
                            ? "hsl(215 15% 50%)"
                            : proposal.hasConflict
                            ? "hsl(30 80% 65%)"
                            : "hsl(130 60% 65%)",
                        }}
                        title={proposal.proposedName}
                      >
                        {proposal.proposedName}
                      </span>
                      {!isApplying && (
                        <Edit3
                          size={11}
                          className="opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: "hsl(215 15% 50%)" }}
                        />
                      )}
                    </button>
                  )}
                </div>

                {/* Status icon */}
                <div className="pl-4">
                  {proposal.hasConflict ? (
                    <AlertTriangle size={14} style={{ color: "hsl(30 80% 65%)" }} />
                  ) : isUnchanged ? (
                    <span
                      className="text-[10px]"
                      style={{ color: "hsl(215 15% 40%)" }}
                    >
                      =
                    </span>
                  ) : (
                    <Check size={14} style={{ color: "hsl(130 60% 60%)" }} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Apply section */}
      <div
        className="flex items-center justify-between p-4 rounded-xl border"
        style={{
          background: "hsl(222 18% 10%)",
          borderColor: "hsl(220 15% 16%)",
        }}
      >
        <div>
          {destinationName ? (
            <div className="flex items-center gap-2">
              <FolderOutput size={16} style={{ color: "hsl(195 100% 60%)" }} />
              <div>
                <p className="text-sm font-medium">Carpeta destino lista</p>
                <p className="text-xs font-mono" style={{ color: "hsl(215 15% 55%)" }}>
                  📁 {destinationName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "hsl(215 15% 55%)" }}>
              Se creará la carpeta destino al aplicar
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isApplying && (
            <div className="flex items-center gap-3">
              <div
                className="w-32 h-1.5 rounded-full overflow-hidden"
                style={{ background: "hsl(220 15% 20%)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "hsl(195 100% 55%)" }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <span className="text-xs tabular-nums" style={{ color: "hsl(215 15% 55%)" }}>
                {progressPercent}%
              </span>
            </div>
          )}

          <button
            onClick={onApply}
            disabled={isApplying || conflicts.length > 0 && proposals.every((p) => p.hasConflict)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
              "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{
              background: "linear-gradient(135deg, hsl(130 60% 45%), hsl(130 60% 38%))",
              color: "hsl(210 20% 95%)",
              boxShadow: "0 0 20px hsl(130 60% 45% / 0.25)",
            }}
          >
            {isApplying ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
                Copiando...
              </>
            ) : (
              <>
                <Download size={16} />
                Aplicar Renombrado
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
