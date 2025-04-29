// noinspection JSUnusedLocalSymbols
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting vehicle data from an image using OCR.
 *
 * extractVehicleData - A function that takes an image of a vehicle registration document and returns the extracted data.
 * ExtractVehicleDataInput - The input type for the extractVehicleData function, which includes the image as a data URI.
 * ExtractVehicleDataOutput - The output type for the extractVehicleData function, which includes the extracted vehicle data.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {extractDataFromImage, OcrData} from '@/services/ocr';

const ExtractVehicleDataInputSchema = z.object({
  imageBase64: z
    .string()
    .describe(
      'A photo of a vehicle registration document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type ExtractVehicleDataInput = z.infer<typeof ExtractVehicleDataInputSchema>;

const ExtractVehicleDataOutputSchema = z.object({
  ocrData: z.object({
    chassisNumber: z.string().describe('The chassis number extracted from the document.'),
    brand: z.string().describe('The brand name extracted from the document.'),
    type: z.string().describe('The type of vehicle extracted from the document.'),
    tradeName: z.string().describe('The trade name extracted from the document.'),
    owner: z.string().describe('The owner\'s name extracted from the document.'),
    typeApprovalNumber: z.string().describe('The type approval number extracted from the document.'),
    typeAndVariant: z.string().describe('The type and variant information extracted from the document.'),
  }).describe('The extracted vehicle data.'),
});
export type ExtractVehicleDataOutput = z.infer<typeof ExtractVehicleDataOutputSchema>;

export async function extractVehicleData(input: ExtractVehicleDataInput): Promise<ExtractVehicleDataOutput> {
  return extractVehicleDataFlow(input);
}

const extractVehicleDataFlow = ai.defineFlow<
  typeof ExtractVehicleDataInputSchema,
  typeof ExtractVehicleDataOutputSchema
>(
  {
    name: 'extractVehicleDataFlow',
    inputSchema: ExtractVehicleDataInputSchema,
    outputSchema: ExtractVehicleDataOutputSchema,
  },
  async input => {
    // Call the OCR service to extract data from the image.
    const ocrData: OcrData = await extractDataFromImage(input.imageBase64);

    return {
      ocrData,
    };
  }
);

