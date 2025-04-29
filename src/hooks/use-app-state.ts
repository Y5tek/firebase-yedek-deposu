
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSerializableFileInfo } from '@/lib/utils'; // Import helper

// Define the structure for an item in the offer form table
export interface OfferItem {
  id: string; // Unique ID for react key prop
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number; // Often calculated automatically
}

// Define the structure of the data being collected across steps
export interface RecordData {
  // Step 1 & 2 Fields
  chassisNumber?: string;
  brand?: string;
  type?: string; // Renamed from "tipi" if needed
  tradeName?: string;
  owner?: string;
  typeApprovalNumber?: string;
  typeAndVariant?: string;
  // plateNumber?: string; // Removed plateNumber field

  // Step 3 Files
  registrationDocument?: File | { name: string; type?: string; size?: number };
  labelDocument?: File | { name: string; type?: string; size?: number };
  additionalPhotos?: (File | { name: string; type?: string; size?: number })[];
  additionalVideos?: (File | { name: string; type?: string; size?: number })[];

  // Step 4 Form Fields (Seri Tadilat Uygunluk Formu)
  customerName?: string; // Changed from inspectionCustomerName for consistency
  formDate?: string; // Store as ISO string (Seri Tadilat Uygunluk Formu Date)
  sequenceNo?: string; // Seri Tadilat Uygunluk Formu Sequence No
  q1_suitable?: 'olumlu' | 'olumsuz';
  q2_typeApprovalMatch?: 'olumlu' | 'olumsuz';
  q3_scopeExpansion?: 'olumlu' | 'olumsuz';
  q4_unaffectedPartsDefect?: 'olumlu' | 'olumsuz';
  notes?: string; // Seri Tadilat Uygunluk Formu Notes
  controllerName?: string; // Seri Tadilat Uygunluk Formu Controller
  authorityName?: string; // Seri Tadilat Uygunluk Formu Authority

  // Step 5 Form Fields (Teklif Formu - Offer Form)
  offerAuthorizedName?: string; // Teklif Vermeye Yetkili Kişinin Adı ve Soyadı
  offerCompanyName?: string; // Teklif Firma Adı
  offerCompanyAddress?: string; // Teklif Açık Adresi
  offerTaxOfficeAndNumber?: string; // Teklif Vergi Dairesi ve Vergi Numarası
  offerPhoneNumber?: string; // Teklif Telefon Numarası
  offerEmailAddress?: string; // Teklif Elektronik Posta Adresi
  offerDate?: string; // Teklif Tarihi (Store as ISO string)
  offerItems?: OfferItem[]; // Array for items in the table
  offerAcceptance?: 'accepted' | 'rejected'; // Teklif Kabul Durumu

  // Archive specific fields (added during final submission)
  archive?: any[]; // To store completed records temporarily (replace with DB)
  archivedAt?: string; // Added when archiving
  fileName?: string; // Added when archiving

  // Keep old additional fields if they are still relevant from previous versions
  additionalNotes?: string; // Might be replaced by 'notes' field
  inspectionDate?: string; // Might be replaced by 'formDate'
  inspectorName?: string; // Might be replaced by 'controllerName' or 'authorityName'
}

// Define the state structure
interface AppState {
  branch: string | null;
  recordData: RecordData;
  setBranch: (branch: string | null) => void;
  updateRecordData: (newData: Partial<RecordData>, reset?: boolean) => void; // Add reset flag
  resetRecordData: () => void; // Explicit reset function
}

// Default initial state for a single OfferItem
const defaultOfferItem: OfferItem = {
  id: Math.random().toString(36).substring(2, 15), // Simple unique ID
  itemName: '',
  quantity: undefined,
  unitPrice: undefined,
  totalPrice: undefined, // Should likely be calculated
};

