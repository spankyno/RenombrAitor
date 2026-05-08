"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { getExtension } from "@/types";
import type { FileEntry } from "@/types";

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function useFileSystem() {
  const {
    setSourceFolder,
    setDestinationFolder,
    setFiles,
    setStep,
    setIsLoadingFiles,
  } = useAppStore();

  // ── Select source folder (read-write so we can create subdir inside) ──────
  const selectSourceFolder = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      throw new Error("Tu navegador no soporta File System Access API. Usa Chrome o Edge.");
    }

    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await window.showDirectoryPicker({
        mode: "readwrite",   // need write to create the _Renamed subfolder
        id: "source-folder",
        startIn: "documents",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      throw err;
    }

    setIsLoadingFiles(true);
    try {
      setSourceFolder({ name: dirHandle.name, handle: dirHandle });

      // Pre-create destination folder inside source: "<FolderName>_Renamed"
      // If it already exists we just reuse it (idempotent).
      const destName = `${dirHandle.name}_Renamed`;
      const destHandle = await dirHandle.getDirectoryHandle(destName, { create: true });
      setDestinationFolder({ name: destName, handle: destHandle });

      // Scan files — skip the destination subfolder itself
      const files = await scanDirectory(dirHandle, destName);
      setFiles(files);
      setStep("folder-selected");
    } finally {
      setIsLoadingFiles(false);
    }
  }, [setSourceFolder, setDestinationFolder, setFiles, setStep, setIsLoadingFiles]);

  // ── Apply renames: sequential for…of with rate limiting ──────────────────
  // No Promise.all — processes one file at a time to avoid overwhelming
  // the filesystem and to keep progress reporting smooth.
  const applyRenames = useCallback(
    async (
      files: FileEntry[],
      proposals: Array<{ fileId: string; proposedName: string }>,
      destHandle: FileSystemDirectoryHandle,
      onProgress?: (done: number, total: number) => void
    ) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ file: string; error: string }>,
      };

      const total = proposals.length;

      for (const proposal of proposals) {
        const file = files.find((f) => f.id === proposal.fileId);

        if (!file) {
          results.failed++;
          results.errors.push({ file: proposal.fileId, error: "Archivo no encontrado" });
          results.success + results.failed; // keep counter in sync
          onProgress?.(results.success + results.failed, total);
          continue;
        }

        try {
          const sourceFile = await file.handle.getFile();
          const buffer = await sourceFile.arrayBuffer();

          const destFileHandle = await destHandle.getFileHandle(proposal.proposedName, { create: true });
          const writable = await destFileHandle.createWritable();
          await writable.write(buffer);
          await writable.close();

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            file: file.name,
            error: err instanceof Error ? err.message : "Error desconocido",
          });
        }

        onProgress?.(results.success + results.failed, total);
      }

      return results;
    },
    []
  );

  return { selectSourceFolder, applyRenames, isSupported: isFileSystemAccessSupported() };
}

// ── Directory scanner — skips the _Renamed subfolder ────────────────────────
async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  skipFolder: string
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  let counter = 0;

  for await (const entry of handle.values()) {
    if (entry.kind === "directory" && entry.name === skipFolder) continue;
    if (entry.kind === "file") {
      const fileHandle = entry as FileSystemFileHandle;
      try {
        const file = await fileHandle.getFile();
        files.push({
          id: `file-${counter++}`,
          name: file.name,
          extension: getExtension(file.name),
          size: file.size,
          handle: fileHandle,
          lastModified: file.lastModified,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}
