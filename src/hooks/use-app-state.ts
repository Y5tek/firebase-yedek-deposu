import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define the structure of the data being collected across steps
interface RecordData {
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
  registrationDocument?: File | { name: string }; // Store File object or just info for persistence
  labelDocument?: File | { name: string }; // Store File object or just info for persistence
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


// Create the Zustand store with persistence
export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      branch: null,
      recordData: initialRecordData,

      setBranch: (branch) => set({ branch }),

      updateRecordData: (newData, reset = false) => {
        if (reset) {
           set({ recordData: { archive: get().recordData.archive } }); // Keep archive when resetting
        } else {
           // Filter out File objects before persisting
            const serializableNewData = Object.entries(newData).reduce((acc, [key, value]) => {
                if (!(value instanceof File)) {
                //@ts-ignore
                acc[key] = value;
                } else {
                 // Store basic file info instead of the File object
                 //@ts-ignore
                  acc[key] = { name: value.name, /* optionally add size, type */ };
                }
                return acc;
            }, {} as Partial<RecordData>);


            set((state) => ({
                recordData: { ...state.recordData, ...serializableNewData },
            }));
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
                registrationDocument: state.recordData.registrationDocument instanceof File
                    ? { name: state.recordData.registrationDocument.name }
                    : state.recordData.registrationDocument,
                labelDocument: state.recordData.labelDocument instanceof File
                    ? { name: state.recordData.labelDocument.name }
                    : state.recordData.labelDocument,
                 archive: state.recordData.archive // Persist archive
            }
        }),
    }
  )
);
