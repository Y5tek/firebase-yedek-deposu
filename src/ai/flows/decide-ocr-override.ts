
'use server';

/**
 * @fileOverview Determines whether OCR extracted information should override existing fields.
 *
 * - decideOcrOverride - A function that decides whether to override fields with OCR data.
 * - DecideOcrOverrideInput - The input type for the decideOcrOverride function.
 * - DecideOcrOverrideOutput - The return type for the decideOcrOverride function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const DecideOcrOverrideInputSchema = z.object({
  ocrData: z.object({
    chassisNumber: z.string().optional().describe('Chassis number extracted from OCR.'),
    brand: z.string().optional().describe('Brand extracted from OCR.'),
    type: z.string().optional().describe('Type extracted from OCR.'),
    tradeName: z.string().optional().describe('Trade name extracted from OCR.'),
    owner: z.string().optional().describe('Owner (Adı Soyadı) extracted from OCR.'), // Clarified description
    plateNumber: z.string().optional().describe('Plate number extracted from OCR.'), // Re-added plateNumber
    typeApprovalNumber: z.string().optional().describe('Type approval number extracted from OCR.'),
    typeAndVariant: z.string().optional().describe('Type and variant information extracted from OCR.'),
    versiyon: z.string().optional().describe('Version information extracted from OCR.'), // Added versiyon
  }).describe('Data extracted from OCR.'),
  currentData: z.object({
    chassisNumber: z.string().optional().describe('Current chassis number.'),
    brand: z.string().optional().describe('Current brand.'),
    type: z.string().optional().describe('Current type.'),
    tradeName: z.string().optional().describe('Current trade name.'),
    owner: z.string().optional().describe('Current owner (Adı Soyadı).'), // Clarified description
    plateNumber: z.string().optional().describe('Current plate number.'), // Re-added plateNumber
    typeApprovalNumber: z.string().optional().describe('Current type approval number.'),
    typeAndVariant: z.string().optional().describe('Current type and variant information.'),
    versiyon: z.string().optional().describe('Current version information.'), // Added versiyon
  }).describe('Current data in the form.'),
});

export type DecideOcrOverrideInput = z.infer<typeof DecideOcrOverrideInputSchema>;

const DecideOcrOverrideOutputSchema = z.object({
  override: z.object({
    chassisNumber: z.boolean().describe('Whether to override chassis number with OCR data.'),
    brand: z.boolean().describe('Whether to override brand with OCR data.'),
    type: z.boolean().describe('Whether to override type with OCR data.'),
    tradeName: z.boolean().describe('Whether to override trade name with OCR data.'),
    owner: z.boolean().describe('Whether to override owner (Adı Soyadı) with OCR data.'), // Clarified description
    plateNumber: z.boolean().describe('Whether to override plate number with OCR data.'), // Re-added plateNumber
    typeApprovalNumber: z.boolean().describe('Whether to override type approval number with OCR data.'),
    typeAndVariant: z.boolean().describe('Whether to override type and variant information with OCR data.'),
    versiyon: z.boolean().describe('Whether to override version information with OCR data.'), // Added versiyon
  }).describe('Decision on whether to override each field.'),
});

export type DecideOcrOverrideOutput = z.infer<typeof DecideOcrOverrideOutputSchema>;

export async function decideOcrOverride(input: DecideOcrOverrideInput): Promise<DecideOcrOverrideOutput> {
  return decideOcrOverrideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'decideOcrOverridePrompt',
  input: {
    schema: z.object({
      ocrData: z.object({
        chassisNumber: z.string().optional().describe('Chassis number extracted from OCR.'),
        brand: z.string().optional().describe('Brand extracted from OCR.'),
        type: z.string().optional().describe('Type extracted from OCR.'),
        tradeName: z.string().optional().describe('Trade name extracted from OCR.'),
        owner: z.string().optional().describe('Owner (Adı Soyadı) extracted from OCR.'), // Clarified description
        plateNumber: z.string().optional().describe('Plate number extracted from OCR.'), // Re-added plateNumber
        typeApprovalNumber: z.string().optional().describe('Type approval number extracted from OCR.'),
        typeAndVariant: z.string().optional().describe('Type and variant information extracted from OCR.'),
        versiyon: z.string().optional().describe('Version information extracted from OCR.'), // Added versiyon
      }).describe('Data extracted from OCR.'),
      currentData: z.object({
        chassisNumber: z.string().optional().describe('Current chassis number.'),
        brand: z.string().optional().describe('Current brand.'),
        type: z.string().optional().describe('Current type.'),
        tradeName: z.string().optional().describe('Current trade name.'),
        owner: z.string().optional().describe('Current owner (Adı Soyadı).'), // Clarified description
        plateNumber: z.string().optional().describe('Current plate number.'), // Re-added plateNumber
        typeApprovalNumber: z.string().optional().describe('Current type approval number.'),
        typeAndVariant: z.string().optional().describe('Current type and variant information.'),
        versiyon: z.string().optional().describe('Current version information.'), // Added versiyon
      }).describe('Current data in the form.'),
    }),
  },
  output: {
    schema: z.object({
      override: z.object({
        chassisNumber: z.boolean().describe('Whether to override chassis number with OCR data.'),
        brand: z.boolean().describe('Whether to override brand with OCR data.'),
        type: z.boolean().describe('Whether to override type with OCR data.'),
        tradeName: z.boolean().describe('Whether to override trade name with OCR data.'),
        owner: z.boolean().describe('Whether to override owner (Adı Soyadı) with OCR data.'), // Clarified description
        plateNumber: z.boolean().describe('Whether to override plate number with OCR data.'), // Re-added plateNumber
        typeApprovalNumber: z.boolean().describe('Whether to override type approval number with OCR data.'),
        typeAndVariant: z.boolean().describe('Whether to override type and variant information with OCR data.'),
        versiyon: z.boolean().describe('Whether to override version information with OCR data.'), // Added versiyon
      }).describe('Decision on whether to override each field.'),
    }),
  },
  prompt: `You are an AI assistant that helps decide whether to override existing data with new OCR data. For each field, consider the following general rules:

*   **Prioritize Filling Empty Fields:** If the current data field is empty or null, and the OCR data field has a value, you should **always override** it.
*   **Completeness/Accuracy:** If the OCR data is more complete or looks more accurate (e.g., longer, fewer typos) than the current data, you should override it.
*   **Incorrect OCR:** If the OCR data is less complete, less accurate, or clearly wrong compared to the current data, you should not override it.
*   **Same Data:** If the OCR data and the current data are effectively the same (ignoring minor case/whitespace differences), you should not override it.

**Specific Instructions for 'owner' (Adı Soyadı):**
*   If the current 'owner' field is empty and the OCR 'owner' has a name (e.g., "AHMET YILMAZ"), set 'override.owner' to true.

Given the following OCR data and current data, decide whether to override each field. Return a JSON object indicating whether to override each field:

OCR Data: {{{json ocrData}}}
Current Data: {{{json currentData}}}
`,
});

const decideOcrOverrideFlow = ai.defineFlow<
  typeof DecideOcrOverrideInputSchema,
  typeof DecideOcrOverrideOutputSchema
>({
  name: 'decideOcrOverrideFlow',
  inputSchema: DecideOcrOverrideInputSchema,
  outputSchema: DecideOcrOverrideOutputSchema,
}, async input => {
   let output: DecideOcrOverrideOutput | undefined;
    try {
        // Destructure the output directly from the prompt call
        const { output: promptOutput } = await prompt(input);
        output = promptOutput;
    } catch (error) {
        console.error("Error calling decideOcrOverridePrompt:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
         if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('service unavailable') || errorMessage.includes('500 Internal Server Error')) {
             // Re-throw a specific error for service unavailability or internal server error
             const errorType = errorMessage.includes('503') ? 'Yoğun/Kullanılamıyor' : 'Sunucu Hatası';
             throw new Error(`AI Service Unavailable: The model experienced an issue (${errorType}). Please try again later.`);
         }
         // Re-throw other errors
         throw new Error(`AI prompt error: ${errorMessage}`);
    }

    if (!output) {
        throw new Error("AI failed to generate an override decision.");
    }
  return output;
});
