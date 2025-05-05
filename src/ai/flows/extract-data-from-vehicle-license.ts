'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from a vehicle license or tag image using OCR and a large language model.
 *
 * - extractDataFromVehicleLicense - A function that accepts an image of a vehicle license/tag and returns the extracted data.
 * - ExtractDataFromVehicleLicenseInput - The input type for the extractDataFromVehicleLicense function, which is a data URI of the image.
 * - ExtractDataFromVehicleLicenseOutput - The output type for the extractDataFromVehicleLicense function, including saseNo, marka, tipOnayNo, varyant, and versiyon.
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

// Output schema remains the same, containing all possible fields.
const ExtractDataFromVehicleLicenseOutputSchema = z.object({
  saseNo: z.string().optional().describe('Şase Numarası (VIN)'),
  marka: z.string().optional().describe('Marka'),
  tipOnayNo: z.string().optional().describe('Tip Onay Numarası'),
  varyant: z.string().optional().describe('Varyant'),
  versiyon: z.string().optional().describe('Versiyon'),
});

export type ExtractDataFromVehicleLicenseOutput = z.infer<typeof ExtractDataFromVehicleLicenseOutputSchema>;

// This function serves as the public API for the flow
export async function extractDataFromVehicleLicense(
  input: ExtractDataFromVehicleLicenseInput
): Promise<ExtractDataFromVehicleLicenseOutput> {
  return extractDataFromVehicleLicenseFlow(input);
}

// Define the prompt for the AI model
// The prompt asks for *all* fields, letting the model decide what's available in the image.
const prompt = ai.definePrompt({
  name: 'extractDataFromVehicleLicensePrompt',
  input: {
    schema: ExtractDataFromVehicleLicenseInputSchema, // Use the same input schema
  },
  output: {
    schema: ExtractDataFromVehicleLicenseOutputSchema, // Use the same output schema
  },
  prompt: `Aşağıdaki araç ruhsatı VEYA etiketi görselinden Şase Numarası, Marka, Tip Onay Numarası, Varyant ve Versiyon bilgilerini çıkar. Hangi bilginin hangi tür belgede (ruhsat/etiket) bulunduğunu dikkate almadan, görselde bulabildiğin tüm bu alanları doldur. Eğer bir bilgi görselde bulunmuyorsa ilgili alanı boş bırak veya null olarak döndür.

   Araç Görseli: {{media url=licenseImageDataUri}}
  `,
});

// Define the Genkit flow
const extractDataFromVehicleLicenseFlow = ai.defineFlow<
  typeof ExtractDataFromVehicleLicenseInputSchema,
  typeof ExtractDataFromVehicleLicenseOutputSchema
>({
  name: 'extractDataFromVehicleLicenseFlow',
  inputSchema: ExtractDataFromVehicleLicenseInputSchema,
  outputSchema: ExtractDataFromVehicleLicenseOutputSchema,
},
async input => {
  // Directly generate the response using the defined prompt and the input image
  // Genkit 1.x: Call the prompt function directly with the input
  const response = await prompt(input);


  // Genkit 1.x: Access the output property directly
  return response.output || { // Provide default empty object if output is null/undefined
      saseNo: '',
      marka: '',
      tipOnayNo: '',
      varyant: '',
      versiyon: '',
    };
});
