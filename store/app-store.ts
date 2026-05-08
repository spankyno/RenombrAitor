import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DEFAULT_PROVIDER, type ProviderId } from "@/lib/ai-providers";
import type {
  AppStep,
  FileEntry,
  FolderInfo,
  DestinationFolder,
  RenameProposal,
  ChatMessage,
  ApplyResult,
} from "@/types";

interface AppState {
  // Steps
  step: AppStep;
  setStep: (step: AppStep) => void;

  // Folders
  sourceFolder: FolderInfo | null;
  destinationFolder: DestinationFolder | null;
  setSourceFolder: (folder: FolderInfo | null) => void;
  setDestinationFolder: (folder: DestinationFolder | null) => void;

  // Files
  files: FileEntry[];
  setFiles: (files: FileEntry[]) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, isLoading?: boolean) => void;
  clearMessages: () => void;

  // Proposals
  proposals: RenameProposal[];
  setProposals: (proposals: RenameProposal[]) => void;
  updateProposal: (fileId: string, proposedName: string) => void;

  // Apply result
  applyResult: ApplyResult | null;
  setApplyResult: (result: ApplyResult | null) => void;

  // Selected AI provider
  providerId: ProviderId;
  setProviderId: (id: ProviderId) => void;

  // Loading states
  isLoadingFiles: boolean;
  isGenerating: boolean;
  isApplying: boolean;
  applyProgress: number;
  setIsLoadingFiles: (v: boolean) => void;
  setIsGenerating: (v: boolean) => void;
  setIsApplying: (v: boolean) => void;
  setApplyProgress: (v: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  step: "idle" as AppStep,
  providerId: DEFAULT_PROVIDER as ProviderId,
  sourceFolder: null,
  destinationFolder: null,
  files: [],
  messages: [],
  proposals: [],
  applyResult: null,
  isLoadingFiles: false,
  isGenerating: false,
  isApplying: false,
  applyProgress: 0,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setProviderId: (providerId) => set({ providerId }),

      setSourceFolder: (sourceFolder) => set({ sourceFolder }),
      setDestinationFolder: (destinationFolder) => set({ destinationFolder }),

      setFiles: (files) => set({ files }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      updateLastMessage: (content, isLoading = false) =>
        set((state) => {
          const msgs = [...state.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content,
              isLoading,
            };
          }
          return { messages: msgs };
        }),

      clearMessages: () => set({ messages: [] }),

      setProposals: (proposals) => set({ proposals }),

      updateProposal: (fileId, proposedName) =>
        set((state) => ({
          proposals: state.proposals.map((p) =>
            p.fileId === fileId
              ? { ...p, proposedName, isEdited: true }
              : p
          ),
        })),

      setApplyResult: (applyResult) => set({ applyResult }),

      setIsLoadingFiles: (isLoadingFiles) => set({ isLoadingFiles }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setIsApplying: (isApplying) => set({ isApplying }),
      setApplyProgress: (applyProgress) => set({ applyProgress }),

      reset: () => set(initialState),
    }),
    { name: "renombraitor-store" }
  )
);
