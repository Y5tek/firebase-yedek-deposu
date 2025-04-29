
/**
 * Represents information extracted from a document using OCR.
 * All fields are optional as OCR might not always find every piece of information.
 */
export interface OcrData {
    /**
     * The chassis number extracted from the document.
     */
    chassisNumber?: string;
    /**
     * The brand name extracted from the document.
     */
    brand?: string;
    /**
     * The type of vehicle extracted from the document (corresponding to "Tipi").
     */
    type?: string;
    /**
     * The trade name extracted from the document.
     */
    tradeName?: string;
    /**
     * The owner's name extracted from the document.
     */
    owner?: string;
    /**
     * The license plate number extracted from the document.
     */
    plateNumber?: string;
    /**
     * The type approval number extracted from the document.
     */
    typeApprovalNumber?: string;
    /**
     * The type and variant information extracted from the document.
     */
    typeAndVariant?: string;
}

/**
 * Placeholder function. The actual data extraction is performed by the
 * `extractVehicleDataFlow` Genkit flow defined in `src/ai/flows/extract-vehicle-data-from-image.ts`.
 * This function signature is kept for potential future non-AI OCR integrations or utilities.
 *
 * @param imageBase64 The base64 encoded string of the image to process.
 * @returns A promise that resolves to an OcrData object. Currently throws an error as it's not implemented.
 */
export async function extractDataFromImage(imageBase64: string): Promise<OcrData> {
    // Actual OCR extraction is handled by the AI flow.
    // This function is not directly called by the AI flow path anymore.
    console.error("extractDataFromImage service function was called directly, but OCR is handled by AI flow.");
    throw new Error("OCR extraction is handled by the Genkit AI flow, not this service function directly.");
    // If you need a non-AI OCR implementation later, implement it here.
}
