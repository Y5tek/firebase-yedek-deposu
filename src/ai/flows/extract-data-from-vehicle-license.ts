
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from a vehicle license or tag image using OCR and a large language model.
 *
 * - extractDataFromVehicleLicense - A function that accepts an image of a vehicle license/tag and returns the extracted data, applying specific formatting and splitting rules. Tip Onay No markings are ignored.
 * - ExtractDataFromVehicleLicenseInput - The input type for the extractDataFromVehicleLicense function, which is a data URI of the image.
 * - ExtractDataFromVehicleLicenseOutput - The output type for the extractDataFromVehicleLicenseOutputSchema function, including saseNo, marka, tipOnayNo (cleaned), tip, varyant, and versiyon.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExtractDataFromVehicleLicenseInputSchema = z.object({
  licenseImageDataUri: z
    .string()
    .describe(
      'A photo of a vehicle license or tag, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type ExtractDataFromVehicleLicenseInput = z.infer<typeof ExtractDataFromVehicleLicenseInputSchema>;

const ExtractDataFromVehicleLicenseOutputSchema = z.object({
  saseNo: z.string().optional().describe('Şase Numarası (VIN)'),
  marka: z.string().optional().describe('Marka'),
  tipOnayNo: z.string().optional().describe('Tip Onay Numarası (işaretlemeler olmadan, sadece harf ve rakam)'),
  // tipVaryantVersiyonCombined is an intermediate field, not in the final output to client normally
  // but kept in schema for clarity of what the flow might process internally.
  // It's not part of the final return type to client to avoid confusion.
  tip: z.string().optional().describe('Tip (işlenmiş, ilk 3 karakter)'),
  varyant: z.string().optional().describe('Varyant (işlenmiş)'),
  versiyon: z.string().optional().describe('Versiyon (işlenmiş)'),
});

export type ExtractDataFromVehicleLicenseOutput = z.infer<typeof ExtractDataFromVehicleLicenseOutputSchema>;

export async function extractDataFromVehicleLicense(
  input: ExtractDataFromVehicleLicenseInput
): Promise<ExtractDataFromVehicleLicenseOutput> {
  return extractDataFromVehicleLicenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDataFromVehicleLicensePrompt',
  input: {
    schema: ExtractDataFromVehicleLicenseInputSchema,
  },
  output: {
    // Schema for what the LLM is asked to output
    schema: z.object({
        saseNo: z.string().optional().describe('Şase Numarası (VIN)'),
        marka: z.string().optional().describe('Marka'),
        tipOnayNo: z.string().optional().describe('Tip Onay Numarası (örneğin e1200746000100 veya e1*2007/46*0001*00). Aradaki işaretlemeler önemsizdir, sadece harf ve rakamları çıkarın.'),
        tipVaryantVersiyonCombined: z.string().optional().describe('Etikette genellikle bulunan Tip, Varyant ve Versiyon bilgisini içeren metin (örn: "225CXE1A TFB7R" veya "ABCDE12345" veya "E1*2001/116*0342*00 / ABCDE / FGHIJ")'),
      }),
  },
  prompt: `Aşağıdaki araç ruhsatı VEYA etiketi görselinden Şase Numarası, Marka, Tip Onay Numarası ve etikette genellikle bulunan Tip/Varyant/Versiyon bilgisini (tipVaryantVersiyonCombined alanı için) çıkar.
Görselde bulabildiğin tüm bu alanları doldur. Eğer bir bilgi görselde bulunmuyorsa ilgili alanı boş bırak veya null olarak döndür.

Tip Onay Numarası için, metindeki TÜM özel karakterleri (*, /, -, vb.) yok sayarak SADECE harf ve rakamları birleşik olarak çıkar (örneğin "e1*2007/46*0001*00" ise "e1200746000100" olarak).
Etiketlerde Tip, Varyant ve Versiyon bilgileri bazen "225CXE1A TFB7R" veya "ABCDE12345" gibi birleşik bir metin olarak veya "E1*2001/116*0342*00 / ABCDE / FGHIJ" gibi bölümlenmiş olarak bulunabilir. Bu birleşik/bölümlenmiş metni 'tipVaryantVersiyonCombined' alanına yaz.

Araç Görseli: {{media url=licenseImageDataUri}}
  `,
});

const extractDataFromVehicleLicenseFlow = ai.defineFlow<
  typeof ExtractDataFromVehicleLicenseInputSchema,
  typeof ExtractDataFromVehicleLicenseOutputSchema // Flow output is the final structured schema
>({
  name: 'extractDataFromVehicleLicenseFlow',
  inputSchema: ExtractDataFromVehicleLicenseInputSchema,
  outputSchema: ExtractDataFromVehicleLicenseOutputSchema,
},
async input => {
  const response = await prompt(input);
  const rawOutput = response.output;

  let processedSaseNo = rawOutput?.saseNo;
  let processedMarka = rawOutput?.marka;
  let processedTipOnayNo = rawOutput?.tipOnayNo;
  let processedTip: string | undefined = undefined;
  let processedVaryant: string | undefined = undefined;
  let processedVersiyon: string | undefined = undefined;

  // Post-process tipOnayNo: remove ALL non-alphanumeric characters (ignore markings)
  if (processedTipOnayNo) {
    processedTipOnayNo = processedTipOnayNo.replace(/[^a-zA-Z0-9]+/g, '');
  }

  const combinedData = rawOutput?.tipVaryantVersiyonCombined;
  if (combinedData) {
    const partsSlashDelimited = combinedData.split(' / ');
    if (partsSlashDelimited.length === 3) {
        // Example: "E1*2001/116*0342*00 / ABCDE / FGHIJ"
        // If TipOnayNo from prompt is empty or this part is more complete, use it
        let potentialTipOnayFromCombined = partsSlashDelimited[0].trim().replace(/[^a-zA-Z0-9]+/g, '');
        if (!processedTipOnayNo || (potentialTipOnayFromCombined && potentialTipOnayFromCombined.length > (processedTipOnayNo?.length || 0))) {
            processedTipOnayNo = potentialTipOnayFromCombined;
        }
        // The second part is usually the full "Tip / Varyant" string for tags like "FIAT / 312AXA1A 00"
        // Or it could be just Varyant like "ABCDE" in "E1... / ABCDE / FGHIJ"
        // We will try to split the second part by space if it seems to contain Tip and Varyant
        const secondPart = partsSlashDelimited[1].trim();
        const secondPartSplit = secondPart.split(/\s+/);
        if (secondPartSplit.length > 1 && secondPartSplit[0].length <=3) { // e.g. "ABC" "DEFGH"
            processedTip = secondPartSplit[0].toUpperCase().substring(0,3);
            processedVaryant = secondPartSplit.slice(1).join(""); // Remaining part is varyant
        } else { // If no space or first part is long, assume it's just varyant
            processedTip = secondPart.toUpperCase().substring(0,3); // Still take first 3 for tip
            processedVaryant = secondPart; // And the whole thing as varyant
        }
        processedVersiyon = partsSlashDelimited[2].trim();

    } else {
        const noSpaceCombined = combinedData.replace(/\s+/g, '').toUpperCase();
        // Example: "225CXE1A TFB7R" -> "225CXE1ATFB7R"
        // Example: "225CXL1A TC6C" -> "225CXL1ATC6C"

        if (noSpaceCombined.length >= 3) {
            processedTip = noSpaceCombined.substring(0, 3);
            if (noSpaceCombined.length >= 8) { // 3 for tip + 5 for varyant
                processedVaryant = noSpaceCombined.substring(3, 8);
                if (noSpaceCombined.length > 8) {
                    processedVersiyon = noSpaceCombined.substring(8);
                }
            } else if (noSpaceCombined.length > 3) { // Has tip, but not enough for full 5-char varyant
                processedVaryant = noSpaceCombined.substring(3);
            }
        } else if (noSpaceCombined.length > 0) { // Too short for 3-char tip rule
            processedVaryant = noSpaceCombined; // Assign all to varyant as a fallback
        }
    }
  }

  return {
    saseNo: processedSaseNo,
    marka: processedMarka,
    tipOnayNo: processedTipOnayNo,
    tip: processedTip,
    varyant: processedVaryant,
    versiyon: processedVersiyon,
    // tipVaryantVersiyonCombined is not returned to the client
  };
});

    