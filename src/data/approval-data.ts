
import { z } from 'zod';

// Define the schema for a single approval entry using Zod
export const approvalSchema = z.object({
  marka: z.string().min(1, { message: "Marka alanı boş olamaz." }),
  tipOnayNo: z.string().min(1, { message: "Tip Onay No alanı boş olamaz." }),
  varyant: z.string().min(1, { message: "Varyant alanı boş olamaz." }),
  versiyon: z.string().min(1, { message: "Versiyon alanı boş olamaz." }),
  seriTadilatTipOnayi: z.string().min(1, { message: "Seri Tadilat Tip Onayı alanı boş olamaz." }), // Added new field
});

export type ApprovalFormData = z.infer<typeof approvalSchema>;

// This is the list used for comparison on the main page
// and the initial data for the management page.
export const initialApprovalData: ApprovalFormData[] = [
  { marka: "Marka A", tipOnayNo: "A123", varyant: "Varyant X", versiyon: "1.0", seriTadilatTipOnayi: "STTO-A1" }, // Added new field data
  { marka: "Marka B", tipOnayNo: "B456", varyant: "Varyant Y", versiyon: "2.1", seriTadilatTipOnayi: "STTO-B2" }, // Added new field data
  { marka: "Marka C", tipOnayNo: "C789", varyant: "Varyant Z", versiyon: "3.0", seriTadilatTipOnayi: "STTO-C3" }, // Added new field data
  { marka: "Marka A", tipOnayNo: "A124", varyant: "Varyant X", versiyon: "1.1", seriTadilatTipOnayi: "STTO-A4" }, // Added new field data
];
