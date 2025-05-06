
// Add other types if needed

export interface TypeApprovalRecord {
  id: string; // Firestore document ID
  sube_adi?: string;
  proje_adi?: string;
  tip_onay?: string;
  tip_onay_seviye?: string;
  varyant?: string;
  versiyon?: string;
  tip_onay_no?: string;
  // belge_url?: string; // Removed as per schema mapping request
}
