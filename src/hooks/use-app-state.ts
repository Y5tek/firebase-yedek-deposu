
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
  type?: string;
  tradeName?: string;
  owner?: string;
  plateNumber?: string; // Plate from Step 1 (Ruhsat)
  typeApprovalNumber?: string; // Added Tip Onay No
  typeAndVariant?: string; // Likely holds "VARYANT"
  versiyon?: string; // Added VERSİYON field
  engineNumber?: string; // Added Motor No

  // Step 3 Files
  registrationDocument?: File | { name: string; type?: string; size?: number };
  labelDocument?: File | { name: string; type?: string; size?: number };
  typeApprovalDocument?: File | { name: string; type?: string; size?: number }; // Added for "Tip Onay Belgesi"
  additionalPhotos?: (File | { name: string; type?: string; size?: number })[];
  additionalVideos?: (File | { name: string; type?: string; size?: number })[];

  // Step 4 Form Fields (Seri Tadilat Uygunluk Formu)
  customerName?: string; // Relevant for "MÜŞTERİ ADI"
  formDate?: string; // Store as ISO string (Relevant for "TARİH")
  sequenceNo?: string; // Relevant for "SIRA NO"
  q1_suitable?: 'olumlu' | 'olumsuz';
  q2_typeApprovalMatch?: 'olumlu' | 'olumsuz';
  q3_scopeExpansion?: 'olumlu' | 'olumsuz';
  q4_unaffectedPartsDefect?: 'olumlu' | 'olumsuz';
  notes?: string; // Seri Tadilat Uygunluk Formu Notes
  controllerName?: string; // Seri Tadilat Uygunluk Formu Controller
  authorityName?: string; // Seri Tadilat Uygunluk Formu Authority

  // Step 5 Form Fields (Teklif Formu - Offer Form) - Was İş Emri
  offerAuthorizedName?: string; // Previously in Step 6
  offerCompanyName?: string; // Previously in Step 6
  offerCompanyAddress?: string; // Previously in Step 6
  offerTaxOfficeAndNumber?: string; // Previously in Step 6
  offerPhoneNumber?: string; // Previously in Step 6
  offerEmailAddress?: string; // Previously in Step 6
  offerDate?: string; // ISO String // Previously in Step 6
  offerItems?: OfferItem[]; // Previously in Step 6
  offerAcceptance?: 'accepted' | 'rejected'; // Previously in Step 6
  // İş Emri fields moved here or merged if redundant
  projectName?: string; // Now Step 5 (PROJE ADI)
  plate?: string; // Plate from İş Emri Form (Now Step 5)
  workOrderNumber?: string; // (Now Step 5 - İş Emri No) - May overlap with sequenceNo
  workOrderDate?: string; // ISO String (Now Step 5 - İş Emri Tarihi)
  completionDate?: string; // ISO String (Now Step 5 - İşin Bitiş Tarihi)
  detailsOfWork?: string; // (Now Step 5 - YAPILACAK İŞLER)
  sparePartsUsed?: string; // (Now Step 5 - Yedek Parçalar)
  pricing?: string; // (Now Step 5 - Ücretlendirme)
  vehicleAcceptanceSignature?: string; // Placeholder (Now Step 5)
  customerSignature?: string; // Placeholder (Now Step 5)
  projectNo?: string; // (Now Step 5 - PROJE NO)


  // Step 6 Form Fields (Ara ve Son Kontrol Formu) - Previously Step 7
  finalCheckDate?: string; // ISO String (Could be "TARİH")
  check1_exposedParts_ara?: boolean;
  check1_exposedParts_son?: boolean;
  check2_isofixSeat_ara?: boolean;
  check2_isofixSeat_son?: boolean;
  check3_seatBelts_ara?: boolean;
  check3_seatBelts_son?: boolean;
  check4_windowApprovals_ara?: boolean;
  check4_windowApprovals_son?: boolean;
  finalControllerName?: string; // KONTROL EDEN Adı-Soyadı

  // Step 7 Summary Form Specific Fields (if not covered above) - Previously Step 8
  typeApprovalType?: string; // Added for "TİP ONAY"
  typeApprovalLevel?: string; // Added for "tip onay seviye"
  typeApprovalVersion?: string; // Added for "VERSİYON" (This might duplicate 'versiyon' above, decide which one to keep)

  // Archive specific fields (added during final submission)
  // Needs to match ArchiveEntry type structure in archive/page.tsx
  archive?: ArchiveEntry[]; // Store completed records
  archivedAt?: string; // Added when archiving
  fileName?: string; // Added when archiving

  // Keep old additional fields if they are still relevant from previous versions
  additionalNotes?: string; // Might be replaced by 'notes' field
  inspectionDate?: string; // Might be replaced by 'formDate' or 'workOrderDate'
  inspectorName?: string; // Might be replaced by 'controllerName' or 'authorityName' or 'finalControllerName'

  // Branch information associated with the record
  branch?: string | null;
}

