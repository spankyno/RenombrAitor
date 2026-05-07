"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { getExtension } from "@/types";
import type { FileEntry } from "@/types";

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// IndexedDB key for persisting handles (note: handles can't actually be serialized,
// but we store folder names for UI state recovery)
const DB_NAME = "renombraitor-db";
const STORE_NAME = "folder-handles";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHandleName(key: string, name: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(name, key);
  } catch {
    // Silently fail - IndexedDB is optional
  }
}

export function useFileSystem() {
  const {
    setSourceFolder,
    setDestinationFolder,
    setFiles,
    setStep,
    setIsLoadingFiles,
  } = useAppStore();

  const selectSourceFolder = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      throw new Error(
        "Tu navegador no soporta File System Access API. Usa Chrome o Edge."
      );
    }

    // Open the folder picker
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await window.showDirectoryPicker({
        mode: "read",
        id: "source-folder",
        startIn: "documents",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return; // User cancelled
      throw err;
    }

    setIsLoadingFiles(true);

    try {
      // Try to get parent handle for creating destination folder
      // Note: FileSystemDirectoryHandle doesn't expose parent directly,
      // we need to request write access on the parent — we'll use a workaround
      // by asking the user to select the parent later if needed.
      setSourceFolder({
        name: dirHandle.name,
        handle: dirHandle,
      });

      // Scan files
      const files = await scanDirectory(dirHandle);
      setFiles(files);
      setStep("folder-selected");

      await saveHandleName("source", dirHandle.name);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [setSourceFolder, setFiles, setStep, setIsLoadingFiles]);

  const createDestinationFolder = useCallback(
    async (
      sourceHandle: FileSystemDirectoryHandle,
      preferredName: string = "Destino-RenombrAitor"
    ): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> => {
      // We need write access to the *parent* of sourceHandle
      // Since FSAPI doesn't give us the parent, we ask the user to pick the parent
      // In practice: we ask for the parent directory to create sibling folder

      let parentHandle: FileSystemDirectoryHandle;
      try {
        parentHandle = await window.showDirectoryPicker({
          mode: "readwrite",
          id: "parent-folder",
          startIn: "documents",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return null;
        throw err;
      }

      // Verify the selected folder contains our source folder
      let foundSource = false;
      for await (const [name] of parentHandle.entries()) {
        if (name === sourceHandle.name) {
          foundSource = true;
          break;
        }
      }

      if (!foundSource) {
        throw new Error(
          `La carpeta seleccionada no contiene "${sourceHandle.name}". Por favor, selecciona la carpeta que contiene la carpeta origen.`
        );
      }

      // Try preferred name, fallback with timestamp
      let destName = preferredName;
      try {
        await parentHandle.getDirectoryHandle(destName, { create: false });
        // Already exists, add timestamp
        destName = `${preferredName}-${Date.now()}`;
      } catch {
        // Doesn't exist, good
      }

      const destHandle = await parentHandle.getDirectoryHandle(destName, {
        create: true,
      });

      setDestinationFolder({ name: destName, handle: destHandle });

      return { handle: destHandle, name: destName };
    },
    [setDestinationFolder]
  );

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

      for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];
        const file = files.find((f) => f.id === proposal.fileId);

        if (!file) {
          results.failed++;
          results.errors.push({
            file: proposal.fileId,
            error: "Archivo no encontrado",
          });
          continue;
        }

        try {
          // Read source file
          const sourceFile = await file.handle.getFile();
          const buffer = await sourceFile.arrayBuffer();

          // Write to destination with new name
          const destFileHandle = await destHandle.getFileHandle(
            proposal.proposedName,
            { create: true }
          );
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

        onProgress?.(i + 1, total);
      }

      return results;
    },
    []
  );

  return {
    selectSourceFolder,
    createDestinationFolder,
    applyRenames,
    isSupported: isFileSystemAccessSupported(),
  };
}

async function scanDirectory(handle: FileSystemDirectoryHandle): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  let counter = 0;

  for await (const entry of handle.values()) {
    if (entry.kind === "file") {
      const fileHandle = entry as FileSystemFileHandle;
      try {
        const file = await fileHandle.getFile();
        const ext = getExtension(file.name);

        files.push({
          id: `file-${counter++}`,
          name: file.name,
          extension: ext,
          size: file.size,
          handle: fileHandle,
          lastModified: file.lastModified,
        });
      } catch {
        // Skip files we can't read
      }
    }
  }

  // Sort alphabetically
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
