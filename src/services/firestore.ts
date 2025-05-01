
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    Firestore,
    DocumentData,
    QuerySnapshot,
} from 'firebase/firestore';
import type { TypeApprovalRecord } from '@/types'; // Import the new type

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}
db = getFirestore(app);


// --- Firestore Service Functions ---

/**
 * Fetches all type approval records from the 'tip_onay_kayitlari' collection,
 * ordered by sube_adi (Branch Name).
 * @returns A promise that resolves to an array of TypeApprovalRecord objects.
 */
export const getTypeApprovalRecords = async (): Promise<TypeApprovalRecord[]> => {
    const recordsCol = collection(db, 'tip_onay_kayitlari');
    // Optional: Order by a specific field, e.g., branch name
    const q = query(recordsCol, orderBy('sube_adi'));
    const recordsSnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const recordsList = recordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as TypeApprovalRecord));
    return recordsList;
};

/**
 * Adds a new type approval record to the 'tip_onay_kayitlari' collection.
 * @param record - The record data to add (excluding the id).
 * @returns A promise that resolves when the document is added.
 */
export const addTypeApprovalRecord = async (record: Omit<TypeApprovalRecord, 'id'>): Promise<void> => {
    try {
        const recordsCol = collection(db, 'tip_onay_kayitlari');
        await addDoc(recordsCol, record);
        console.log("Document successfully written!");
    } catch (error) {
        console.error("Error writing document: ", error);
        throw new Error("Failed to add type approval record to Firestore.");
    }
};

/**
 * Adds multiple type approval records to the 'tip_onay_kayitlari' collection.
 * Uses Promise.all for potential parallel writes (Firestore handles batching).
 * @param records - An array of record data to add (excluding the id).
 * @returns A promise that resolves when all documents are added.
 */
export const addMultipleTypeApprovalRecords = async (records: Omit<TypeApprovalRecord, 'id'>[]): Promise<void> => {
    try {
        const recordsCol = collection(db, 'tip_onay_kayitlari');
        const addPromises = records.map(record => addDoc(recordsCol, record));
        await Promise.all(addPromises);
        console.log(`${records.length} documents successfully written!`);
    } catch (error) {
        console.error("Error writing multiple documents: ", error);
        throw new Error("Failed to add multiple type approval records to Firestore.");
    }
};

// --- End Firestore Service Functions ---

export { db }; // Export db if needed elsewhere