// Define the Archive Entry structure based on RecordData + metadata
// Use Omit to exclude the 'archive' array itself from the entry being saved
// This needs to be kept in sync with the type definition in archive/page.tsx
export type ArchiveEntry = Omit<RecordData, 'archive'> & {
  archivedAt: string; // ISO string format
  fileName: string; // Unique identifier for the archived record
  // File info should be serializable
  registrationDocument?: { name: string; type?: string; size?: number };
  labelDocument?: { name: string; type?: string; size?: number };
  typeApprovalDocument?: { name: string; type?: string; size?: number };
  additionalPhotos?: { name: string; type?: string; size?: number }[];
  additionalVideos?: { name: string; type?: string; size?: number }[];
}


// Define the state structure
interface AppState {
  branch: string | null; // Still relevant for "ŞUBE ADI"
  recordData: RecordData;
  editingArchiveId: string | null; // ID of the archive entry being edited
  setBranch: (branch: string | null) => void;
  updateRecordData: (newData: Partial<RecordData>, options?: { reset?: boolean, editingId?: string | null }) => void; // Add options object
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

const initialRecordData: Omit<RecordData, 'branch' | 'archive'> = { // Exclude archive and branch from initial data defaults
    // Step 4 Defaults
    sequenceNo: '3', // Default SIRA to 3 based on image
    q1_suitable: 'olumlu', // Default checklist items to 'olumlu'
    q2_typeApprovalMatch: 'olumlu',
    q3_scopeExpansion: 'olumlu',
    q4_unaffectedPartsDefect: 'olumlu',
    // Step 5 Defaults (Teklif)
    offerCompanyName: 'ÖZ ÇAĞRI DİZAYN OTO MÜHENDİSLİK', // Prefill from image
    offerTaxOfficeAndNumber: 'TEPECİK / 662 081 45 97', // Prefill from image
    offerItems: [
      { ...defaultOfferItem, id: Math.random().toString(36).substring(2, 15) }, // Start with one empty item row
    ],
    offerAcceptance: 'accepted', // Default acceptance
    workOrderNumber: '3', // Default İş Emri No (Now in Step 5)
    // Step 6 Defaults (Ara ve Son Kontrol)
    check1_exposedParts_ara: true,
    check1_exposedParts_son: true,
    check2_isofixSeat_ara: true,
    check2_isofixSeat_son: true,
    check3_seatBelts_ara: true,
    check3_seatBelts_son: true,
    check4_windowApprovals_ara: true,
    check4_windowApprovals_son: true,
    // General Defaults
    additionalPhotos: [], // Initialize photos array
    additionalVideos: [], // Initialize videos array
    engineNumber: '', // Initialize engineNumber
    versiyon: '', // Initialize versiyon
    plateNumber: '', // Initialize plateNumber (from Ruhsat)
    plate: '', // Initialize plate (from İş Emri/Teklif)

};


// Create the Zustand store with persistence
export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      branch: null,
      recordData: {
         archive: [], // Initialize archive here
         ...initialRecordData // Spread the rest of the initial defaults
      },
      editingArchiveId: null, // Initialize editing ID

