
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
import type { OcrData as ExtractedOcrData } from '@/services/ocr'; // Import OcrData type

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
    // Define fields ON THIS FORM that OCR attempts to extract
    const ocrTargetedFormFields: (keyof FormData)[] = ['chassisNumber', 'brand', 'type', 'tradeName', 'owner'];
    // Define global state fields potentially affected by OCR (even if not directly on this form)
    const ocrTargetedGlobalFields: (keyof ExtractedOcrData)[] = ['typeApprovalNumber', 'typeAndVariant', 'versiyon'];

    try {
      console.log("Calling extractVehicleData flow...");
      ocrResult = await extractVehicleData({ imageBase64: base64String });
      console.log("OCR Result (Step 1):", ocrResult?.ocrData); // Use optional chaining
      console.log("OCR Extracted Brand (Step 1) - Raw:", ocrResult?.ocrData?.brand); // Log brand specifically
      console.log("OCR Extracted Owner (Step 1) - Raw:", ocrResult?.ocrData?.owner); // Log owner specifically

      if (!ocrResult || !ocrResult.ocrData) {
          throw new Error("OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
      }

      const ocrData = ocrResult.ocrData;
      console.log("OCR Data Extracted (owner):", ocrData.owner); // Log owner specifically
      console.log("OCR Data Extracted (brand):", ocrData.brand); // Log brand specifically

      // --- START: Handle Override Decision ---
      // Include all fields relevant for the decision, pulling current values from form or global state
      const currentDataForDecision = {
        chassisNumber: form.getValues('chassisNumber'),
        brand: form.getValues('brand'),
        type: form.getValues('type'),
        tradeName: form.getValues('tradeName'),
        owner: form.getValues('owner'),
        plateNumber: form.getValues('plateNumber'), // Include plateNumber for context, but it's not OCR target
        // Pull global state values for decision context
        typeApprovalNumber: recordData.typeApprovalNumber,
        typeAndVariant: recordData.typeAndVariant,
        versiyon: recordData.versiyon,
      };
      console.log("Current Data for Override Decision (Step 1):", currentDataForDecision);

      // Prepare OCR data for decision, ensuring all keys are present (even if undefined)
      const ocrDataForDecision = {
         chassisNumber: ocrData.chassisNumber || undefined,
         brand: ocrData.brand || undefined,
         type: ocrData.type || undefined,
         tradeName: ocrData.tradeName || undefined,
         owner: ocrData.owner || undefined,
         // plateNumber: undefined, // Plate number is not extracted by OCR flow currently
         typeApprovalNumber: ocrData.typeApprovalNumber || undefined,
         typeAndVariant: ocrData.typeAndVariant || undefined,
         versiyon: ocrData.versiyon || undefined,
      };
      console.log("OCR Data for Override Decision (Step 1):", ocrDataForDecision);


      console.log("Calling decideOcrOverride flow...");
      overrideDecision = await decideOcrOverride({
        ocrData: ocrDataForDecision,
        currentData: currentDataForDecision
      });
      console.log("Override Decision (Step 1):", overrideDecision?.override); // Use optional chaining

      if (!overrideDecision || !overrideDecision.override) {
           throw new Error("Geçersiz kılma kararı alınamadı.");
      }
      // --- END: Handle Override Decision ---

      const override = overrideDecision.override;

      // --- Update form fields based on OCR and override decision ---
      // Iterate only over fields OCR specifically targets on this form
      ocrTargetedFormFields.forEach(field => {
        const ocrValue = ocrData[field as keyof typeof ocrData]; // Get corresponding OCR value
        const currentValue = form.getValues(field);
        const shouldOverride = override[field as keyof typeof override];

        if (!ocrValue || ocrValue.trim() === '') {
          // OCR did not find data for this TARGETED field
          // Only clear the field if AI decision says to override (meaning replace empty/existing with nothing) OR if the current field is empty
          if (shouldOverride || !currentValue || currentValue.trim() === '') {
            console.log(`[OCR Update] Clearing TARGETED form field ${field} because OCR did not find data and override decision allows.`);
            form.setValue(field, '');
            updates[field as keyof RecordData] = '';
          } else {
            console.log(`[OCR Update] Keeping existing value for TARGETED form field ${field}. OCR did not find data, but override decision is false or field has value.`);
            updates[field as keyof RecordData] = currentValue; // Keep existing
          }
        } else {
          // OCR found data, apply override logic
          if (shouldOverride || !currentValue || currentValue.trim() === '') {
            // Override if AI says so OR if current field is empty
            console.log(`[OCR Update] Updating form field ${field} with OCR data: '${ocrValue}' (Override: ${shouldOverride}, Current Empty: ${!currentValue || currentValue.trim() === ''})`);
            form.setValue(field, ocrValue);
            updates[field as keyof RecordData] = ocrValue;
          } else {
            // Keep existing value if AI decided not to override and field is not empty
            console.log(`[OCR Update] Keeping existing form field ${field}. Current: '${currentValue}', OCR: '${ocrValue}', Override: ${shouldOverride}`);
            updates[field as keyof RecordData] = currentValue; // Keep existing value
          }
        }
      });

      // --- Update global state fields based on OCR and override decision ---
       ocrTargetedGlobalFields.forEach(fieldKey => {
           const ocrValue = ocrData[fieldKey]; // Get corresponding OCR value
           const currentGlobalValue = recordData[fieldKey as keyof RecordData]; // Get current global value
           const shouldOverride = override[fieldKey as keyof typeof override];

           if (!ocrValue || ocrValue.trim() === '') {
                // OCR did not find data for this TARGETED global field
                // Clear if AI says override OR current global is empty
                if (shouldOverride || !currentGlobalValue || currentGlobalValue.trim() === '') {
                   console.log(`[OCR Update - Global] Clearing TARGETED global field ${fieldKey} because OCR did not find data and override decision allows.`);
                   updates[fieldKey as keyof RecordData] = '';
                } else {
                    console.log(`[OCR Update - Global] Keeping existing value for TARGETED global field ${fieldKey}. OCR did not find data, but override decision is false or field has value.`);
                    updates[fieldKey as keyof RecordData] = currentGlobalValue; // Keep existing
                }
           } else {
               // OCR found data, apply override logic
               if (shouldOverride || !currentGlobalValue || currentGlobalValue.trim() === '') {
                   // Override if AI says so OR if current global value is empty
                   console.log(`[OCR Update - Global] Preparing update for ${fieldKey}: '${ocrValue}' (Override: ${shouldOverride}, Current Global Empty: ${!currentGlobalValue || currentGlobalValue.trim() === ''})`);
                   updates[fieldKey as keyof RecordData] = ocrValue;
               } else {
                   // Keep existing global value
                   console.log(`[OCR Update - Global] Keeping existing ${fieldKey}. Current Global: '${currentGlobalValue}', OCR: '${ocrValue}', Override: ${shouldOverride}`);
                   updates[fieldKey as keyof RecordData] = currentGlobalValue; // Preserve existing global state value
               }
           }
       });


      // --- Add the scanned registration document to additionalPhotos if not already present ---
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
           // Ensure the state reflects the current array structure even if no new file added
            updates.additionalPhotos = currentPhotos.map(p => p instanceof File ? p : getSerializableFileInfo(p)).filter(Boolean) as (File | { name: string; type?: string; size?: number; })[];
      }


      toast({
        title: 'Başarılı',
        description: 'Araç ruhsatı bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
      });

    } catch (aiError) {
      // Handle AI specific errors (including potential 503)
      handleAiError(aiError, 1);
       // Fallback: if OCR worked but decision failed
       if (ocrResult && ocrResult.ocrData) {
            console.warn("AI Error occurred, applying OCR data with fallback logic (clearing if OCR missing, populating empty, preserving non-empty).");
            const ocrDataFallback = ocrResult.ocrData;

            // Apply fallback logic for OCR targeted form fields
            ocrTargetedFormFields.forEach(field => {
                 const formValue = form.getValues(field);
                 const ocrValue = ocrDataFallback[field as keyof typeof ocrDataFallback];

                 if (!ocrValue || ocrValue.trim() === '') {
                     // OCR did not find data for this targeted field, clear it
                     console.log(`[Fallback] Clearing TARGETED form field ${field} because OCR did not find data.`);
                     form.setValue(field, '');
                     updates[field as keyof RecordData] = '';
                 } else {
                     // OCR found something
                     if (!formValue || formValue.trim() === '') { // And form is empty
                         console.log(`[Fallback] Populating ${field} with OCR data: ${ocrValue}`);
                         form.setValue(field, ocrValue);
                         updates[field as keyof RecordData] = ocrValue;
                     } else {
                         // Keep existing form value (AI error prevents override decision)
                         console.log(`[Fallback] Keeping existing ${field} value: ${formValue} (OCR found: ${ocrValue})`);
                         updates[field as keyof RecordData] = formValue;
                     }
                 }
            });

             // Fallback for OCR targeted global state fields
              ocrTargetedGlobalFields.forEach(fieldKey => {
                 const ocrValue = ocrDataFallback[fieldKey];
                 const currentGlobalValue = recordData[fieldKey as keyof RecordData];
                  if (!ocrValue || ocrValue.trim() === '') {
                      console.log(`[Fallback - Global] Clearing TARGETED global field ${fieldKey} because OCR did not find data.`);
                      updates[fieldKey as keyof RecordData] = '';
                  } else {
                     // Keep existing or use OCR if existing is empty
                     updates[fieldKey as keyof RecordData] = currentGlobalValue || ocrValue;
                     console.log(`[Fallback - Global] Setting ${fieldKey} to ${updates[fieldKey as keyof RecordData]}`);
                  }
             });

             // Preserve Plate Number in fallback
             updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber;

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
           ocrTargetedFormFields.forEach(field => {
               updates[field as keyof RecordData] = form.getValues(field) || recordData[field as keyof RecordData];
           });
           ocrTargetedGlobalFields.forEach(fieldKey => {
              updates[fieldKey as keyof RecordData] = recordData[fieldKey as keyof RecordData];
           });
            // Preserve Plate Number
            updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber;
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

      // Reset text fields when a new image is uploaded - Keeping this behavior
      ocrTargetedFormFields.forEach(field => form.resetField(field));
      // Do NOT reset plateNumber automatically
      // form.resetField('plateNumber');
      console.log("Cleared OCR-targeted text fields after new file upload.");

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
     // Use currentFile if available, otherwise try to reconstruct File from info
     // Note: Reconstructing File from info is not generally possible without storing blob/dataURL
     const fileToScan = currentFile || (recordData.registrationDocument instanceof File ? recordData.registrationDocument : null);

     if (fileToScan && !isLoading) {
        console.log("Manual scan button clicked for Step 1 with file:", fileToScan.name);
       initiateOcrScan(fileToScan);
     } else {
       toast({
         title: 'Dosya Seçilmedi',
         description: 'Lütfen önce taranacak bir resim dosyası seçin veya yükleyin.',
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
  }, [branch, router]); // Removed form and other recordData fields from deps


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
                          <Input placeholder="Manuel girin veya boş bırakın" {...field} disabled={isLoading} />
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


        
