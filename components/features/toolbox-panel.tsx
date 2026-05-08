"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type, Replace, TextCursorInput, Eraser, ListOrdered,
  Calendar, Shuffle, FileType, ChevronRight, Play,
  Info, X,
} from "lucide-react";
import {
  TOOLS, defaultConfig, applyTool,
  type ToolId, type ToolConfig,
  type ChangeExtensionConfig, type ReplaceConfig,
  type InsertConfig, type DeleteCharsConfig,
  type EnumerateConfig, type DatetimeConfig,
  type RandomNameConfig, type CaseConfig,
} from "@/lib/toolbox-engine";
import type { FileEntry, RenameProposal } from "@/types";
import { cn } from "@/lib/utils";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Type, Replace, TextCursorInput, Eraser, ListOrdered,
  Calendar, Shuffle, FileType,
};

// ─── Label helpers ────────────────────────────────────────────────────────────
const FIELD_STYLE = {
  label: "text-[11px] font-medium mb-1 block",
  input: [
    "w-full text-xs px-2.5 py-1.5 rounded-lg border outline-none transition-colors",
    "bg-[hsl(220_15%_13%)] border-[hsl(220_15%_20%)] text-[hsl(210_20%_88%)]",
    "focus:border-[hsl(195_100%_55%/0.5)] placeholder:text-[hsl(215_15%_35%)]",
  ].join(" "),
  select: [
    "w-full text-xs px-2.5 py-1.5 rounded-lg border outline-none transition-colors",
    "bg-[hsl(220_15%_13%)] border-[hsl(220_15%_20%)] text-[hsl(210_20%_88%)]",
    "focus:border-[hsl(195_100%_55%/0.5)]",
  ].join(" "),
  row: "flex gap-2",
  col: "flex flex-col",
  check: "flex items-center gap-1.5 cursor-pointer select-none",
} as const;

function Label({ children }: { children: React.ReactNode }) {
  return <span className={FIELD_STYLE.label} style={{ color: "hsl(215 15% 50%)" }}>{children}</span>;
}

// ─── Per-tool form components ─────────────────────────────────────────────────

function ChangeExtForm({ cfg, onChange }: { cfg: ChangeExtensionConfig; onChange: (c: ChangeExtensionConfig) => void }) {
  return (
    <div className={FIELD_STYLE.col}>
      <Label>Nueva extensión (sin punto)</Label>
      <input className={FIELD_STYLE.input} placeholder="ej: jpg, mp4, txt" value={cfg.newExtension}
        onChange={(e) => onChange({ ...cfg, newExtension: e.target.value.replace(/^\./, "") })} />
      <p className="text-[10px] mt-1" style={{ color: "hsl(215 15% 40%)" }}>Deja vacío para eliminar la extensión</p>
    </div>
  );
}