      setBranch: (branch) => {
         console.log('useAppState: Setting branch to:', branch);
         set({ branch });
         // Optionally reset record data when branch changes if needed
         // get().resetRecordData();
      },

       updateRecordData: (newData, options = { reset: false, editingId: undefined }) => {
            const { reset = false, editingId = undefined } = options;
            console.log('useAppState: updateRecordData called. Reset:', reset, 'Editing ID:', editingId, 'New data:', newData);

            // Set the editing ID if provided
            if (editingId !== undefined) {
                set({ editingArchiveId: editingId });
                console.log('useAppState: Set editingArchiveId to:', editingId);
            }

            if (reset) {
                // Call the reset function, which now preserves archive and branch
                get().resetRecordData();
            } else {
                set((state) => {
                    console.log('useAppState: Merging new data into state:', newData);
                    // Merge new data, prioritizing File objects if newData provides them
                    const currentRecordData = state.recordData || { archive: [] }; // Ensure state.recordData exists
                    const currentArchive = currentRecordData.archive || []; // Ensure archive is always an array

                    // Create the merged data object, explicitly handling the archive
                    const mergedData: RecordData = {
                        ...(currentRecordData), // Start with current state
                        ...(newData), // Apply new data
                        archive: newData.archive || currentArchive, // Prioritize new archive array, fallback to current
                        branch: state.branch, // Ensure branch is carried over
                    };
                    console.log('useAppState: State before file handling:', mergedData);

                    // Ensure individual files are handled correctly (clearing or preserving File objects)
                    mergedData.registrationDocument = handleFileMerge(currentRecordData.registrationDocument, newData.registrationDocument);
                    mergedData.labelDocument = handleFileMerge(currentRecordData.labelDocument, newData.labelDocument);
                    mergedData.typeApprovalDocument = handleFileMerge(currentRecordData.typeApprovalDocument, newData.typeApprovalDocument);

                    // Handle file arrays: merge File objects correctly
                    mergedData.additionalPhotos = mergeFileArrays(currentRecordData.additionalPhotos, newData.additionalPhotos);
                    mergedData.additionalVideos = mergeFileArrays(currentRecordData.additionalVideos, newData.additionalVideos);

                    // Ensure offerItems is always an array
                    mergedData.offerItems = newData.offerItems ?? currentRecordData.offerItems ?? [];

                    console.log('useAppState: Final merged state:', { recordData: mergedData });
                    return { recordData: mergedData };
                });
            }
       },
        resetRecordData: () => {
             const currentArchive = get().recordData.archive || [];
             console.log('useAppState: Resetting record data, preserving archive:', currentArchive);
             // Keep archive, reset everything else to initial defaults
             set({
                 recordData: {
                     ...initialRecordData,
                     archive: currentArchive, // Preserve the existing archive
                     branch: get().branch, // Preserve the current branch
                     // Explicitly reset non-default fields to undefined/initial state
                     chassisNumber: undefined,
                     brand: undefined,
                     type: undefined,
                     tradeName: undefined,
                     owner: undefined,
                     plateNumber: '',
                     typeApprovalNumber: undefined,
                     typeAndVariant: undefined,
                     versiyon: '',
                     engineNumber: '',
                     registrationDocument: undefined,
                     labelDocument: undefined,
                     typeApprovalDocument: undefined,
                     additionalPhotos: [], // Reset arrays
                     additionalVideos: [], // Reset arrays
                     customerName: undefined,
                     formDate: undefined,
                     sequenceNo: '3',
                     q1_suitable: 'olumlu',
                     q2_typeApprovalMatch: 'olumlu',
                     q3_scopeExpansion: 'olumlu',
                     q4_unaffectedPartsDefect: 'olumlu',
                     notes: undefined,
                     controllerName: undefined,
                     authorityName: undefined,
                     projectName: undefined,
                     plate: '',
                     workOrderNumber: '3',
                     workOrderDate: undefined,
                     completionDate: undefined,
                     detailsOfWork: undefined,
                     sparePartsUsed: undefined,
                     pricing: undefined,
                     vehicleAcceptanceSignature: undefined,
                     customerSignature: undefined,
                     projectNo: undefined,
                     offerAuthorizedName: undefined,
                     offerCompanyName: 'ÖZ ÇAĞRI DİZAYN OTO MÜHENDİSLİK',
                     offerCompanyAddress: undefined,
                     offerTaxOfficeAndNumber: 'TEPECİK / 662 081 45 97',
                     offerPhoneNumber: undefined,
                     offerEmailAddress: undefined,
                     offerDate: undefined,
                     offerItems: [ // Reset offer items
                          {...defaultOfferItem, id: Math.random().toString(36).substring(2, 15)}
                      ],
                     offerAcceptance: 'accepted',
                     finalCheckDate: undefined,
                     check1_exposedParts_ara: true,
                     check1_exposedParts_son: true,
                     check2_isofixSeat_ara: true,
                     check2_isofixSeat_son: true,
                     check3_seatBelts_ara: true,
                     check3_seatBelts_son: true,
                     check4_windowApprovals_ara: true,
                     check4_windowApprovals_son: true,
                     finalControllerName: undefined,
                     typeApprovalType: undefined,
                     typeApprovalLevel: undefined,
                     typeApprovalVersion: undefined,
                     archivedAt: undefined,
                     fileName: undefined,
                     additionalNotes: undefined,
                     inspectionDate: undefined,
                     inspectorName: undefined,
                 },
                 editingArchiveId: null, // Reset editing ID as well
             });
             console.log('useAppState: Record data reset complete.');
        },
    }),
    {
      name: 'arsiv-asistani-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Use localStorage
       partialize: (state) => {
            // console.log('useAppState: Partializing state for persistence:', state);
            // Ensure recordData and archive exist before accessing them
            const recordDataToPersist = state.recordData || {};
            const archiveToPersist = recordDataToPersist.archive || [];

            // Function to safely get serializable file info
            const safeGetFileInfo = (file: any) => {
                const info = getSerializableFileInfo(file);
                // console.log(`Partializing file: ${info?.name ?? 'N/A'}, Type: ${info?.type ?? 'N/A'}, Size: ${info?.size ?? 'N/A'}`);
                return info;
            };

             // Function to safely map file arrays
             const safeMapFiles = (files: any[] | undefined) => {
                const infos = files?.map(safeGetFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined;
                // console.log(`Partializing file array: ${infos ? infos.map(f => f.name).join(', ') : 'Empty'}`);
                 return infos;
            };


            const partialData = {
                branch: state.branch,
                editingArchiveId: state.editingArchiveId, // Persist the editing ID
                recordData: {
                     // Persist all non-File fields
                     ...Object.entries(recordDataToPersist).reduce((acc, [key, value]) => {
                         if (key !== 'archive' && !(value instanceof File) && !Array.isArray(value)) {
                             acc[key as keyof Omit<RecordData, 'archive' | 'additionalPhotos' | 'additionalVideos' | 'offerItems' | 'registrationDocument' | 'labelDocument' | 'typeApprovalDocument'>] = value;
                         } else if (key === 'offerItems') {
                              // Persist offerItems array
                              acc[key] = value;
                         }
                         return acc;
                     }, {} as Partial<RecordData>),

                     // Convert File objects to serializable info
                     registrationDocument: safeGetFileInfo(recordDataToPersist.registrationDocument),
                     labelDocument: safeGetFileInfo(recordDataToPersist.labelDocument),
                     typeApprovalDocument: safeGetFileInfo(recordDataToPersist.typeApprovalDocument),
                     additionalPhotos: safeMapFiles(recordDataToPersist.additionalPhotos),
                     additionalVideos: safeMapFiles(recordDataToPersist.additionalVideos),

                     // Persist the archive array (already contains serialized data)
                     archive: archiveToPersist,
                 }
            };
            // console.log('useAppState: Data being persisted:', partialData);
            return partialData;
       },
        // When rehydrating, merge persisted data with current runtime state, preserving File objects
        merge: (persistedState, currentState) => {
            console.log('useAppState: Rehydrating state. Persisted:', persistedState, 'Current:', currentState);
            const typedPersistedState = persistedState as Partial<AppState>; // Type assertion

            // Ensure currentState.recordData and persistedState.recordData exist
            const currentRecordData = currentState.recordData || { archive: [] };
            const persistedRecordData = typedPersistedState.recordData || {};
            const persistedArchive = persistedRecordData.archive || [];

             const mergedRecordData = {
                 ...initialRecordData, // Start with initial defaults
                 ...currentRecordData, // Then apply current runtime recordData (including potential File objects)
                 ...(persistedRecordData), // Finally, overwrite with persisted recordData (non-file fields and archive)
                 archive: persistedArchive, // Ensure persisted archive is used
                 branch: typedPersistedState.branch ?? currentState.branch, // Prioritize persisted branch

                 // Restore File objects ONLY if they exist in current state but only info in persisted
                 // This prevents replacing an existing File object with stale persisted info
                  registrationDocument: handleFileRehydration(currentRecordData.registrationDocument, persistedRecordData.registrationDocument),
                  labelDocument: handleFileRehydration(currentRecordData.labelDocument, persistedRecordData.labelDocument),
                  typeApprovalDocument: handleFileRehydration(currentRecordData.typeApprovalDocument, persistedRecordData.typeApprovalDocument),

                  // Restore File arrays - merge current File objects with persisted info
                  additionalPhotos: mergeFileArrays(currentRecordData.additionalPhotos, persistedRecordData.additionalPhotos),
                  additionalVideos: mergeFileArrays(currentRecordData.additionalVideos, persistedRecordData.additionalVideos),

                  offerItems: persistedRecordData.offerItems ?? currentRecordData.offerItems ?? [], // Ensure offerItems is an array
             };

             // Ensure essential fields are present, falling back to initial state if necessary
             mergedRecordData.archive = mergedRecordData.archive || [];
             mergedRecordData.additionalPhotos = mergedRecordData.additionalPhotos || [];
             mergedRecordData.additionalVideos = mergedRecordData.additionalVideos || [];
             mergedRecordData.offerItems = mergedRecordData.offerItems || [{ ...defaultOfferItem, id: Math.random().toString(36).substring(2, 15) }];
             mergedRecordData.plateNumber = mergedRecordData.plateNumber || '';
             mergedRecordData.plate = mergedRecordData.plate || '';
             mergedRecordData.engineNumber = mergedRecordData.engineNumber || '';
             mergedRecordData.versiyon = mergedRecordData.versiyon || '';


            const merged: AppState = {
                ...currentState, // Start with current runtime state
                branch: typedPersistedState.branch ?? currentState.branch, // Prioritize persisted branch
                editingArchiveId: typedPersistedState.editingArchiveId ?? currentState.editingArchiveId ?? null, // Persist editing ID
                recordData: mergedRecordData as RecordData, // Ensure the final type is RecordData
            };
             console.log('useAppState: State after rehydration:', merged);
            return merged;
        },
    }
  )
);

