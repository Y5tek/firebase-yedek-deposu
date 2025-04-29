/**
 * Represents information extracted from a document using OCR.
 */
export interface OcrData {
    /**
     * The chassis number extracted from the document.
     */
    chassisNumber: string;
    /**
     * The brand name extracted from the document.
     */
    brand: string;
    /**
     * The type of vehicle extracted from the document.
     */
    type: string;
    /**
     * The trade name extracted from the document.
     */
    tradeName: string;
    /**
     * The owner's name extracted from the document.
     */
    owner: string;
    /**
     * The type approval number extracted from the document.
     */
    typeApprovalNumber: string;
    /**
     * The type and variant information extracted from the document.
     */
    typeAndVariant: string;
}

/**
 * Asynchronously extracts data from an image using OCR.
 *
 * @param imageBase64 The base64 encoded string of the image to process.
 * @returns A promise that resolves to an OcrData object containing the extracted information.
 */
export async function extractDataFromImage(imageBase64: string): Promise<OcrData> {
    // TODO: Implement this by calling an OCR API.

    return {
        chassisNumber: 'chassis-123',
        brand: 'Example Brand',
        type: 'Example Type',
        tradeName: 'Example Trade Name',
        owner: 'Example Owner',
        typeApprovalNumber: 'TAN123',
        typeAndVariant: 'Type A, Variant B'
    };
}
