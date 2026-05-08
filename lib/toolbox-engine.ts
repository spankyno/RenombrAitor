/**
 * Toolbox Engine — transformaciones de nombres de archivo sin IA.
 * Todas las funciones son puras: reciben el nombre actual y devuelven el nuevo nombre.
 * La extensión se preserva salvo que la herramienta sea precisamente cambiarla.
 */

import { getExtension, getBaseName, sanitizeFileName } from "@/types";

// ─── Tool IDs ────────────────────────────────────────────────────────────────

export type ToolId =
  | "change-extension"
  | "replace"
  | "insert"
  | "delete-chars"
  | "enumerate"
  | "datetime"
  | "random-name"
  | "case";

// ─── Tool configs (params per tool) ─────────────────────────────────────────

export interface ChangeExtensionConfig {
  newExtension: string; // without dot
}

export interface ReplaceConfig {
  search: string;       // supports * and ? wildcards
  replacement: string;
  caseSensitive: boolean;
  scope: "basename" | "full"; // apply to basename only or full name incl. ext
}

export interface InsertConfig {
  text: string;
  position: "prefix" | "suffix" | "at-index";
  index?: number;       // used when position === "at-index"
  applyTo: "basename" | "full";
}

export interface DeleteCharsConfig {
  from: number;         // 0-based start index (in basename)
  count: number;        // number of characters to delete
  applyTo: "basename" | "full";
}

export interface EnumerateConfig {
  start: number;
  step: number;
  digits: number;       // zero-padding width
  position: "prefix" | "suffix";
  separator: string;    // e.g. "_", "-", " "
}

export interface DatetimeConfig {
  template: string;     // e.g. "{YYYY}-{MM}-{DD}_{basename}{ext}" or "{basename}_{HH}{mm}{ext}"
  // Tokens: {YYYY} {YY} {MM} {DD} {HH} {mm} {ss} {basename} {ext}
  useModifiedDate: boolean; // true = file lastModified, false = today
}

export interface RandomNameConfig {
  length: number;
  charset: "alphanumeric" | "hex" | "uuid-like";
  keepExtension: boolean;
}

export interface CaseConfig {
  mode:
    | "lowercase"
    | "uppercase"
    | "title"       // First Letter Of Each Word
    | "sentence"    // First letter of string
    | "camel"       // camelCase
    | "pascal"      // PascalCase
    | "snake"       // snake_case
    | "kebab";      // kebab-case
  applyTo: "basename" | "full";
}

export type ToolConfig =
  | { tool: "change-extension"; config: ChangeExtensionConfig }
  | { tool: "replace"; config: ReplaceConfig }
  | { tool: "insert"; config: InsertConfig }
  | { tool: "delete-chars"; config: DeleteCharsConfig }
  | { tool: "enumerate"; config: EnumerateConfig }
  | { tool: "datetime"; config: DatetimeConfig }
  | { tool: "random-name"; config: RandomNameConfig }
  | { tool: "case"; config: CaseConfig };

// ─── Tool metadata (for UI) ──────────────────────────────────────────────────

