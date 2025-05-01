
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
    brand: z.string().optional().describe('The brand name (Markası) extracted from the document. For example: "FIAT".'), // Added example
    type: z.string().optional().describe('The type of vehicle (Tipi) extracted from the document.'),
    tradeName: z.string().optional().describe('The trade name (Ticari Adı) extracted from the document.'),
    owner: z.string().optional().describe('The owner\'s full name (Adı Soyadı) extracted from the document.'), // Updated description
    plateNumber: z.string().optional().describe('The license plate number (Plaka) extracted from the document.'), // Re-added plateNumber
    typeApprovalNumber: z.string().optional().describe('The type approval number (Tip Onay No / AT Uygunluk Belge No) extracted from the document.'),
    typeAndVariant: z.string().optional().describe('The type and variant information (Tip ve Varyant) extracted from the document.'),
    versiyon: z.string().optional().describe('The version information (Versiyon) extracted from the document, often near Tip ve Varyant.'), // Added Versiyon
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
*   Brand (Markası) - **CRITICAL: Locate the exact label "Markası" and extract the value immediately following it (often after a colon ':'). Be very precise. Example: If it says "Markası : FIAT", extract "FIAT". Do NOT confuse this with "Ticari Adı".**
*   Type (Tipi)
*   Trade Name (Ticari Adı) - This is different from "Markası".
*   Owner (Adı Soyadı) - **CRITICAL: Locate the exact label "Adı Soyadı" and extract the FULL name following it. Example: If it says "Adı Soyadı YILMAZ AHMET", extract "YILMAZ AHMET".** Usually only on registration documents.
*   Plate Number (Plaka) - Usually found on the registration document.
*   Type Approval Number (Tip Onay No / AT Uygunluk Belge No) - Usually on labels or newer documents
*   Type and Variant (Tip ve Varyant) - Usually on labels or newer documents
*   Version (Versiyon) - Often found near "Tip ve Varyant" on labels or newer documents.

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
        // Correctly access the structured output from the Genkit 1.x response
        extractedData = output; // Directly use the output property

    } catch (error) {
        console.error("Error calling extractDataPrompt:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
         if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('service unavailable') || errorMessage.includes('500 Internal Server Error')) {
            // Re-throw a specific error for service unavailability or internal server error
            const errorType = errorMessage.includes('503') ? 'Yoğun/Kullanılamıyor' : 'Sunucu Hatası';
            throw new Error(`AI Service Unavailable: The model experienced an issue (${errorType}). Please try again later.`);
         }
         // Re-throw other errors
         throw new Error(`AI prompt error: ${errorMessage}`);
    }

    if (!extractedData) {
        throw new Error("AI failed to extract data from the image.");
    }

    console.log("AI OCR Extraction Result:", extractedData);
    console.log("AI OCR Extracted Brand:", extractedData.brand); // Specific log for brand
    console.log("AI OCR Extracted Owner (Adı Soyadı):", extractedData.owner); // Log owner
    console.log("AI OCR Extracted Plate Number:", extractedData.plateNumber); // Log plateNumber
    console.log("AI OCR Extracted Versiyon:", extractedData.versiyon); // Log versiyon

    // Wrap the extracted data in the expected output format
    return {
      ocrData: extractedData as OcrData, // Cast needed as Zod schema matches OcrData interface
    };
  }
);
