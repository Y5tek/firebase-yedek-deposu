'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from a vehicle license image using OCR and a large language model.
 *
 * - extractDataFromVehicleLicense - A function that accepts an image of a vehicle license and returns the extracted data.
 * - ExtractDataFromVehicleLicenseInput - The input type for the extractDataFromVehicleLicense function, which is a data URI of the image.
 * - ExtractDataFromVehicleLicenseOutput - The output type for the extractDataFromVehicleLicense function, which includes ruhsatNo, etiketNo, marka, and model.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// Import removed as the flow now directly uses the prompt
// import {extractRuhsatEtiketData, RuhsatEtiketData} from '@/services/ruhsat-etiket';

const ExtractDataFromVehicleLicenseInputSchema = z.object({
  licenseImageDataUri: z
    .string()
    .describe(
      'A photo of a vehicle license, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});

export type ExtractDataFromVehicleLicenseInput = z.infer<typeof ExtractDataFromVehicleLicenseInputSchema>;

const ExtractDataFromVehicleLicenseOutputSchema = z.object({
  ruhsatNo: z.string().optional().describe('Ruhsat numarası'), // Made optional as OCR might fail
  etiketNo: z.string().optional().describe('Etiket numarası'), // Made optional
  marka: z.string().optional().describe('Marka'),             // Made optional
  model: z.string().optional().describe('Model'),             // Made optional
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
    schema: ExtractDataFromVehicleLicenseOutputSchema, // Use the same output schema
  },
  prompt: `Aşağıdaki araç ruhsatı görselinden şu bilgileri çıkar: ruhsat numarası, etiket numarası, marka, model. Eğer bir bilgi bulunamazsa boş bırak.

   Araç Ruhsat Görseli: {{media url=licenseImageDataUri}}
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
      ruhsatNo: '',
      etiketNo: '',
      marka: '',
      model: '',
    };
});