// Helper function to handle single file merging during updates
function handleFileMerge(
    currentFile: File | { name: string; type?: string; size?: number } | undefined,
    newFile: File | { name: string; type?: string; size?: number } | undefined
): File | { name: string; type?: string; size?: number } | undefined {
    // If newFile is explicitly undefined, clear the field
    if (newFile === undefined && arguments.length > 1) { // Check arguments.length to differentiate missing prop vs explicit undefined
      console.log(`handleFileMerge: Clearing file field because newFile is undefined.`);
      return undefined;
    }
    // If newFile is a File, use it
    if (newFile instanceof File) {
       console.log(`handleFileMerge: Using new File: ${newFile.name}`);
      return newFile;
    }
    // If newFile is info and current is a File, keep the current File
    if (currentFile instanceof File && typeof newFile === 'object' && newFile !== null && 'name' in newFile) {
        console.log(`handleFileMerge: Keeping current File (${currentFile.name}) because new value is info.`);
        return currentFile;
    }
    // Otherwise, use the new value (which could be info or undefined if not provided)
     console.log(`handleFileMerge: Using new value (info or undefined): ${newFile ? (newFile as any).name : 'undefined'}`);
    return newFile ?? currentFile;
}

// Helper function to handle single file rehydration
function handleFileRehydration(
    currentFile: File | { name: string; type?: string; size?: number } | undefined,
    persistedFileInfo: { name: string; type?: string; size?: number } | undefined
): File | { name: string; type?: string; size?: number } | undefined {
    // If a File object exists in the current runtime state, keep it.
    if (currentFile instanceof File) {
        // console.log(`handleFileRehydration: Keeping current File: ${currentFile.name}`);
        return currentFile;
    }
    // Otherwise, use the persisted file info (which might be undefined).
    // console.log(`handleFileRehydration: Using persisted info: ${persistedFileInfo?.name ?? 'undefined'}`);
    return persistedFileInfo;
}