function ReplaceForm({ cfg, onChange }: { cfg: ReplaceConfig; onChange: (c: ReplaceConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.col}>
        <Label>Buscar (admite * y ?)</Label>
        <input className={FIELD_STYLE.input} placeholder="ej: foto_*, IMG_???" value={cfg.search}
          onChange={(e) => onChange({ ...cfg, search: e.target.value })} />
      </div>
      <div className={FIELD_STYLE.col}>
        <Label>Reemplazar por</Label>
        <input className={FIELD_STYLE.input} placeholder="texto de sustitución" value={cfg.replacement}
          onChange={(e) => onChange({ ...cfg, replacement: e.target.value })} />
      </div>
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Aplicar en</Label>
          <select className={FIELD_STYLE.select} value={cfg.scope}
            onChange={(e) => onChange({ ...cfg, scope: e.target.value as ReplaceConfig["scope"] })}>
            <option value="basename">Solo nombre base</option>
            <option value="full">Nombre completo (con extensión)</option>
          </select>
        </div>
        <div className="flex flex-col justify-end pb-0.5">
          <label className={FIELD_STYLE.check}>
            <input type="checkbox" checked={cfg.caseSensitive}
              onChange={(e) => onChange({ ...cfg, caseSensitive: e.target.checked })}
              className="w-3.5 h-3.5 accent-[hsl(195_100%_55%)]" />
            <span className="text-xs" style={{ color: "hsl(215 15% 55%)" }}>Distinguir mayúsculas</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function InsertForm({ cfg, onChange }: { cfg: InsertConfig; onChange: (c: InsertConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.col}>
        <Label>Texto a insertar</Label>
        <input className={FIELD_STYLE.input} placeholder="ej: 2024_, _v2, DRAFT_" value={cfg.text}
          onChange={(e) => onChange({ ...cfg, text: e.target.value })} />
      </div>
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Posición</Label>
          <select className={FIELD_STYLE.select} value={cfg.position}
            onChange={(e) => onChange({ ...cfg, position: e.target.value as InsertConfig["position"] })}>
            <option value="prefix">Al principio (prefijo)</option>
            <option value="suffix">Al final (sufijo)</option>
            <option value="at-index">En posición concreta</option>
          </select>
        </div>
        {cfg.position === "at-index" && (
          <div className="w-24">
            <Label>Índice (0=inicio)</Label>
            <input type="number" min={0} className={FIELD_STYLE.input} value={cfg.index ?? 0}
              onChange={(e) => onChange({ ...cfg, index: parseInt(e.target.value) || 0 })} />
          </div>
        )}
      </div>
      <div className={FIELD_STYLE.col}>
        <Label>Aplicar en</Label>
        <select className={FIELD_STYLE.select} value={cfg.applyTo}
          onChange={(e) => onChange({ ...cfg, applyTo: e.target.value as InsertConfig["applyTo"] })}>
          <option value="basename">Solo nombre base</option>
          <option value="full">Nombre completo (con extensión)</option>
        </select>
      </div>
    </div>
  );
}

function DeleteForm({ cfg, onChange }: { cfg: DeleteCharsConfig; onChange: (c: DeleteCharsConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Desde posición (0 = inicio)</Label>
          <input type="number" min={0} className={FIELD_STYLE.input} value={cfg.from}
            onChange={(e) => onChange({ ...cfg, from: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex-1">
          <Label>Número de caracteres</Label>
          <input type="number" min={1} className={FIELD_STYLE.input} value={cfg.count}
            onChange={(e) => onChange({ ...cfg, count: Math.max(1, parseInt(e.target.value) || 1) })} />
        </div>
      </div>
      <div className={FIELD_STYLE.col}>
        <Label>Aplicar en</Label>
        <select className={FIELD_STYLE.select} value={cfg.applyTo}
          onChange={(e) => onChange({ ...cfg, applyTo: e.target.value as DeleteCharsConfig["applyTo"] })}>
          <option value="basename">Solo nombre base</option>
          <option value="full">Nombre completo (con extensión)</option>
        </select>
      </div>
    </div>
  );
}

function EnumerateForm({ cfg, onChange }: { cfg: EnumerateConfig; onChange: (c: EnumerateConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Número inicial</Label>
          <input type="number" min={0} className={FIELD_STYLE.input} value={cfg.start}
            onChange={(e) => onChange({ ...cfg, start: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex-1">
          <Label>Incremento</Label>
          <input type="number" min={1} className={FIELD_STYLE.input} value={cfg.step}
            onChange={(e) => onChange({ ...cfg, step: Math.max(1, parseInt(e.target.value) || 1) })} />
        </div>
        <div className="flex-1">
          <Label>Dígitos mínimos</Label>
          <input type="number" min={1} max={10} className={FIELD_STYLE.input} value={cfg.digits}
            onChange={(e) => onChange({ ...cfg, digits: Math.min(10, Math.max(1, parseInt(e.target.value) || 3)) })} />
        </div>
      </div>
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Posición del número</Label>
          <select className={FIELD_STYLE.select} value={cfg.position}
            onChange={(e) => onChange({ ...cfg, position: e.target.value as EnumerateConfig["position"] })}>
            <option value="prefix">Prefijo</option>
            <option value="suffix">Sufijo</option>
          </select>
        </div>
        <div className="flex-1">
          <Label>Separador</Label>
          <input className={FIELD_STYLE.input} maxLength={5} value={cfg.separator} placeholder="_"
            onChange={(e) => onChange({ ...cfg, separator: e.target.value })} />
        </div>
      </div>
      <p className="text-[10px]" style={{ color: "hsl(215 15% 40%)" }}>
        Preview: {cfg.position === "prefix" ? `${String(cfg.start).padStart(cfg.digits, "0")}${cfg.separator}nombre` : `nombre${cfg.separator}${String(cfg.start).padStart(cfg.digits, "0")}`}
      </p>
    </div>
  );
}

function DatetimeForm({ cfg, onChange }: { cfg: DatetimeConfig; onChange: (c: DatetimeConfig) => void }) {
  const TOKEN_HINT = "{YYYY} {YY} {MM} {DD} {HH} {mm} {ss} {basename} {ext}";
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.col}>
        <Label>Plantilla de nombre</Label>
        <input className={FIELD_STYLE.input} value={cfg.template}
          onChange={(e) => onChange({ ...cfg, template: e.target.value })} />
        <p className="text-[10px] mt-1 font-mono leading-relaxed" style={{ color: "hsl(215 15% 40%)" }}>
          Tokens: {TOKEN_HINT}
        </p>
      </div>
      <label className={FIELD_STYLE.check}>
        <input type="checkbox" checked={cfg.useModifiedDate}
          onChange={(e) => onChange({ ...cfg, useModifiedDate: e.target.checked })}
          className="w-3.5 h-3.5 accent-[hsl(195_100%_55%)]" />
        <span className="text-xs" style={{ color: "hsl(215 15% 55%)" }}>Usar fecha de modificación del archivo (si no, usa fecha de hoy)</span>
      </label>
    </div>
  );
}

function RandomForm({ cfg, onChange }: { cfg: RandomNameConfig; onChange: (c: RandomNameConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.row}>
        <div className="flex-1">
          <Label>Longitud del nombre</Label>
          <input type="number" min={4} max={64} className={FIELD_STYLE.input} value={cfg.length}
            onChange={(e) => onChange({ ...cfg, length: Math.min(64, Math.max(4, parseInt(e.target.value) || 12)) })} />
        </div>
        <div className="flex-1">
          <Label>Tipo de caracteres</Label>
          <select className={FIELD_STYLE.select} value={cfg.charset}
            onChange={(e) => onChange({ ...cfg, charset: e.target.value as RandomNameConfig["charset"] })}>
            <option value="alphanumeric">Alfanumérico (a-z, 0-9)</option>
            <option value="hex">Hexadecimal (0-9, a-f)</option>
            <option value="uuid-like">UUID-like</option>
          </select>
        </div>
      </div>
      <label className={FIELD_STYLE.check}>
        <input type="checkbox" checked={cfg.keepExtension}
          onChange={(e) => onChange({ ...cfg, keepExtension: e.target.checked })}
          className="w-3.5 h-3.5 accent-[hsl(195_100%_55%)]" />
        <span className="text-xs" style={{ color: "hsl(215 15% 55%)" }}>Mantener extensión original</span>
      </label>
    </div>
  );
}

function CaseForm({ cfg, onChange }: { cfg: CaseConfig; onChange: (c: CaseConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className={FIELD_STYLE.col}>
        <Label>Transformación</Label>
        <select className={FIELD_STYLE.select} value={cfg.mode}
          onChange={(e) => onChange({ ...cfg, mode: e.target.value as CaseConfig["mode"] })}>
          <option value="lowercase">minúsculas</option>
          <option value="uppercase">MAYÚSCULAS</option>
          <option value="title">Primera Letra De Cada Palabra</option>
          <option value="sentence">Primera letra de la frase</option>
          <option value="camel">camelCase</option>
          <option value="pascal">PascalCase</option>
          <option value="snake">snake_case</option>
          <option value="kebab">kebab-case</option>
        </select>
      </div>
      <div className={FIELD_STYLE.col}>
        <Label>Aplicar en</Label>
        <select className={FIELD_STYLE.select} value={cfg.applyTo}
          onChange={(e) => onChange({ ...cfg, applyTo: e.target.value as CaseConfig["applyTo"] })}>
          <option value="basename">Solo nombre base</option>
          <option value="full">Nombre completo (con extensión)</option>
        </select>
      </div>
    </div>
  );
}

// ─── Live preview (first 5 files) ────────────────────────────────────────────

function LivePreview({
  files,
  toolConfig,
}: {
  files: Array<{ id: string; name: string; lastModified?: number }>;
  toolConfig: ToolConfig;
}) {
  const preview = useMemo(() => {
    try {
      return applyTool(files.slice(0, 5), toolConfig);
    } catch {
      return [];
    }
  }, [files, toolConfig]);

  if (preview.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border overflow-hidden"
      style={{ borderColor: "hsl(220 15% 18%)" }}>
      <div className="px-3 py-1.5 border-b flex items-center gap-1.5"
        style={{ background: "hsl(220 15% 12%)", borderColor: "hsl(220 15% 18%)" }}>
        <Info size={11} style={{ color: "hsl(195 100% 60%)" }} />
        <span className="text-[10px] font-medium" style={{ color: "hsl(215 15% 50%)" }}>
          Vista previa (primeros {preview.length} archivos)
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "hsl(220 15% 16%)" }}>
        {preview.map((p) => (
          <div key={p.fileId} className="flex items-center gap-2 px-3 py-1.5">
            <span className="flex-1 text-[10px] font-mono truncate"
              style={{ color: "hsl(215 15% 50%)" }}>{p.originalName}</span>
            <ChevronRight size={10} style={{ color: "hsl(195 100% 55%)", flexShrink: 0 }} />
            <span className="flex-1 text-[10px] font-mono truncate"
              style={{ color: p.originalName !== p.proposedName ? "hsl(130 60% 60%)" : "hsl(215 15% 50%)" }}>
              {p.proposedName}
            </span>
          </div>
        ))}
        {files.length > 5 && (
          <div className="px-3 py-1" style={{ background: "hsl(220 15% 11%)" }}>
            <span className="text-[10px]" style={{ color: "hsl(215 15% 38%)" }}>
              + {files.length - 5} archivos más…
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ToolboxPanelProps {
  files: FileEntry[];
  onApplyProposals: (proposals: RenameProposal[]) => void;
}

export function ToolboxPanel({ files, onApplyProposals }: ToolboxPanelProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [config, setConfig] = useState<ToolConfig | null>(null);

  const selectTool = (id: ToolId) => {
    setActiveTool(id);
    setConfig(defaultConfig(id));
  };

  const clearTool = () => {
    setActiveTool(null);
    setConfig(null);
  };

  const handleApply = () => {
    if (!config) return;
    const fileData = files.map((f) => ({
      id: f.id,
      name: f.name,
      lastModified: f.lastModified,
    }));
    const proposals = applyTool(fileData, config);
    onApplyProposals(
      proposals.map((p) => ({ ...p, isEdited: false, hasConflict: false }))
    );
  };

  const updateConfig = (partial: ToolConfig["config"]) => {
    if (!config || !activeTool) return;
    setConfig({ tool: activeTool, config: partial } as ToolConfig);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border overflow-hidden"
      style={{ background: "hsl(222 18% 10%)", borderColor: "hsl(220 15% 16%)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "hsl(220 15% 16%)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(270 70% 65% / 0.15)" }}>
          <Shuffle size={14} style={{ color: "hsl(270 70% 70%)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Toolbox</p>
          <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
            Transformaciones sin IA · {files.length} archivos
          </p>
        </div>
        {activeTool && (
          <button onClick={clearTool} className="p-1 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X size={14} style={{ color: "hsl(215 15% 50%)" }} />
          </button>
        )}
      </div>

      {/* Tool grid / active form */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!activeTool ? (
            /* ── Tool grid ── */
            <motion.div key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-3 grid grid-cols-2 gap-2">
              {TOOLS.map((tool) => {
                const Icon = ICON_MAP[tool.icon] ?? Type;
                return (
                  <button key={tool.id} onClick={() => selectTool(tool.id)}
                    className="flex flex-col gap-2 p-3 rounded-xl border text-left transition-all hover:bg-white/[0.04] hover:border-[hsl(270_70%_65%/0.3)] active:scale-[0.98]"
                    style={{ borderColor: "hsl(220 15% 18%)", background: "hsl(220 15% 12%)" }}>
                    <Icon size={16} style={{ color: "hsl(270 70% 65%)" }} />
                    <div>
                      <p className="text-xs font-semibold leading-tight" style={{ color: "hsl(210 20% 85%)" }}>
                        {tool.label}
                      </p>
                      <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "hsl(215 15% 48%)" }}>
                        {tool.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            /* ── Active tool form ── */
            <motion.div key="form"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4">

              {/* Tool title */}
              <div className="flex items-center gap-2">
                {(() => {
                  const meta = TOOLS.find((t) => t.id === activeTool)!;
                  const Icon = ICON_MAP[meta.icon] ?? Type;
                  return (
                    <>
                      <Icon size={15} style={{ color: "hsl(270 70% 65%)" }} />
                      <span className="text-sm font-semibold" style={{ color: "hsl(210 20% 88%)" }}>
                        {meta.label}
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Form fields */}
              {config && (() => {
                switch (config.tool) {
                  case "change-extension":
                    return <ChangeExtForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "replace":
                    return <ReplaceForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "insert":
                    return <InsertForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "delete-chars":
                    return <DeleteForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "enumerate":
                    return <EnumerateForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "datetime":
                    return <DatetimeForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "random-name":
                    return <RandomForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                  case "case":
                    return <CaseForm cfg={config.config} onChange={(c) => updateConfig(c)} />;
                }
              })()}

              {/* Live preview */}
              {config && (
                <LivePreview
                  files={files.map((f) => ({ id: f.id, name: f.name, lastModified: f.lastModified }))}
                  toolConfig={config}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Apply button — only shown when a tool is active */}
      <AnimatePresence>
        {activeTool && config && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="p-3 border-t flex gap-2 flex-shrink-0"
            style={{ borderColor: "hsl(220 15% 16%)" }}>
            <button onClick={clearTool}
              className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all hover:bg-white/[0.04]"
              style={{ borderColor: "hsl(220 15% 22%)", color: "hsl(215 15% 55%)" }}>
              ← Volver
            </button>
            <button onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(270 70% 60%), hsl(270 70% 50%))",
                color: "hsl(210 20% 95%)",
                boxShadow: "0 0 16px hsl(270 70% 60% / 0.25)",
              }}>
              <Play size={12} />
              Generar propuesta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
