'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from a vehicle license image using OCR and a large language model.
 *
 * - extractDataFromVehicleLicense - A function that accepts an image of a vehicle license and returns the extracted data.
 * - ExtractDataFromVehicleLicenseInput - The input type for the extractDataFromVehicleLicense function, which is a data URI of the image.
 * - ExtractDataFromVehicleLicenseOutput - The output type for the extractDataFromVehicleLicense function, which includes saseNo, marka, tipOnayNo, varyant, and versiyon.
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
  saseNo: z.string().optional().describe('Şase Numarası (VIN)'), // New field
  marka: z.string().optional().describe('Marka'), // Kept field
  tipOnayNo: z.string().optional().describe('Tip Onay Numarası'), // New field
  varyant: z.string().optional().describe('Varyant'), // New field
  versiyon: z.string().optional().describe('Versiyon'), // New field
});

export type ExtractDataFromVehicleLicenseOutput = z.infer<typeof ExtractDataFromVehicleLicenseOutputSchema>;

// This function serves as the public API for the flow
export async function extractDataFromVehicleLicense(
  input: ExtractDataFromVehicleLicenseInput
): Promise<ExtractDataFromVehicleLicenseOutput> {
  return extractDataFromVehicleLicenseFlow(input);
}

// Define the prompt for the AI model
const prompt = ai.definePrompt({
  name: 'extractDataFromVehicleLicensePrompt',
  input: {
    schema: ExtractDataFromVehicleLicenseInputSchema, // Use the same input schema
  },
  output: {
    schema: ExtractDataFromVehicleLicenseOutputSchema, // Use the updated output schema
  },
  prompt: `Aşağıdaki araç ruhsatı veya etiketi görselinden şu bilgileri çıkar: Şase Numarası, Marka, Tip Onay Numarası, Varyant, Versiyon. Eğer bir bilgi bulunamazsa boş bırak veya null olarak döndür.

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
  const response = await prompt.generate({
    input: {
      licenseImageDataUri: input.licenseImageDataUri,
    },
  });

  // Return the structured output from the AI model
  return response.output() || { // Provide default empty object if output is null/undefined
      saseNo: '',
      marka: '',
      tipOnayNo: '',
      varyant: '',
      versiyon: '',
    };
});
