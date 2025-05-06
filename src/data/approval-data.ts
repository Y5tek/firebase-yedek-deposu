
import { z } from 'zod';

// Define the schema for a single approval entry using Zod
export const approvalSchema = z.object({
  marka: z.string().min(1, { message: "Marka alanı boş olamaz." }).trim(),
  tipOnayNo: z.string().min(1, { message: "Tip Onay No alanı boş olamaz." }).trim(),
  varyant: z.string().min(1, { message: "Varyant alanı boş olamaz." }).trim(),
  versiyon: z.string().min(1, { message: "Versiyon alanı boş olamaz." }).trim(),
  seriTadilatTipOnayi: z.string().min(1, { message: "Seri Tadilat Tip Onayı alanı boş olamaz." }).trim(),
});

export type ApprovalFormData = z.infer<typeof approvalSchema>;

// This is the list used for comparison on the main page
// and the initial data for the management page if localStorage is empty.
// However, the SeriTadilatOnayPage now primarily uses localStorage.
// This can be kept as a true initial default if localStorage is never populated or cleared.
export const initialApprovalData: ApprovalFormData[] = [
  // { marka: "Marka A", tipOnayNo: "A123", varyant: "Varyant X", versiyon: "1.0", seriTadilatTipOnayi: "STTO-A1" },
  // { marka: "Marka B", tipOnayNo: "B456", varyant: "Varyant Y", versiyon: "2.1", seriTadilatTipOnayi: "STTO-B2" },
  // { marka: "Marka C", tipOnayNo: "C789", varyant: "Varyant Z", versiyon: "3.0", seriTadilatTipOnayi: "STTO-C3" },
  // { marka: "Marka A", tipOnayNo: "A124", varyant: "Varyant X", versiyon: "1.1", seriTadilatTipOnayi: "STTO-A4" },
];
// Default data is removed as per user request to rely on loaded/saved data.
// If initial data is needed when localStorage is empty, it can be added back here.

    