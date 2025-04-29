import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define the structure of the data being collected across steps
export interface RecordData {
  chassisNumber?: string;
  brand?: string;
  type?: string;
  tradeName?: string;
  owner?: string;
  typeApprovalNumber?: string;
  typeAndVariant?: string;
  additionalNotes?: string;
  inspectionDate?: string;
  inspectorName?: string;
  registrationDocument?: File | { name: string; type?: string; size?: number }; // Store File object or just info for persistence
  labelDocument?: File | { name: string; type?: string; size?: number }; // Store File object or just info for persistence
  archive?: any[]; // To store completed records temporarily (replace with DB)
}

// Define the state structure
interface AppState {
  branch: string | null;
  recordData: RecordData;
  setBranch: (branch: string | null) => void;
  updateRecordData: (newData: Partial<RecordData>, reset?: boolean) => void; // Add reset flag
  resetRecordData: () => void; // Explicit reset function
}

const initialRecordData: RecordData = {
    archive: [], // Initialize archive array
};


// Helper function to get serializable file info
const getSerializableFileInfo = (file: File | { name: string; type?: string; size?: number } | undefined | null): { name: string; type?: string; size?: number } | undefined => {
    if (file instanceof File) {
        return { name: file.name, type: file.type, size: file.size };
    } else if (typeof file === 'object' && file !== null && 'name' in file) {
        return file; // Already serializable info
    }
    return undefined; // Not a file or file info
};


// Create the Zustand store with persistence
export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      branch: null,
      recordData: initialRecordData,

      setBranch: (branch) => set({ branch }),

      updateRecordData: (newData, reset = false) => {
        if (reset) {
           // Keep archive, reset the rest
           set({ recordData: { archive: get().recordData.archive } });
        } else {
           set((state) => {
             // Merge new data, prioritizing File objects if newData provides them
             const mergedData = { ...state.recordData, ...newData };

              // Ensure files are handled correctly (keep File object if present, otherwise keep existing info)
              if (newData.registrationDocument === undefined && 'registrationDocument' in newData) {
                  // If explicitly set to undefined, remove it
                   delete mergedData.registrationDocument;
              } else if (!(newData.registrationDocument instanceof File) && state.recordData.registrationDocument instanceof File) {
                   // If new data is not a File, but old state had a File, keep the old File
                   mergedData.registrationDocument = state.recordData.registrationDocument;
              }

              if (newData.labelDocument === undefined && 'labelDocument' in newData) {
                  delete mergedData.labelDocument;
              } else if (!(newData.labelDocument instanceof File) && state.recordData.labelDocument instanceof File) {
                  mergedData.labelDocument = state.recordData.labelDocument;
              }


             return { recordData: mergedData };
           });
        }
       },
        resetRecordData: () => set({ recordData: { archive: get().recordData.archive } }), // Keep archive on explicit reset
    }),
    {
      name: 'arsiv-asistani-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Use localStorage
       partialize: (state) => ({
            branch: state.branch,
            // Only persist serializable parts of recordData
             recordData: {
                ...state.recordData,
                // Convert File objects to serializable info before saving
                registrationDocument: getSerializableFileInfo(state.recordData.registrationDocument),
                labelDocument: getSerializableFileInfo(state.recordData.labelDocument),
                 archive: state.recordData.archive // Persist archive
            }
        }),
        // When rehydrating, keep File objects if they exist in the runtime state
         // This prevents overwriting a File object with just its info from storage
        // Note: This merge logic is complex; consider simpler state structures if possible.
         merge: (persistedState, currentState) => {
            const typedPersistedState = persistedState as Partial<AppState>; // Type assertion
            const merged: AppState = {
                ...currentState, // Start with current runtime state
                ...typedPersistedState, // Overwrite with persisted non-File data
                recordData: {
                    ...currentState.recordData, // Start with current runtime recordData
                    ...typedPersistedState.recordData, // Overwrite with persisted recordData
                    // Restore File objects if they exist in current state but only info in persisted
                     registrationDocument: currentState.recordData.registrationDocument instanceof File
                        ? currentState.recordData.registrationDocument
                        : typedPersistedState.recordData?.registrationDocument,
                     labelDocument: currentState.recordData.labelDocument instanceof File
                        ? currentState.recordData.labelDocument
                        : typedPersistedState.recordData?.labelDocument,
                    archive: typedPersistedState.recordData?.archive ?? currentState.recordData.archive ?? [], // Ensure archive is an array
                },
            };
            return merged;
        },
    }
  )
);
