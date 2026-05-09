import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  AppStep,
  FileEntry,
  FolderInfo,
  DestinationFolder,
  RenameProposal,
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

  // Proposals
  proposals: RenameProposal[];
  setProposals: (proposals: RenameProposal[]) => void;
  updateProposal: (fileId: string, proposedName: string) => void;

  // Apply result
  applyResult: ApplyResult | null;
  setApplyResult: (result: ApplyResult | null) => void;

  // Loading states
  isLoadingFiles: boolean;
  isApplying: boolean;
  applyProgress: number;
  setIsLoadingFiles: (v: boolean) => void;
  setIsApplying: (v: boolean) => void;
  setApplyProgress: (v: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  step: "idle" as AppStep,
  sourceFolder: null,
  destinationFolder: null,
  files: [],
  proposals: [],
  applyResult: null,
  isLoadingFiles: false,
  isApplying: false,
  applyProgress: 0,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setSourceFolder: (sourceFolder) => set({ sourceFolder }),
      setDestinationFolder: (destinationFolder) => set({ destinationFolder }),

      setFiles: (files) => set({ files }),

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
      setIsApplying: (isApplying) => set({ isApplying }),
      setApplyProgress: (applyProgress) => set({ applyProgress }),

      reset: () => set(initialState),
    }),
    { name: "renombraitor-store" }
  )
);
