// noinspection JSUnusedLocalSymbols
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, FileText, Loader2, Image as ImageIcon, AlertCircle, ScanSearch } from 'lucide-react';
import { useAppState, RecordData } from '@/hooks/use-app-state';
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image';
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ExtractVehicleDataOutput } from '@/ai/flows/extract-vehicle-data-from-image';
import type { DecideOcrOverrideOutput } from '@/ai/flows/decide-ocr-override';
import { getSerializableFileInfo } from '@/lib/utils';

// Schema for the form fields including the initial OCR fields and plateNumber
const FormSchema = z.object({
  chassisNumber: z.string().optional(),
  brand: z.string().optional(),
  type: z.string().optional(), // Corresponds to "tipi" from the document
  tradeName: z.string().optional(),
  owner: z.string().optional(),
  plateNumber: z.string().optional(),
  document: z.any().optional()
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep1() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(14); // Step 1 of 7 (approx 14%)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [ocrError, setOcrError] = React.useState<string | null>(null); // State for OCR errors
  const [currentFile, setCurrentFile] = React.useState<File | null>(null); // Keep track of the current File object

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    // Default values are loaded from recordData in useEffect, no need to set them here explicitly
    // except maybe for ensuring they exist if recordData is partially loaded
     defaultValues: {
      chassisNumber: recordData.chassisNumber || '',
      brand: recordData.brand || '',
      type: recordData.type || '',
      tradeName: recordData.tradeName || '',
      owner: recordData.owner || '',
      plateNumber: recordData.plateNumber || '',
      document: recordData.registrationDocument || null,
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper function to handle potential 503 errors from AI flows
  const handleAiError = (error: unknown, step: number) => {
    console.error(`AI/OCR error in Step ${step}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir yapay zeka hatası oluştu.';

    // Check for specific AI Service Unavailable error
     if (errorMessage.includes('AI Service Unavailable') || errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('service unavailable') || errorMessage.includes('500 Internal Server Error')) {
        const errorTypeMatch = errorMessage.match(/\(([^)]+)\)/); // Extract text within parentheses if available
        const errorType = errorTypeMatch ? errorTypeMatch[1] : (errorMessage.includes('503') ? 'Yoğun/Kullanılamıyor' : (errorMessage.includes('500') ? 'Sunucu Hatası' : 'Bilinmeyen Sunucu Sorunu'));
        const userMsg = `Yapay zeka servisinde geçici bir sorun (${errorType}) yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin veya bilgileri manuel girin.`;
        setOcrError(userMsg);
        toast({
            title: 'Servis Hatası',
            description: userMsg,
            variant: 'destructive',
            duration: 7000, // Longer duration for service errors
        });
    } else {
        // Handle other generic errors
        const userFriendlyMessage = `Belge okunurken bir hata oluştu (Adım ${step}). Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin.`;
        setOcrError(userFriendlyMessage + (errorMessage.includes('AI prompt error:') ? '' : ` Detay: ${errorMessage}`)); // Show technical details only if not already prefixed
        toast({
            title: `Yapay Zeka Hatası (Adım ${step})`,
            description: userFriendlyMessage,
            variant: 'destructive',
            duration: 5000,
        });
    }
    setIsLoading(false); // Ensure loading state is reset on error
  };


  // Function to handle the OCR process
  const initiateOcrScan = React.useCallback(async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setOcrError(null);
    console.log("Starting OCR scan for Step 1...");

    let base64String: string;
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => resolve();
        reader.onerror = (error) => reject(error); // Pass error to reject
      });
      base64String = reader.result as string;
    } catch (error) {
      console.error('File handling/reading error in Step 1:', error);
      toast({
        title: 'Dosya Hatası',
        description: 'Dosya okunurken veya işlenirken bir hata oluştu.',
        variant: 'destructive',
      });
      setIsLoading(false);
      setOcrError('Dosya okunurken bir hata oluştu.');
      return; // Exit if file reading fails
    }

    let ocrResult: ExtractVehicleDataOutput | null = null;
    let overrideDecision: DecideOcrOverrideOutput | null = null;
    const updates: Partial<RecordData> = {}; // Use RecordData type

    try {
      console.log("Calling extractVehicleData flow...");
      ocrResult = await extractVehicleData({ imageBase64: base64String });
      console.log("OCR Result (Step 1):", ocrResult?.ocrData); // Use optional chaining
      console.log("OCR Extracted Brand (Step 1) - Raw:", ocrResult?.ocrData?.brand); // Log brand specifically
      console.log("OCR Extracted Owner (Step 1) - Raw:", ocrResult?.ocrData?.owner); // Log owner specifically


      // Proceed only if OCR data is available
      if (!ocrResult || !ocrResult.ocrData) {
          throw new Error("OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
      }

      const ocrData = ocrResult.ocrData;
      console.log("OCR Data Extracted (owner):", ocrData.owner); // Log owner specifically
      console.log("OCR Data Extracted (brand):", ocrData.brand); // Log brand specifically


      // --- START: Handle Override Decision ---
      // Get current form values *at the time of scanning* for the decision
      const currentDataForDecision = {
        chassisNumber: form.getValues('chassisNumber'),
        brand: form.getValues('brand'),
        type: form.getValues('type'),
        tradeName: form.getValues('tradeName'),
        owner: form.getValues('owner'),
        plateNumber: form.getValues('plateNumber'),
        // Also include potentially existing data from global state for fields not directly on this form
        typeApprovalNumber: recordData.typeApprovalNumber,
        typeAndVariant: recordData.typeAndVariant,
        versiyon: recordData.versiyon, // Added versiyon
      };
      console.log("Current Data for Override Decision (Step 1):", currentDataForDecision);
      console.log("Current Brand Value for Override Decision (Step 1):", currentDataForDecision.brand);
      console.log("Current Owner Value for Override Decision (Step 1):", currentDataForDecision.owner); // Log current owner
      console.log("Current Plate Number for Override Decision (Step 1):", currentDataForDecision.plateNumber); // Log current plate

      const ocrDataForDecision = {
        // Explicitly include fields expected by the decision flow
         chassisNumber: ocrData.chassisNumber || undefined,
         brand: ocrData.brand || undefined, // Include brand for decision logic
         type: ocrData.type || undefined,
         tradeName: ocrData.tradeName || undefined,
         owner: ocrData.owner || undefined,
         typeApprovalNumber: ocrData.typeApprovalNumber || undefined,
         typeAndVariant: ocrData.typeAndVariant || undefined,
         versiyon: ocrData.versiyon || undefined,
      };
      console.log("OCR Data for Override Decision (Step 1):", ocrDataForDecision);
      console.log("OCR Brand for Override Decision (Step 1):", ocrDataForDecision.brand);
      console.log("OCR Owner for Override Decision (Step 1):", ocrDataForDecision.owner); // Log OCR owner

      console.log("Calling decideOcrOverride flow...");
      overrideDecision = await decideOcrOverride({
        ocrData: ocrDataForDecision,
        currentData: currentDataForDecision
      });
      console.log("Override Decision (Step 1):", overrideDecision?.override); // Use optional chaining
      console.log("Override Decision for owner:", overrideDecision?.override?.owner); // Log owner decision
      console.log("Override Decision for brand:", overrideDecision?.override?.brand); // Log brand decision


      if (!overrideDecision || !overrideDecision.override) {
           throw new Error("Geçersiz kılma kararı alınamadı.");
      }
      // --- END: Handle Override Decision ---

      // --- Update form fields and prepare global state updates based on the OCR data and override decision ---
      const override = overrideDecision.override;

       // Function to decide if a field should be updated based on override OR if current is empty
       const shouldUpdate = (fieldName: keyof typeof override): boolean => {
         const ocrValue = ocrData[fieldName as keyof typeof ocrData];
         const currentValue = form.getValues(fieldName as keyof FormData);
         // Update if OCR has value AND (current is empty OR override is true)
         const condition = !!(ocrValue && ocrValue.trim() !== '' && (!currentValue || currentValue.trim() === '' || override[fieldName]));

         console.log(`shouldUpdate(${fieldName})? OCR: '${ocrValue}', Current: '${currentValue}', Override: ${override[fieldName]}, Result: ${condition}`);
         return condition;
       };


      // Update chassisNumber field
      if (shouldUpdate('chassisNumber')) {
        const ocrValue = ocrData.chassisNumber || '';
        console.log("Updating chassisNumber field with OCR data:", ocrValue);
        form.setValue('chassisNumber', ocrValue);
        updates.chassisNumber = ocrValue;
      } else {
          // Clear field if OCR has no value OR if AI decided not to override
          const currentValue = form.getValues('chassisNumber');
          const ocrValue = ocrData.chassisNumber;
          if (!ocrValue || !override.chassisNumber) {
               console.log(`Clearing chassisNumber. OCR Data: ${ocrValue}, Override: ${override.chassisNumber}`);
               form.setValue('chassisNumber', ''); // Clear the form field
               updates.chassisNumber = ''; // Ensure global state is cleared too
          } else {
              console.log(`Keeping existing chassisNumber. Current Value: ${currentValue}`);
              updates.chassisNumber = currentValue || recordData.chassisNumber; // Preserve existing if override is false but OCR had value
          }
      }


       // Update brand field
       if (shouldUpdate('brand')) {
            const ocrValue = ocrData.brand || '';
            console.log("[OCR Update] Setting brand field with OCR data:", ocrValue);
            form.setValue('brand', ocrValue);
            updates.brand = ocrValue;
       } else {
            const currentValue = form.getValues('brand');
            const ocrValue = ocrData.brand;
            if (!ocrValue || !override.brand) {
                console.log(`[OCR Update] Clearing brand. OCR: ${ocrValue}, Override: ${override.brand}`);
                form.setValue('brand', '');
                updates.brand = '';
            } else {
                 console.log(`[OCR Update] Keeping existing brand. Current: ${currentValue}`);
                 updates.brand = currentValue || recordData.brand;
            }
       }


      // Update type field
      if (shouldUpdate('type')) {
          const ocrValue = ocrData.type || '';
          console.log("Updating type field with OCR data:", ocrValue);
          form.setValue('type', ocrValue); // Use fallback
          updates.type = ocrValue;
      } else {
          const currentValue = form.getValues('type');
          const ocrValue = ocrData.type;
           if (!ocrValue || !override.type) {
               console.log(`Clearing type. OCR Data: ${ocrValue}, Override: ${override.type}`);
               form.setValue('type', ''); // Clear the form field
               updates.type = ''; // Ensure global state is cleared too
           } else {
               console.log(`Keeping existing type. Current Value: ${currentValue}`);
               updates.type = currentValue || recordData.type;
           }
      }

      // Update tradeName field
      if (shouldUpdate('tradeName')) {
          const ocrValue = ocrData.tradeName || '';
          console.log("Updating tradeName field with OCR data:", ocrValue);
          form.setValue('tradeName', ocrValue); // Use fallback
          updates.tradeName = ocrValue;
      } else {
           const currentValue = form.getValues('tradeName');
           const ocrValue = ocrData.tradeName;
           if (!ocrValue || !override.tradeName) {
               console.log(`Clearing tradeName. OCR Data: ${ocrValue}, Override: ${override.tradeName}`);
               form.setValue('tradeName', ''); // Clear the form field
               updates.tradeName = ''; // Ensure global state is cleared too
           } else {
               console.log(`Keeping existing tradeName. Current Value: ${currentValue}`);
                updates.tradeName = currentValue || recordData.tradeName;
           }
      }

      // Update owner field
      if (shouldUpdate('owner')) {
          const ocrValue = ocrData.owner || '';
          console.log("Updating owner field with OCR data:", ocrValue);
          form.setValue('owner', ocrValue); // Use fallback
          updates.owner = ocrValue;
      } else {
          const currentValue = form.getValues('owner');
          const ocrValue = ocrData.owner;
          if (!ocrValue || !override.owner) {
               console.log(`Clearing owner. OCR Data: ${ocrValue}, Override: ${override.owner}`);
               form.setValue('owner', ''); // Clear the form field
               updates.owner = ''; // Ensure global state is cleared too
           } else {
               console.log(`Keeping existing owner. Current Value: ${currentValue}`);
                updates.owner = currentValue || recordData.owner;
           }
      }

       // Update plateNumber field
       // Check if 'plateNumber' key exists in override object before accessing it
       const overridePlate = override.plateNumber !== undefined ? override.plateNumber : true; // Default to true if not present
       if (ocrData.plateNumber && (!form.getValues('plateNumber') || overridePlate)) {
            const ocrValue = ocrData.plateNumber || '';
            console.log("Updating plateNumber field with OCR data:", ocrValue);
            form.setValue('plateNumber', ocrValue);
            updates.plateNumber = ocrValue;
       } else {
             const currentValue = form.getValues('plateNumber');
             const ocrValue = ocrData.plateNumber;
              // Clear only if OCR didn't find it OR if AI said not to override
             if (!ocrValue || !overridePlate) {
                 console.log(`Clearing plateNumber. OCR Data: ${ocrValue}, Override: ${overridePlate}`);
                 form.setValue('plateNumber', ''); // Clear the form field
                 updates.plateNumber = ''; // Ensure global state is cleared too
             } else {
                 console.log(`Keeping existing plateNumber. Current Value: ${currentValue}`);
                 updates.plateNumber = currentValue || recordData.plateNumber;
             }
       }


      // Update global state for step 2 fields if decision suggests it (these are not form fields here)
      // Using a separate check as these aren't form fields in Step 1
       const shouldUpdateGlobal = (fieldName: keyof typeof override): boolean => {
         const ocrValue = ocrData[fieldName as keyof typeof ocrData];
         const currentGlobalValue = recordData[fieldName as keyof RecordData]; // Check against global state
         // Update if OCR has value AND (current global is empty OR override is true)
         const condition = !!(ocrValue && ocrValue.trim() !== '' && (!currentGlobalValue || currentGlobalValue.trim() === '' || override[fieldName]));
         console.log(`shouldUpdateGlobal(${fieldName})? OCR: '${ocrValue}', Current Global: '${currentGlobalValue}', Override: ${override[fieldName]}, Result: ${condition}`);
         return condition;
       };



       if (shouldUpdateGlobal('typeApprovalNumber')) {
           console.log("Preparing update for typeApprovalNumber in global state:", ocrData.typeApprovalNumber);
           updates.typeApprovalNumber = ocrData.typeApprovalNumber;
       } else {
            console.log(`Not updating typeApprovalNumber globally. Override: ${override.typeApprovalNumber}, OCR Data: ${ocrData.typeApprovalNumber}, Current Global: ${recordData.typeApprovalNumber}`);
            // Preserve existing global state value if not overriding
            updates.typeApprovalNumber = recordData.typeApprovalNumber;
       }

       if (shouldUpdateGlobal('typeAndVariant')) {
            console.log("Preparing update for typeAndVariant in global state:", ocrData.typeAndVariant);
            updates.typeAndVariant = ocrData.typeAndVariant;
       } else {
            console.log(`Not updating typeAndVariant globally. Override: ${override.typeAndVariant}, OCR Data: ${ocrData.typeAndVariant}, Current Global: ${recordData.typeAndVariant}`);
             // Preserve existing global state value if not overriding
             updates.typeAndVariant = recordData.typeAndVariant;
       }

        if (shouldUpdateGlobal('versiyon')) { // Added versiyon check
            console.log("Preparing update for versiyon in global state:", ocrData.versiyon);
            updates.versiyon = ocrData.versiyon;
        } else {
            console.log(`Not updating versiyon globally. Override: ${override.versiyon}, OCR Data: ${ocrData.versiyon}, Current Global: ${recordData.versiyon}`);
            updates.versiyon = recordData.versiyon;
        }

        // --- Add the scanned registration document to additionalPhotos ---
         const currentPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File || (typeof f === 'object' && f !== null && 'name' in f)) as (File | { name: string; type?: string; size?: number; })[];
         const fileKey = `${file.name}-${file.size}`;

         // Check if a file/info with the same key exists
         const exists = currentPhotos.some(p => {
             const pKey = `${p.name}-${'size' in p ? p.size : ''}`;
             return pKey === fileKey;
         });

         if (!exists) {
             // Add the new File object
             updates.additionalPhotos = [...currentPhotos, file];
             console.log(`Adding scanned registration document '${file.name}' to additionalPhotos.`);
         } else {
              console.log(`Scanned registration document '${file.name}' already exists in additionalPhotos.`);
              // No need to update if it exists, but ensure the state reflects the current array structure
               updates.additionalPhotos = currentPhotos.map(p => p instanceof File ? p : getSerializableFileInfo(p)).filter(Boolean) as (File | { name: string; type?: string; size?: number; })[];
         }


      toast({
        title: 'Başarılı',
        description: 'Araç ruhsatı bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
      });

    } catch (aiError) {
      // Handle AI specific errors (including potential 503)
      handleAiError(aiError, 1);
       // Fallback: if OCR worked but decision failed, still populate *empty* form fields
       // AND CLEAR NON-EMPTY FIELDS THAT OCR DID NOT FIND
       if (ocrResult && ocrResult.ocrData) { // Removed !overrideDecision check
            console.warn("AI Error occurred, applying OCR data with fallback logic (populating empty, clearing non-found).");
            const ocrDataFallback = ocrResult.ocrData;
            const fieldsToCheck: (keyof FormData)[] = ['chassisNumber', 'brand', 'type', 'tradeName', 'owner', 'plateNumber'];

            fieldsToCheck.forEach(field => {
                 const formValue = form.getValues(field);
                 const ocrValue = ocrDataFallback[field as keyof typeof ocrDataFallback];
                 if (ocrValue) { // If OCR found something
                     if (!formValue) { // And form is empty
                         console.log(`[Fallback] Populating ${field} with OCR data: ${ocrValue}`);
                         form.setValue(field, ocrValue);
                         updates[field as keyof RecordData] = ocrValue;
                     } else {
                         // Keep existing form value if OCR found something but form wasn't empty (AI error prevents override decision)
                         console.log(`[Fallback] Keeping existing ${field} value: ${formValue} (OCR found: ${ocrValue})`);
                         updates[field as keyof RecordData] = formValue || recordData[field as keyof RecordData];
                     }
                 } else { // If OCR did NOT find something
                      console.log(`[Fallback] Clearing ${field} because OCR did not find data.`);
                      form.setValue(field, ''); // Clear the form field
                      updates[field as keyof RecordData] = ''; // Ensure global state is cleared too
                 }
            });


             // Fallback for global state fields (take existing or OCR if existing is empty)
             updates.typeApprovalNumber = recordData.typeApprovalNumber || ocrDataFallback.typeApprovalNumber;
             updates.typeAndVariant = recordData.typeAndVariant || ocrDataFallback.typeAndVariant;
             updates.versiyon = recordData.versiyon || ocrDataFallback.versiyon; // Added versiyon

             // Also add the file to additional photos in fallback scenario if it's not there
             const currentPhotosFallback = (recordData.additionalPhotos || []).filter(f => f instanceof File || (typeof f === 'object' && f !== null && 'name' in f)) as (File | { name: string; type?: string; size?: number; })[];

              const fileKeyFallback = `${file.name}-${file.size}`;
              const existsFallback = currentPhotosFallback.some(p => {
                  const pKey = `${p.name}-${'size' in p ? p.size : ''}`;
                  return pKey === fileKeyFallback;
              });

             if (!existsFallback) {
                 updates.additionalPhotos = [...currentPhotosFallback, file];
                  console.log(`[Fallback] Adding scanned registration document '${file.name}' to additionalPhotos.`);
             } else {
                 updates.additionalPhotos = currentPhotosFallback.map(p => p instanceof File ? p : getSerializableFileInfo(p)).filter(Boolean) as (File | { name: string; type?: string; size?: number; })[];

             }

       } else {
           // If OCR itself failed or decision failed without OCR fallback,
           // ensure updates reflect current form/state values for consistency
           console.warn("OCR Scan or AI Decision completely failed. Preserving current form/state values.");
           updates.chassisNumber = form.getValues('chassisNumber') || recordData.chassisNumber;
           updates.brand = form.getValues('brand') || recordData.brand;
           updates.type = form.getValues('type') || recordData.type;
           updates.tradeName = form.getValues('tradeName') || recordData.tradeName;
           updates.owner = form.getValues('owner') || recordData.owner;
           updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber; // Still keep plate if manually entered
           updates.typeApprovalNumber = recordData.typeApprovalNumber; // Keep existing global
           updates.typeAndVariant = recordData.typeAndVariant;     // Keep existing global
           updates.versiyon = recordData.versiyon; // Keep existing global versiyon
            // Preserve existing additional photos if OCR failed completely
           updates.additionalPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File || (typeof f === 'object' && f !== null && 'name' in f)) as (File | { name: string; type?: string; size?: number; })[];

       }

    } finally {
       // Update app state with the collected updates and the file itself
       console.log("Updating global state with:", { ...updates, registrationDocument: file });
       // Update global state, ensuring File object is stored correctly
       // Use getSerializableFileInfo only when persisting, not here
       updateRecordData({ ...updates, registrationDocument: file });
       setIsLoading(false);
       console.log("OCR Scan finished for Step 1.");
    }

  }, [form, recordData, updateRecordData, toast]);


  // Revoke object URL on unmount or change & Setup initial preview
  React.useEffect(() => {
    let url: string | null = null;
    const setupPreview = () => {
      const currentDoc = recordData.registrationDocument;
      if (currentDoc instanceof File) {
        const file = currentDoc;
        setCurrentFile(file);
        url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
        form.setValue('document', file); // Keep the File object in the form state for validation etc.
        console.log("Setting up preview for File:", file.name);
      } else if (typeof currentDoc === 'object' && currentDoc?.name) {
        // If it's serializable info (from persisted state), no preview
        setCurrentFile(null); // No actual File object here
        setImagePreviewUrl(null);
        form.setValue('document', currentDoc); // Keep the info for the field
        console.log("Setting up preview with persisted info:", currentDoc.name);
      } else {
        // Reset if neither File nor info object exists
        setCurrentFile(null);
        setImagePreviewUrl(null);
        form.setValue('document', null);
        console.log("Resetting document field and preview.");
      }
    };

    setupPreview();

    return () => {
      if (url) {
        console.log("Revoking preview URL:", url);
        URL.revokeObjectURL(url);
        setImagePreviewUrl(null); // Also clear the state url
      }
    };
    // Only re-run if the registrationDocument itself changes identity or type
    // form is intentionally omitted to avoid re-running on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordData.registrationDocument]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setOcrError(null); // Clear previous errors on new file selection

    if (file) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl); // Clean up old preview URL
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(newPreviewUrl);
      setCurrentFile(file); // Store the actual File object

      form.setValue('document', file); // Set the File object in the form state
      updateRecordData({ registrationDocument: file }); // Update global state with File object
      console.log("File selected:", file.name);

      // Reset text fields when a new image is uploaded - KEEP THIS BEHAVIOR
      // form.resetField('chassisNumber');
      // form.resetField('brand');
      // form.resetField('type');
      // form.resetField('tradeName');
      // form.resetField('owner');
      // form.resetField('plateNumber');
      // console.log("Cleared text fields after new file upload.");

    } else {
      // Handle case where file selection is cancelled or no file is chosen
      if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(null);
      }
      setCurrentFile(null);
      form.setValue('document', null);
      // Use undefined to explicitly clear the document in global state
      updateRecordData({ registrationDocument: undefined });
       console.log("File selection cancelled or no file chosen.");
    }
      // Reset the input value to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
  };

   const handleManualScanClick = () => {
     if (currentFile && !isLoading) {
        console.log("Manual scan button clicked for Step 1");
       initiateOcrScan(currentFile);
     } else if (!currentFile) {
       toast({
         title: 'Dosya Seçilmedi',
         description: 'Lütfen önce taranacak bir resim dosyası seçin.',
         variant: 'destructive',
       });
     }
   };

  const onSubmit = (data: FormData) => {
    // Check if there is a current file or if there's file info from persisted state
    const documentValue = form.getValues('document');
    const hasDocument = currentFile || (typeof documentValue === 'object' && documentValue?.name);

    if (!hasDocument) {
        toast({
            title: 'Eksik Bilgi',
            description: 'Lütfen devam etmeden önce bir ruhsat belgesi yükleyin.',
            variant: 'destructive',
        });
        return;
    }

    // Prioritize the current File object if it exists, otherwise use persisted info
    const documentToSave = currentFile || recordData.registrationDocument;

    console.log("Submitting Step 1 Data:", data);
    console.log("Document to save (or info):", documentToSave);

    // Update global state, ensuring the file (or its info) is correctly passed
    // Get values directly from the form state at submission time
    updateRecordData({
        chassisNumber: form.getValues('chassisNumber'),
        brand: form.getValues('brand'),
        type: form.getValues('type'),
        tradeName: form.getValues('tradeName'),
        owner: form.getValues('owner'),
        plateNumber: form.getValues('plateNumber'),
        // Save the actual File object if available, otherwise the info object
        registrationDocument: documentToSave
    });
    router.push('/new-record/step-2');
  };

  // Load initial data from state only on mount, and only if not editing
  React.useEffect(() => {
      if (!branch) {
          router.push('/select-branch');
          return; // Early return if no branch
      }

       // Load existing data into the form instead of resetting to empty
      // This ensures data is preserved when navigating back and forth
      const currentDoc = recordData.registrationDocument;
      form.reset({
          chassisNumber: recordData.chassisNumber || '',
          brand: recordData.brand || '',
          type: recordData.type || '',
          tradeName: recordData.tradeName || '',
          owner: recordData.owner || '',
          plateNumber: recordData.plateNumber || '',
          // Set the document field correctly based on whether it's a File or info
          document: currentDoc instanceof File ? currentDoc : (typeof currentDoc === 'object' && currentDoc?.name ? currentDoc : null),
      });

      // Setup preview based on loaded document (already handled by the other useEffect)
      console.log("Step 1 Initialized/Synced for branch:", branch, "Loaded data:", recordData);

      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, router]); // Depend on recordData only for initial load, not every change


  if (!branch) {
    return <div className="flex min-h-screen items-center justify-center p-4">Şube seçimine yönlendiriliyorsunuz...</div>;
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="text-primary" />
            Yeni Kayıt - Adım 1: Araç Ruhsatı
          </CardTitle>
          <CardDescription>
            Lütfen araç ruhsatını yükleyin ve 'Resmi Tara' butonu ile bilgileri alın. Alanlar OCR sonrası güncellenir.
            (Şube: {branch})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruhsat Belgesi</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                        {imagePreviewUrl ? (
                          <div className="relative w-full max-w-xs h-48 mb-4">
                            <Image
                              src={imagePreviewUrl}
                              alt="Yüklenen Belge Önizlemesi"
                              fill
                              style={{ objectFit: 'contain' }}
                              className="rounded-md"
                              unoptimized // Use unoptimized for local object URLs
                              data-ai-hint="vehicle registration document"
                            />
                          </div>
                        ) : (
                           // Display placeholder if there's persisted info but no preview URL
                           typeof field.value === 'object' && field.value?.name ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 text-center">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                    <span>Kayıtlı Belge: {field.value.name}</span>
                                    <span className="text-xs">(Önizleme mevcut değil, yeni dosya yükleyebilir veya tarayabilirsiniz)</span>
                                </div>
                            ) : (
                               <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                  <ImageIcon className="w-12 h-12 mb-2" />
                                  <span>Belge önizlemesi burada görünecek</span>
                               </div>
                           )
                        )}

                         {currentFile?.name ? (
                            <p className="text-sm text-muted-foreground">Şu an yüklü: {currentFile.name}</p>
                         ) : typeof field.value === 'object' && field.value?.name ? (
                             <p className="text-sm text-muted-foreground">Kayıtlı: {field.value.name}</p>
                         ) : !imagePreviewUrl && (
                           <p className="text-sm text-muted-foreground">Belge yüklemek için tıklayın veya sürükleyip bırakın.</p>
                         )}


                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                          disabled={isLoading}
                        />
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            <Upload className="mr-2 h-4 w-4" /> {currentFile || (typeof field.value === 'object' && field.value?.name) ? 'Değiştir' : 'Dosya Seç'}
                          </Button>
                           <Button
                                type="button"
                                variant="secondary"
                                onClick={handleManualScanClick}
                                disabled={!(currentFile || (typeof field.value === 'object' && field.value?.name)) || isLoading} // Enable if either a current file OR persisted info exists
                           >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                                Resmi Tara (OCR)
                           </Button>
                          <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: 'Yakında', description: 'Kamera özelliği eklenecektir.' })}>
                            <Camera className="mr-2 h-4 w-4" /> Kamera ile Tara
                          </Button>
                        </div>
                        {ocrError && !isLoading && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Yapay Zeka/OCR Hatası</AlertTitle>
                            <AlertDescription>{ocrError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </FormControl>
                     {/* Display form message if there's an error related to the document field itself (e.g., required but missing) */}
                     <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auto-filled Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="chassisNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şase Numarası</FormLabel>
                      <FormControl>
                        <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="plateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plaka</FormLabel>
                        <FormControl>
                          <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                {/* Brand field */}
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Markası</FormLabel> {/* Changed label */}
                      <FormControl>
                        <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip</FormLabel>
                      <FormControl>
                        <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticari Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adı Soyadı</FormLabel> {/* Changed label */}
                        <FormControl>
                          <Input placeholder="Resmi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || !(currentFile || (typeof form.getValues('document') === 'object' && form.getValues('document')?.name))}>
                Devam Et
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}