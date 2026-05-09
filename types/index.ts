// File System types
export interface FileEntry {
  id: string;
  name: string;
  extension: string;
  size: number;
  handle: FileSystemFileHandle;
  lastModified?: number;
}

export interface RenameProposal {
  fileId: string;
  originalName: string;
  proposedName: string;
  isEdited?: boolean;
  hasConflict?: boolean;
}

// Chat types
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export type AppStep = "idle" | "folder-selected" | "preview" | "applying" | "done";

export interface FolderInfo {
  name: string;
  handle: FileSystemDirectoryHandle;
  parentHandle?: FileSystemDirectoryHandle;
}

export interface DestinationFolder {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export interface ApplyResult {
  success: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Sanitize filename
export function sanitizeFileName(name: string): string {
  // Remove invalid characters for Windows/Mac/Linux
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
}

// Get file extension
export function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length <= 1) return "";
  return parts[parts.length - 1].toLowerCase();
}

// Get filename without extension
export function getBaseName(filename: string): string {
  const ext = getExtension(filename);
  if (!ext) return filename;
  return filename.slice(0, -(ext.length + 1));
}
