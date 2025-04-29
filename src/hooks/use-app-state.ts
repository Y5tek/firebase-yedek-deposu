
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSerializableFileInfo } from '@/lib/utils'; // Import helper

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
  additionalPhotos?: (File | { name: string; type?: string; size?: number })[]; // Array for additional photos
  additionalVideos?: (File | { name: string; type?: string; size?: number })[]; // Array for additional videos
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
    additionalPhotos: [], // Initialize photos array
    additionalVideos: [], // Initialize videos array
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
           // Keep archive, reset the rest, including file arrays
           set({ recordData: { archive: get().recordData.archive, additionalPhotos: [], additionalVideos: [] } });
        } else {
           set((state) => {
             // Merge new data, prioritizing File objects if newData provides them
             const mergedData = { ...state.recordData, ...newData };

              // Ensure individual files are handled correctly
              if (newData.registrationDocument === undefined && 'registrationDocument' in newData) {
                   delete mergedData.registrationDocument;
              } else if (!(newData.registrationDocument instanceof File) && state.recordData.registrationDocument instanceof File) {
                   mergedData.registrationDocument = state.recordData.registrationDocument;
              }

              if (newData.labelDocument === undefined && 'labelDocument' in newData) {
                  delete mergedData.labelDocument;
              } else if (!(newData.labelDocument instanceof File) && state.recordData.labelDocument instanceof File) {
                  mergedData.labelDocument = state.recordData.labelDocument;
              }

              // Handle file arrays: ensure new files are added correctly, preserve existing Files
              if (newData.additionalPhotos) {
                const existingFiles = (state.recordData.additionalPhotos || []).filter(f => f instanceof File);
                const newFiles = (newData.additionalPhotos).filter(f => f instanceof File);
                // Combine existing File objects with new File objects, avoiding duplicates based on name/size
                 const combinedFiles = [...existingFiles];
                 newFiles.forEach(newFile => {
                     if (!combinedFiles.some(ef => ef.name === newFile.name && ef.size === newFile.size)) {
                         combinedFiles.push(newFile);
                     }
                 });
                mergedData.additionalPhotos = combinedFiles;
              } else if (state.recordData.additionalPhotos) {
                  // If newData doesn't provide photos, keep existing File objects
                  mergedData.additionalPhotos = state.recordData.additionalPhotos.filter(f => f instanceof File);
              }

              if (newData.additionalVideos) {
                  const existingFiles = (state.recordData.additionalVideos || []).filter(f => f instanceof File);
                  const newFiles = (newData.additionalVideos).filter(f => f instanceof File);
                  const combinedFiles = [...existingFiles];
                  newFiles.forEach(newFile => {
                      if (!combinedFiles.some(ef => ef.name === newFile.name && ef.size === newFile.size)) {
                          combinedFiles.push(newFile);
                      }
                  });
                  mergedData.additionalVideos = combinedFiles;
              } else if (state.recordData.additionalVideos) {
                  mergedData.additionalVideos = state.recordData.additionalVideos.filter(f => f instanceof File);
              }


             return { recordData: mergedData };
           });
        }
       },
        resetRecordData: () => set({ recordData: { archive: get().recordData.archive, additionalPhotos: [], additionalVideos: [] } }), // Keep archive on explicit reset
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
                additionalPhotos: state.recordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[], // Ensure array is correctly typed
                additionalVideos: state.recordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[], // Ensure array is correctly typed
                archive: state.recordData.archive // Persist archive
            }
        }),
        // When rehydrating, keep File objects if they exist in the runtime state
        merge: (persistedState, currentState) => {
            const typedPersistedState = persistedState as Partial<AppState>; // Type assertion
             const mergedRecordData = {
                 ...currentState.recordData, // Start with current runtime recordData
                 ...(typedPersistedState.recordData || {}), // Overwrite with persisted recordData (non-file fields)
                 // Restore File objects if they exist in current state but only info in persisted
                  registrationDocument: currentState.recordData.registrationDocument instanceof File
                      ? currentState.recordData.registrationDocument
                      : typedPersistedState.recordData?.registrationDocument,
                  labelDocument: currentState.recordData.labelDocument instanceof File
                      ? currentState.recordData.labelDocument
                      : typedPersistedState.recordData?.labelDocument,
                  // Restore File arrays - merge persisted info with current File objects
                  additionalPhotos: mergeFileArrays(currentState.recordData.additionalPhotos, typedPersistedState.recordData?.additionalPhotos),
                  additionalVideos: mergeFileArrays(currentState.recordData.additionalVideos, typedPersistedState.recordData?.additionalVideos),
                  archive: typedPersistedState.recordData?.archive ?? currentState.recordData.archive ?? [], // Ensure archive is an array
             };

            const merged: AppState = {
                ...currentState, // Start with current runtime state
                ...(typedPersistedState || {}), // Overwrite with persisted non-recordData fields
                recordData: mergedRecordData,
            };
            return merged;
        },
    }
  )
);


// Helper function to merge file arrays during rehydration
function mergeFileArrays(
    currentFiles: (File | { name: string })[] | undefined,
    persistedFiles: { name: string }[] | undefined
): (File | { name: string })[] {
    const merged: (File | { name: string })[] = [];
    const currentFileMap = new Map<string, File>();

    // Add current File objects to map
    currentFiles?.forEach(f => {
        if (f instanceof File) {
            currentFileMap.set(f.name, f);
            merged.push(f); // Add File object directly
        }
    });

    // Add persisted file info only if a File object with the same name doesn't exist
    persistedFiles?.forEach(pf => {
        if (!currentFileMap.has(pf.name)) {
            merged.push(pf); // Add persisted info
        }
    });

    return merged;
}