export interface ToolMeta {
  id: ToolId;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export const TOOLS: ToolMeta[] = [
  { id: "case",             label: "Cambio de mayúsculas",     description: "Minúsculas, MAYÚSCULAS, Title Case, camelCase, snake_case…",  icon: "Type" },
  { id: "replace",          label: "Reemplazar texto",          description: "Sustituye cadenas de texto, admite comodines * y ?",          icon: "Replace" },
  { id: "insert",           label: "Insertar texto",            description: "Añade un prefijo, sufijo o texto en una posición concreta",   icon: "TextCursorInput" },
  { id: "delete-chars",     label: "Eliminar caracteres",       description: "Borra un rango de caracteres en una posición concreta",       icon: "Eraser" },
  { id: "enumerate",        label: "Enumerar archivos",         description: "Añade numeración secuencial con cero-padding configurable",   icon: "ListOrdered" },
  { id: "datetime",         label: "Fecha y hora",              description: "Usa la fecha de modificación del archivo en el nombre",       icon: "Calendar" },
  { id: "random-name",      label: "Nombres aleatorios",        description: "Genera nombres únicos aleatorios (hex, UUID, alfanumérico)", icon: "Shuffle" },
  { id: "change-extension", label: "Cambiar extensión",         description: "Reemplaza la extensión de todos los archivos",               icon: "FileType" },
];

// ─── Engine functions ────────────────────────────────────────────────────────

/** Main entry point: apply a tool to a batch of files */
export function applyTool(
  files: Array<{ id: string; name: string; lastModified?: number }>,
  toolConfig: ToolConfig
): Array<{ fileId: string; originalName: string; proposedName: string }> {
  return files.map((file, index) => ({
    fileId: file.id,
    originalName: file.name,
    proposedName: sanitizeFileName(
      transform(file, index, files.length, toolConfig)
    ) || file.name,
  }));
}

function transform(
  file: { name: string; lastModified?: number },
  index: number,
  total: number,
  tc: ToolConfig
): string {
  const ext = getExtension(file.name);
  const base = getBaseName(file.name);
  const dotExt = ext ? `.${ext}` : "";

  switch (tc.tool) {
    case "change-extension": {
      const newExt = tc.config.newExtension.replace(/^\./, "");
      return newExt ? `${base}.${newExt}` : base;
    }

    case "replace": {
      const { search, replacement, caseSensitive, scope } = tc.config;
      const target = scope === "full" ? file.name : base;
      const result = wildcardReplace(target, search, replacement, caseSensitive);
      return scope === "full" ? result : `${result}${dotExt}`;
    }

    case "insert": {
      const { text, position, index: idx, applyTo } = tc.config;
      const target = applyTo === "full" ? file.name : base;
      let result: string;
      if (position === "prefix") {
        result = `${text}${target}`;
      } else if (position === "suffix") {
        result = `${target}${text}`;
      } else {
        const i = Math.min(Math.max(idx ?? 0, 0), target.length);
        result = `${target.slice(0, i)}${text}${target.slice(i)}`;
      }
      return applyTo === "full" ? result : `${result}${dotExt}`;
    }

    case "delete-chars": {
      const { from, count, applyTo } = tc.config;
      const target = applyTo === "full" ? file.name : base;
      const start = Math.min(Math.max(from, 0), target.length);
      const result = target.slice(0, start) + target.slice(start + count);
      return applyTo === "full" ? result : `${result}${dotExt}`;
    }

    case "enumerate": {
      const { start, step, digits, position, separator } = tc.config;
      const n = start + index * step;
      const numStr = String(n).padStart(digits, "0");
      return position === "prefix"
        ? `${numStr}${separator}${base}${dotExt}`
        : `${base}${separator}${numStr}${dotExt}`;
    }

    case "datetime": {
      const date = tc.config.useModifiedDate && file.lastModified
        ? new Date(file.lastModified)
        : new Date();
      const tokens: Record<string, string> = {
        YYYY: String(date.getFullYear()),
        YY:   String(date.getFullYear()).slice(-2),
        MM:   String(date.getMonth() + 1).padStart(2, "0"),
        DD:   String(date.getDate()).padStart(2, "0"),
        HH:   String(date.getHours()).padStart(2, "0"),
        mm:   String(date.getMinutes()).padStart(2, "0"),
        ss:   String(date.getSeconds()).padStart(2, "0"),
        basename: base,
        ext:  dotExt,
        name: file.name,
      };
      let result = tc.config.template;
      for (const [k, v] of Object.entries(tokens)) {
        result = result.replaceAll(`{${k}}`, v);
      }
      return result;
    }

    case "random-name": {
      const { length, charset, keepExtension } = tc.config;
      const name = randomString(length, charset);
      return keepExtension ? `${name}${dotExt}` : name;
    }

    case "case": {
      const { mode, applyTo } = tc.config;
      const target = applyTo === "full" ? file.name : base;
      const result = applyCase(target, mode);
      return applyTo === "full" ? result : `${result}${dotExt}`;
    }

    default:
      return file.name;
  }
}

// ─── Wildcard replace ────────────────────────────────────────────────────────

function wildcardReplace(
  str: string,
  pattern: string,
  replacement: string,
  caseSensitive: boolean
): string {
  // Convert wildcard pattern to regex
  // * → match any sequence, ? → match single char
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex special chars
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  const flags = caseSensitive ? "g" : "gi";
  try {
    const regex = new RegExp(escaped, flags);
    return str.replace(regex, replacement);
  } catch {
    // Fallback to plain string replace if regex fails
    const search = caseSensitive ? pattern : pattern.toLowerCase();
    const target = caseSensitive ? str : str.toLowerCase();
    if (!target.includes(search)) return str;
    return str.replace(
      new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags),
      replacement
    );
  }
}

// ─── Case transforms ─────────────────────────────────────────────────────────

function applyCase(str: string, mode: CaseConfig["mode"]): string {
  switch (mode) {
    case "lowercase": return str.toLowerCase();
    case "uppercase": return str.toUpperCase();
    case "sentence":  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    case "title":
      return str.replace(/\b\w/g, (c) => c.toUpperCase());
    case "camel": {
      const words = tokenize(str);
      return words[0].toLowerCase() + words.slice(1).map(capitalize).join("");
    }
    case "pascal":
      return tokenize(str).map(capitalize).join("");
    case "snake":
      return tokenize(str).map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return tokenize(str).map((w) => w.toLowerCase()).join("-");
    default:
      return str;
  }
}

function tokenize(str: string): string[] {
  // Split on spaces, underscores, hyphens, and camelCase boundaries
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")  // camelCase split
    .split(/[\s_\-]+/)
    .filter(Boolean);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Random name ─────────────────────────────────────────────────────────────

function randomString(length: number, charset: RandomNameConfig["charset"]): string {
  if (charset === "uuid-like") {
    // xxxxxxxx-xxxx-4xxx-yxxx format trimmed to requested length
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid.slice(0, length);
  }

  const chars =
    charset === "hex"
      ? "0123456789abcdef"
      : "abcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ─── Default configs ──────────────────────────────────────────────────────────

export function defaultConfig(tool: ToolId): ToolConfig {
  switch (tool) {
    case "change-extension": return { tool, config: { newExtension: "" } };
    case "replace":          return { tool, config: { search: "", replacement: "", caseSensitive: false, scope: "basename" } };
    case "insert":           return { tool, config: { text: "", position: "prefix", index: 0, applyTo: "basename" } };
    case "delete-chars":     return { tool, config: { from: 0, count: 1, applyTo: "basename" } };
    case "enumerate":        return { tool, config: { start: 1, step: 1, digits: 3, position: "prefix", separator: "_" } };
    case "datetime":         return { tool, config: { template: "{YYYY}-{MM}-{DD}_{basename}{ext}", useModifiedDate: true } };
    case "random-name":      return { tool, config: { length: 12, charset: "alphanumeric", keepExtension: true } };
    case "case":             return { tool, config: { mode: "lowercase", applyTo: "basename" } };
  }
}