const initialRecordData: RecordData = {
    // Step 4 Defaults
    sequenceNo: '3', // Default SIRA to 3 based on image
    q1_suitable: 'olumlu', // Default checklist items to 'olumlu'
    q2_typeApprovalMatch: 'olumlu',
    q3_scopeExpansion: 'olumlu',
    q4_unaffectedPartsDefect: 'olumlu',
    // Step 5 Defaults
    offerCompanyName: 'ÖZ ÇAĞRI DİZAYN OTO MÜHENDİSLİK', // Prefill from image
    offerTaxOfficeAndNumber: 'TEPECİK / 662 081 45 97', // Prefill from image
    offerItems: [
      { ...defaultOfferItem, id: Math.random().toString(36).substring(2, 15) }, // Start with one empty item row
    ],
    offerAcceptance: 'accepted', // Default acceptance
    // General Defaults
    archive: [], // Initialize archive array
    additionalPhotos: [], // Initialize photos array
    additionalVideos: [], // Initialize videos array
    // plateNumber: '', // Initialize plateNumber - removed
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
           // Keep archive, reset the rest, including file arrays and new form fields
           set({ recordData: {
                archive: get().recordData.archive,
                // Reset to initial defaults
                ...initialRecordData,
                 // Explicitly reset fields not in initialRecordData to undefined if needed
                 chassisNumber: undefined,
                 brand: undefined,
                 type: undefined,
                 tradeName: undefined,
                 owner: undefined,
                 typeApprovalNumber: undefined,
                 typeAndVariant: undefined,
                 // plateNumber: undefined, // Removed plateNumber reset
                 registrationDocument: undefined,
                 labelDocument: undefined,
                 customerName: undefined, // Step 4
                 formDate: undefined, // Step 4 date
                 notes: undefined, // Step 4 notes
                 controllerName: undefined, // Step 4
                 authorityName: undefined, // Step 4
                 offerAuthorizedName: undefined, // Step 5
                 offerCompanyAddress: undefined, // Step 5
                 offerPhoneNumber: undefined, // Step 5
                 offerEmailAddress: undefined, // Step 5
                 offerDate: undefined, // Step 5 date
                 offerAcceptance: 'accepted', // Reset Step 5 acceptance
                 // Reset old fields
                 additionalNotes: undefined,
                 inspectionDate: undefined,
                 inspectorName: undefined,
            } });
        } else {
           set((state) => {
             // Merge new data, prioritizing File objects if newData provides them
             const mergedData = { ...state.recordData, ...newData };

              // Ensure individual files are handled correctly (clearing or preserving File objects)
              if (newData.registrationDocument === undefined && 'registrationDocument' in newData) {
                   delete mergedData.registrationDocument;
              } else if (newData.registrationDocument && !(newData.registrationDocument instanceof File) && state.recordData.registrationDocument instanceof File) {
                  // If newData provides info but state has File, keep File (unless explicitly cleared)
                   mergedData.registrationDocument = state.recordData.registrationDocument;
              } else if (newData.registrationDocument instanceof File) {
                   mergedData.registrationDocument = newData.registrationDocument;
              }


              if (newData.labelDocument === undefined && 'labelDocument' in newData) {
                  delete mergedData.labelDocument;
              } else if (newData.labelDocument && !(newData.labelDocument instanceof File) && state.recordData.labelDocument instanceof File) {
                   mergedData.labelDocument = state.recordData.labelDocument;
              } else if (newData.labelDocument instanceof File) {
                    mergedData.labelDocument = newData.labelDocument;
              }


              // Handle file arrays: merge File objects correctly
                if (newData.additionalPhotos) {
                    mergedData.additionalPhotos = mergeFileArrays(state.recordData.additionalPhotos, newData.additionalPhotos);
                } else if (state.recordData.additionalPhotos && !('additionalPhotos' in newData)) {
                    // If newData doesn't mention photos, keep the existing ones
                    mergedData.additionalPhotos = state.recordData.additionalPhotos;
                } else if ('additionalPhotos' in newData && !newData.additionalPhotos) {
                    // If newData explicitly sets photos to null/undefined, clear it
                    mergedData.additionalPhotos = [];
                }


                if (newData.additionalVideos) {
                     mergedData.additionalVideos = mergeFileArrays(state.recordData.additionalVideos, newData.additionalVideos);
                } else if (state.recordData.additionalVideos && !('additionalVideos' in newData)) {
                     mergedData.additionalVideos = state.recordData.additionalVideos;
                } else if ('additionalVideos' in newData && !newData.additionalVideos) {
                     mergedData.additionalVideos = [];
                }

                // Ensure offerItems is always an array
                if (newData.offerItems && Array.isArray(newData.offerItems)) {
                    mergedData.offerItems = newData.offerItems;
                } else if (state.recordData.offerItems && !('offerItems' in newData)) {
                     mergedData.offerItems = state.recordData.offerItems;
                } else if ('offerItems' in newData && !newData.offerItems) {
                    mergedData.offerItems = [];
                }


             return { recordData: mergedData };
           });
        }
       },
        resetRecordData: () => {
             // Keep archive, reset everything else to initial defaults
             set({ recordData: {
                 archive: get().recordData.archive,
                 ...initialRecordData,
                 // Explicitly reset fields not in initialRecordData to undefined if needed
                 chassisNumber: undefined,
                 brand: undefined,
                 type: undefined,
                 tradeName: undefined,
                 owner: undefined,
                 typeApprovalNumber: undefined,
                 typeAndVariant: undefined,
                 // plateNumber: undefined, // Removed plateNumber reset
                 registrationDocument: undefined,
                 labelDocument: undefined,
                 customerName: undefined, // Step 4
                 formDate: undefined, // Step 4 date
                 notes: undefined, // Step 4 notes
                 controllerName: undefined, // Step 4
                 authorityName: undefined, // Step 4
                 offerAuthorizedName: undefined, // Step 5
                 offerCompanyAddress: undefined, // Step 5
                 offerPhoneNumber: undefined, // Step 5
                 offerEmailAddress: undefined, // Step 5
                 offerDate: undefined, // Step 5 date
                 offerAcceptance: 'accepted', // Reset Step 5 acceptance
                 // Reset old fields
                 additionalNotes: undefined,
                 inspectionDate: undefined,
                 inspectorName: undefined,
             } });
        },
    }),
    {
      name: 'arsiv-asistani-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Use localStorage
       partialize: (state) => ({
            branch: state.branch,
            // Only persist serializable parts of recordData
             recordData: {
                 // Persist all non-File fields from Steps 1-4
                 chassisNumber: state.recordData.chassisNumber,
                 brand: state.recordData.brand,
                 type: state.recordData.type,
                 tradeName: state.recordData.tradeName,
                 owner: state.recordData.owner,
                 typeApprovalNumber: state.recordData.typeApprovalNumber,
                 typeAndVariant: state.recordData.typeAndVariant,
                 // plateNumber: state.recordData.plateNumber, // Removed plateNumber persistence
                 customerName: state.recordData.customerName, // Step 4
                 formDate: state.recordData.formDate, // Step 4 date
                 sequenceNo: state.recordData.sequenceNo, // Step 4
                 q1_suitable: state.recordData.q1_suitable, // Step 4
                 q2_typeApprovalMatch: state.recordData.q2_typeApprovalMatch, // Step 4
                 q3_scopeExpansion: state.recordData.q3_scopeExpansion, // Step 4
                 q4_unaffectedPartsDefect: state.recordData.q4_unaffectedPartsDefect, // Step 4
                 notes: state.recordData.notes, // Step 4 notes
                 controllerName: state.recordData.controllerName, // Step 4
                 authorityName: state.recordData.authorityName, // Step 4

                 // Persist Step 5 Fields
                 offerAuthorizedName: state.recordData.offerAuthorizedName,
                 offerCompanyName: state.recordData.offerCompanyName,
                 offerCompanyAddress: state.recordData.offerCompanyAddress,
                 offerTaxOfficeAndNumber: state.recordData.offerTaxOfficeAndNumber,
                 offerPhoneNumber: state.recordData.offerPhoneNumber,
                 offerEmailAddress: state.recordData.offerEmailAddress,
                 offerDate: state.recordData.offerDate, // Step 5 Date
                 offerItems: state.recordData.offerItems, // Step 5 Items (already serializable)
                 offerAcceptance: state.recordData.offerAcceptance, // Step 5 Acceptance

                 // Persist legacy fields
                 additionalNotes: state.recordData.additionalNotes,
                 inspectionDate: state.recordData.inspectionDate,
                 inspectorName: state.recordData.inspectorName,

                 // Convert File objects to serializable info before saving
                 registrationDocument: getSerializableFileInfo(state.recordData.registrationDocument),
                 labelDocument: getSerializableFileInfo(state.recordData.labelDocument),
                 additionalPhotos: state.recordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined, // Ensure array is correctly typed
                 additionalVideos: state.recordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined, // Ensure array is correctly typed
                 archive: state.recordData.archive // Persist archive
            }
        }),
        // When rehydrating, merge persisted data with current runtime state, preserving File objects
        merge: (persistedState, currentState) => {
            const typedPersistedState = persistedState as Partial<AppState>; // Type assertion

             const mergedRecordData = {
                 ...initialRecordData, // Start with initial defaults
                 ...currentState.recordData, // Then apply current runtime recordData
                 ...(typedPersistedState.recordData || {}), // Finally, overwrite with persisted recordData (non-file fields)

                 // Restore File objects if they exist in current state but only info in persisted
                  registrationDocument: currentState.recordData.registrationDocument instanceof File
                      ? currentState.recordData.registrationDocument
                      : typedPersistedState.recordData?.registrationDocument, // Use persisted info if no File exists
                  labelDocument: currentState.recordData.labelDocument instanceof File
                      ? currentState.recordData.labelDocument
                      : typedPersistedState.recordData?.labelDocument, // Use persisted info if no File exists

                  // Restore File arrays - merge current File objects with persisted info
                  additionalPhotos: mergeFileArrays(currentState.recordData.additionalPhotos, typedPersistedState.recordData?.additionalPhotos),
                  additionalVideos: mergeFileArrays(currentState.recordData.additionalVideos, typedPersistedState.recordData?.additionalVideos),

                  archive: typedPersistedState.recordData?.archive ?? currentState.recordData.archive ?? [], // Ensure archive is an array
                  offerItems: typedPersistedState.recordData?.offerItems ?? currentState.recordData.offerItems ?? [], // Ensure offerItems is an array
             };

             // Ensure essential fields are present, falling back to initial state if necessary
             mergedRecordData.archive = mergedRecordData.archive || [];
             mergedRecordData.additionalPhotos = mergedRecordData.additionalPhotos || [];
             mergedRecordData.additionalVideos = mergedRecordData.additionalVideos || [];
             mergedRecordData.offerItems = mergedRecordData.offerItems || [{ ...defaultOfferItem, id: Math.random().toString(36).substring(2, 15) }];
             // mergedRecordData.plateNumber = mergedRecordData.plateNumber || ''; // Ensure plateNumber is initialized - removed

            const merged: AppState = {
                ...currentState, // Start with current runtime state
                ...(typedPersistedState || {}), // Overwrite with persisted non-recordData fields
                recordData: mergedRecordData as RecordData, // Ensure the final type is RecordData
            };
            return merged;
        },
    }
  )
);


