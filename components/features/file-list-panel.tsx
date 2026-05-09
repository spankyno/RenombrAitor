"use client";

import { motion } from "framer-motion";
import { File, FolderOpen, Hash } from "lucide-react";
import type { FileEntry } from "@/types";
import { formatFileSize } from "@/types";
import { cn } from "@/lib/utils";

interface FileListPanelProps {
  files: FileEntry[];
  folderName: string;
}

const EXT_COLORS: Record<string, string> = {
  pdf: "hsl(0 80% 65%)",
  jpg: "hsl(195 80% 60%)",
  jpeg: "hsl(195 80% 60%)",
  png: "hsl(195 80% 60%)",
  gif: "hsl(195 80% 60%)",
  webp: "hsl(195 80% 60%)",
  mp4: "hsl(var(--accent))",
  mov: "hsl(var(--accent))",
  avi: "hsl(var(--accent))",
  mp3: "hsl(45 90% 65%)",
  wav: "hsl(45 90% 65%)",
  flac: "hsl(45 90% 65%)",
  doc: "hsl(220 80% 65%)",
  docx: "hsl(220 80% 65%)",
  xls: "hsl(130 70% 60%)",
  xlsx: "hsl(130 70% 60%)",
  zip: "hsl(30 80% 65%)",
  rar: "hsl(30 80% 65%)",
  txt: "hsl(var(--muted-foreground))",
  md: "hsl(var(--muted-foreground))",
};

function getExtColor(ext: string): string {
  return EXT_COLORS[ext.toLowerCase()] || "hsl(var(--muted-foreground))";
}

export function FileListPanel({ files, folderName }: FileListPanelProps) {
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div
      className="flex flex-col h-full rounded-xl border overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <FolderOpen size={16} style={{ color: "hsl(var(--primary))" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" title={folderName}>
            {folderName}
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {files.length} archivos · {formatFileSize(totalSize)}
          </p>
        </div>
        <span
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "hsl(var(--primary) / 0.1)",
            color: "hsl(var(--primary))",
          }}
        >
          <Hash size={10} />
          {files.length}
        </span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
            <File size={32} style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="text-sm text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              La carpeta está vacía o no contiene archivos
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {files.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-white/[0.03]"
                )}
              >
                {/* Extension badge */}
                <span
                  className="text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded min-w-[36px] text-center flex-shrink-0"
                  style={{
                    background: `${getExtColor(file.extension)} / 0.12`,
                    backgroundColor: `${getExtColor(file.extension)}1a`,
                    color: getExtColor(file.extension),
                    border: `1px solid ${getExtColor(file.extension)}33`,
                  }}
                >
                  {file.extension || "?"}
                </span>

                {/* Filename */}
                <span
                  className="flex-1 text-xs truncate font-mono"
                  style={{ color: "hsl(var(--foreground))" }}
                  title={file.name}
                >
                  {file.name}
                </span>

                {/* Size */}
                <span
                  className="text-xs flex-shrink-0 tabular-nums"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {formatFileSize(file.size)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
