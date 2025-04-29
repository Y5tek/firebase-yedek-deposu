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
     * The type approval number extracted from the document.
     */
    typeApprovalNumber?: string;
    /**
     * The type and variant information extracted from the document.
     */
    typeAndVariant?: string;
}

/**
 * Asynchronously extracts data from an image using OCR.
 *
 * @param imageBase64 The base64 encoded string of the image to process.
 * @returns A promise that resolves to an OcrData object containing the extracted information. Returns optional fields.
 */
export async function extractDataFromImage(imageBase64: string): Promise<OcrData> {
    // TODO: Implement this by calling a real OCR API.
    // This is a mock implementation for demonstration purposes.
    console.log("Mock OCR Service: Processing image...");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate potential partial data extraction
    const mockData: OcrData = {
        chassisNumber: `SASE${Math.floor(100000 + Math.random() * 900000)}`, // Example: SASE123456
        brand: 'ÖRNEK MARKA', // Example Turkish Brand
        type: `MODEL ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`, // Example: MODEL X
        tradeName: 'ÖRNEK TİCARİ AD', // Example Turkish Trade Name
        owner: 'Ali Veli', // Example Turkish Owner Name
        typeApprovalNumber: `ONAY${Math.floor(1000 + Math.random() * 9000)}`, // Example: ONAY1234
        typeAndVariant: `Tip ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}/Varyant ${Math.floor(1 + Math.random() * 3)}` // Example: Tip A/Varyant 1
    };

     // Simulate sometimes failing to extract certain fields
     if (Math.random() > 0.8) delete mockData.tradeName;
     if (Math.random() > 0.9) delete mockData.typeApprovalNumber;


    console.log("Mock OCR Service: Extracted Data:", mockData);
    return mockData;
}
