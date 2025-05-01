
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
    writeBatch, // Import writeBatch
    doc,        // Import doc
} from 'firebase/firestore';
import type { TypeApprovalRecord } from '@/types'; // Import the new type

// Firebase configuration (replace with your actual config if different)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "arsivasistani", // Default for local dev
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
         console.log("Firebase initialized successfully.");
         // Optional: Connect to Firestore Emulator if running locally
         // if (process.env.NODE_ENV === 'development') {
         //    connectFirestoreEmulator(db, 'localhost', 8080);
         //    console.log("Connected to Firestore Emulator");
         // }
    } catch (error) {
        console.error("Firebase initialization error:", error);
        // Handle the error appropriately - maybe show an error message to the user
        // For now, we'll re-throw or log, but in a real app, provide feedback.
         throw new Error("Firebase could not be initialized.");
    }

} else {
    app = getApps()[0];
    db = getFirestore(app);
}


// --- Firestore Service Functions ---

/**
 * Fetches all type approval records from the 'tip_onay_kayitlari' collection,
 * ordered by sube_adi (Branch Name).
 * @returns A promise that resolves to an array of TypeApprovalRecord objects.
 */
export const getTypeApprovalRecords = async (): Promise<TypeApprovalRecord[]> => {
    if (!db) throw new Error("Firestore is not initialized."); // Check initialization
    const recordsCol = collection(db, 'tip_onay_kayitlari');
    // Optional: Order by a specific field, e.g., branch name then type approval number
    const q = query(recordsCol, orderBy('sube_adi'), orderBy('tip_onay_no'));
    try {
        const recordsSnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
        const recordsList = recordsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as TypeApprovalRecord));
         console.log(`Fetched ${recordsList.length} records.`);
        return recordsList;
    } catch (error) {
        console.error("Error fetching type approval records:", error);
        throw new Error("Failed to fetch type approval records from Firestore.");
    }
};

/**
 * Adds a new type approval record to the 'tip_onay_kayitlari' collection.
 * @param record - The record data to add (excluding the id).
 * @returns A promise that resolves when the document is added.
 */
export const addTypeApprovalRecord = async (record: Omit<TypeApprovalRecord, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized."); // Check initialization
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
 * Adds multiple type approval records to the 'tip_onay_kayitlari' collection using a batch write.
 * @param records - An array of record data to add (excluding the id).
 * @returns A promise that resolves when the batch write is committed.
 */
export const addMultipleTypeApprovalRecords = async (records: Omit<TypeApprovalRecord, 'id'>[]): Promise<void> => {
     if (!db) throw new Error("Firestore is not initialized."); // Check initialization
    if (!records || records.length === 0) {
        console.log("No records provided to add.");
        return;
    }

    const batch = writeBatch(db);
    const recordsCol = collection(db, 'tip_onay_kayitlari');

    records.forEach((record) => {
        const docRef = doc(recordsCol); // Create a new document reference with an auto-generated ID
        batch.set(docRef, record); // Add the record to the batch
    });

    try {
        await batch.commit();
        console.log(`${records.length} documents successfully written in a batch!`);
    } catch (error) {
        console.error("Error writing batch documents: ", error);
        throw new Error("Failed to add multiple type approval records to Firestore using batch write.");
    }
};

// --- End Firestore Service Functions ---

export { db }; // Export db if needed elsewhere
