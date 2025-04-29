
// noinspection JSUnusedLocalSymbols
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting vehicle data from an image using OCR.
 *
 * extractVehicleData - A function that takes an image of a vehicle registration document or label and returns the extracted data.
 * ExtractVehicleDataInput - The input type for the extractVehicleData function, which includes the image as a data URI.
 * ExtractVehicleDataOutput - The output type for the extractVehicleData function, which includes the extracted vehicle data according to the OcrData schema.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { OcrData } from '@/services/ocr'; // Import the OcrData type definition

// Define the schema for the OcrData interface using Zod for runtime validation and description
const OcrDataSchema = z.object({
    chassisNumber: z.string().optional().describe('The chassis number (Şasi No / Araç Kimlik No) extracted from the document.'),
    brand: z.string().optional().describe('The brand name (Markası) extracted from the document.'),
    type: z.string().optional().describe('The type of vehicle (Tipi) extracted from the document.'),
    tradeName: z.string().optional().describe('The trade name (Ticari Adı) extracted from the document.'),
    owner: z.string().optional().describe('The owner\'s name (Sahibi) extracted from the document.'),
    plateNumber: z.string().optional().describe('The license plate number (Plaka) extracted from the document.'), // Added plateNumber
    typeApprovalNumber: z.string().optional().describe('The type approval number (Tip Onay No / AT Uygunluk Belge No) extracted from the document.'),
    typeAndVariant: z.string().optional().describe('The type and variant information (Tip ve Varyant) extracted from the document.'),
});


const ExtractVehicleDataInputSchema = z.object({
  imageBase64: z
    .string()
    .describe(
      'A photo of a vehicle registration document or label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ExtractVehicleDataInput = z.infer<typeof ExtractVehicleDataInputSchema>;

// The output schema directly uses the OcrDataSchema
const ExtractVehicleDataOutputSchema = z.object({
    ocrData: OcrDataSchema.describe('The extracted vehicle data.'),
});

export type ExtractVehicleDataOutput = z.infer<typeof ExtractVehicleDataOutputSchema>;

// Define the prompt for extracting data
const extractDataPrompt = ai.definePrompt({
    name: 'extractVehicleDataPrompt',
    input: {
        schema: ExtractVehicleDataInputSchema, // Input is just the image base64
    },
    output: {
        schema: OcrDataSchema, // Output schema is the OcrData structure
    },
    prompt: `Analyze the provided image, which could be a vehicle registration document (araç ruhsatı) or a vehicle identification label (araç etiketi) from Turkey. Extract the following information if available:

*   Chassis Number (Şasi No / Araç Kimlik No)
*   License Plate Number (Plaka) - Usually on registration documents
*   Brand (Markası)
*   Type (Tipi)
*   Trade Name (Ticari Adı)
*   Owner (Sahibi) - Usually only on registration documents
*   Type Approval Number (Tip Onay No / AT Uygunluk Belge No) - Usually on labels or newer documents
*   Type and Variant (Tip ve Varyant) - Usually on labels or newer documents

Return the extracted information in the specified JSON format. If a field is not found, omit it or return null. Pay attention to Turkish characters.

Image: {{media url=imageBase64}}
`,
});


// The main function exported to be used by the application
export async function extractVehicleData(input: ExtractVehicleDataInput): Promise<ExtractVehicleDataOutput> {
  return extractVehicleDataFlow(input);
}

// Define the Genkit flow
const extractVehicleDataFlow = ai.defineFlow<
  typeof ExtractVehicleDataInputSchema,
  typeof ExtractVehicleDataOutputSchema
>(
  {
    name: 'extractVehicleDataFlow',
    inputSchema: ExtractVehicleDataInputSchema,
    outputSchema: ExtractVehicleDataOutputSchema,
  },
  async (input) => {
    console.log("Calling AI prompt for OCR extraction...");
    let extractedData: OcrData | undefined;
    try {
        // Call the AI prompt with the image data URI and destructure the output
        const { output } = await extractDataPrompt(input);
        extractedData = output;

    } catch (error) {
        console.error("Error calling extractDataPrompt:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
         if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('service unavailable')) {
             // Re-throw a specific error for service unavailability
             throw new Error("AI Service Unavailable: The model is overloaded. Please try again later.");
         }
         // Re-throw other errors
         throw new Error(`AI prompt error: ${errorMessage}`);
    }

    if (!extractedData) {
        throw new Error("AI failed to extract data from the image.");
    }

    console.log("AI OCR Extraction Result:", extractedData);

    // Wrap the extracted data in the expected output format
    return {
      ocrData: extractedData as OcrData, // Cast needed as Zod schema matches OcrData interface
    };
  }
);
