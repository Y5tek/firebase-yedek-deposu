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
    owner: z.string().optional().describe('Owner extracted from OCR.'),
    typeApprovalNumber: z.string().optional().describe('Type approval number extracted from OCR.'),
    typeAndVariant: z.string().optional().describe('Type and variant information extracted from OCR.'),
  }).describe('Data extracted from OCR.'),
  currentData: z.object({
    chassisNumber: z.string().optional().describe('Current chassis number.'),
    brand: z.string().optional().describe('Current brand.'),
    type: z.string().optional().describe('Current type.'),
    tradeName: z.string().optional().describe('Current trade name.'),
    owner: z.string().optional().describe('Current owner.'),
    typeApprovalNumber: z.string().optional().describe('Current type approval number.'),
    typeAndVariant: z.string().optional().describe('Current type and variant information.'),
  }).describe('Current data in the form.'),
});

export type DecideOcrOverrideInput = z.infer<typeof DecideOcrOverrideInputSchema>;

const DecideOcrOverrideOutputSchema = z.object({
  override: z.object({
    chassisNumber: z.boolean().describe('Whether to override chassis number with OCR data.'),
    brand: z.boolean().describe('Whether to override brand with OCR data.'),
    type: z.boolean().describe('Whether to override type with OCR data.'),
    tradeName: z.boolean().describe('Whether to override trade name with OCR data.'),
    owner: z.boolean().describe('Whether to override owner with OCR data.'),
    typeApprovalNumber: z.boolean().describe('Whether to override type approval number with OCR data.'),
    typeAndVariant: z.boolean().describe('Whether to override type and variant information with OCR data.'),
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
        owner: z.string().optional().describe('Owner extracted from OCR.'),
        typeApprovalNumber: z.string().optional().describe('Type approval number extracted from OCR.'),
        typeAndVariant: z.string().optional().describe('Type and variant information extracted from OCR.'),
      }).describe('Data extracted from OCR.'),
      currentData: z.object({
        chassisNumber: z.string().optional().describe('Current chassis number.'),
        brand: z.string().optional().describe('Current brand.'),
        type: z.string().optional().describe('Current type.'),
        tradeName: z.string().optional().describe('Current trade name.'),
        owner: z.string().optional().describe('Current owner.'),
        typeApprovalNumber: z.string().optional().describe('Current type approval number.'),
        typeAndVariant: z.string().optional().describe('Current type and variant information.'),
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
        owner: z.boolean().describe('Whether to override owner with OCR data.'),
        typeApprovalNumber: z.boolean().describe('Whether to override type approval number with OCR data.'),
        typeAndVariant: z.boolean().describe('Whether to override type and variant information with OCR data.'),
      }).describe('Decision on whether to override each field.'),
    }),
  },
  prompt: `You are an AI assistant that helps decide whether to override existing data with new OCR data. For each field, consider the following:

*   If the current data is empty, you should override it with the OCR data.
*   If the OCR data is more complete or accurate than the current data, you should override it.
*   If the OCR data is less complete or accurate than the current data, you should not override it.
*   If the OCR data and the current data are the same, you should not override it.

Given the following OCR data and current data, decide whether to override each field. Return a JSON object indicating whether to override each field:

OCR Data: {{{ocrData}}}
Current Data: {{{currentData}}}
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
  const {output} = await prompt(input);
  return output!;
});