// Helper function to merge file arrays during rehydration and updates
function mergeFileArrays(
    currentFiles: (File | { name: string; type?: string; size?: number })[] | undefined,
    newFilesOrInfo: (File | { name: string; type?: string; size?: number })[] | undefined
): (File | { name: string; type?: string; size?: number })[] {
    const mergedMap = new Map<string, File | { name: string; type?: string; size?: number }>();

    // Add current files (prioritize File objects)
    (currentFiles || []).forEach(f => {
        const key = `${f?.name}-${f && 'size' in f ? f.size : ''}`; // Handle potential missing size
        if (f instanceof File) {
             // console.log(`mergeFileArrays (Current): Adding File with key: ${key}`);
            mergedMap.set(key, f);
        } else if (f && f.name) {
            // If it's info, add it only if a File with the same key doesn't exist yet
             // console.log(`mergeFileArrays (Current): Checking info with key: ${key}`);
            if (!mergedMap.has(key) || !(mergedMap.get(key) instanceof File)) {
                // console.log(`mergeFileArrays (Current): Adding info with key: ${key}`);
                 mergedMap.set(key, f);
            } else {
                 // console.log(`mergeFileArrays (Current): Skipping info, File exists for key: ${key}`);
            }
        }
    });

     // Add new files or info (prioritize File objects)
     (newFilesOrInfo || []).forEach(f => {
         const key = `${f?.name}-${f && 'size' in f ? f.size : ''}`; // Handle potential missing size
         if (f instanceof File) {
              // console.log(`mergeFileArrays (New): Adding/Overwriting File with key: ${key}`);
             mergedMap.set(key, f); // Overwrite info with File object if present
         } else if (f && f.name) {
            // If it's info, add it only if a File with the same key doesn't exist yet
             // console.log(`mergeFileArrays (New): Checking info with key: ${key}`);
             if (!mergedMap.has(key) || !(mergedMap.get(key) instanceof File)) {
                 // console.log(`mergeFileArrays (New): Adding info with key: ${key}`);
                 mergedMap.set(key, f);
             } else {
                 // console.log(`mergeFileArrays (New): Skipping info, File exists for key: ${key}`);
             }
         }
     });
    // console.log(`mergeFileArrays: Final merged map size: ${mergedMap.size}`);
    return Array.from(mergedMap.values());
}