// Helper function to merge file arrays during rehydration and updates
function mergeFileArrays(
    currentFiles: (File | { name: string; type?: string; size?: number })[] | undefined,
    newFilesOrInfo: (File | { name: string; type?: string; size?: number })[] | undefined
): (File | { name: string; type?: string; size?: number })[] {
    const mergedMap = new Map<string, File | { name: string; type?: string; size?: number }>();

    // Add current files (prioritize File objects)
    currentFiles?.forEach(f => {
        if (f instanceof File) {
            mergedMap.set(`${f.name}-${f.size}`, f); // Use name and size as key for uniqueness
        } else if (f && f.name) {
            // If it's info, add it only if a File with the same key doesn't exist
            const key = `${f.name}-${f.size ?? ''}`;
            if (!mergedMap.has(key) || !(mergedMap.get(key) instanceof File)) {
                 mergedMap.set(key, f);
            }
        }
    });

     // Add new files or info (prioritize File objects)
     newFilesOrInfo?.forEach(f => {
         if (f instanceof File) {
             mergedMap.set(`${f.name}-${f.size}`, f); // Overwrite info with File object if present
         } else if (f && f.name) {
            // If it's info, add it only if a File with the same key doesn't exist
            const key = `${f.name}-${f.size ?? ''}`;
             if (!mergedMap.has(key) || !(mergedMap.get(key) instanceof File)) {
                 mergedMap.set(key, f);
             }
         }
     });

    return Array.from(mergedMap.values());
}
