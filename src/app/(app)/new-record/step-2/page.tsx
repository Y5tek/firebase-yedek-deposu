
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
import { Upload, Camera, Tag, Loader2, Image as ImageIcon, AlertCircle, ScanSearch } from 'lucide-react';
import { useAppState, RecordData } from '@/hooks/use-app-state';
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image';
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ExtractVehicleDataOutput } from '@/ai/flows/extract-vehicle-data-from-image';
import type { DecideOcrOverrideOutput } from '@/ai/flows/decide-ocr-override';
import type { OcrData as ExtractedOcrData } from '@/services/ocr';


// Schema for step 2 fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(), // Display only, filled from step 1/OCR
  typeApprovalNumber: z.string().optional(),
  typeAndVariant: z.string().optional(),
  labelDocument: z.any().optional(),
  versiyon: z.string().optional(), // Added versiyon field
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep2() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(33); // Step 2 of 7
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);

  const [ocrError, setOcrError] = React.useState<string | null>(null);
  const [currentFile, setCurrentFile] = React.useState<File | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      chassisNumber: recordData.chassisNumber || '', // Pre-fill display field
      typeApprovalNumber: recordData.typeApprovalNumber || '',
      typeAndVariant: recordData.typeAndVariant || '',
      labelDocument: recordData.labelDocument || null,
      versiyon: recordData.versiyon || '', // Pre-fill versiyon
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
            const errorType = errorTypeMatch ? errorTypeMatch[1] : (errorMessage.includes('503') ? 'Yoğun/Kullanılamıyor' : 'Sunucu Hatası');
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
            const userFriendlyMessage = `Etiket okunurken bir hata oluştu (Adım ${step}). Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin.`;
            setOcrError(userFriendlyMessage + (errorMessage.includes('AI prompt error:') ? '' : ` Detay: ${errorMessage}`)); // Show technical details only if not already prefixed
            toast({
              title: `Yapay Zeka Hatası (Adım ${step})`,
              description: userFriendlyMessage,
              variant: 'destructive',
              duration: 5000,
            });
        }
        setIsLoading(false); // Reset loading state on error
    };


   // Function to handle the OCR process for the label
   const initiateOcrScan = React.useCallback(async (file: File) => {
     if (!file) return;
     setIsLoading(true);
     setOcrError(null);
     console.log("Starting OCR scan for Step 2...");

     let base64String: string;
     try {
       const reader = new FileReader();
       reader.readAsDataURL(file);
        await new Promise<void>((resolve, reject) => {
            reader.onloadend = () => resolve();
            reader.onerror = (error) => reject(error);
        });
       base64String = reader.result as string;
     } catch (error) {
       console.error('File handling/reading error in Step 2:', error);
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
     const updates: Partial<RecordData> = {}; // Use RecordData
     const fieldsToUpdate: (keyof FormData)[] = ['chassisNumber', 'typeApprovalNumber', 'typeAndVariant', 'versiyon'];
     const globalFieldsToUpdate: (keyof ExtractedOcrData)[] = ['brand', 'type', 'tradeName', 'owner']; // Global fields possibly updated by label


      try {
         console.log("Calling extractVehicleData flow for label...");
         ocrResult = await extractVehicleData({ imageBase64: base64String });
         console.log("OCR Result (Step 2 Label):", ocrResult?.ocrData); // Use optional chaining

         if (!ocrResult || !ocrResult.ocrData) {
             throw new Error("Etiket OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
         }

         const ocrData = ocrResult.ocrData;

         // Get current form data AND data from previous steps for override decision
         const currentDataForDecision = {
             chassisNumber: form.getValues('chassisNumber') || recordData.chassisNumber, // Use form value first (display only but might change)
             brand: recordData.brand, // Use global state brand
             type: recordData.type, // Use global state type
             tradeName: recordData.tradeName, // Use global state trade name
             owner: recordData.owner, // Use global state owner
             typeApprovalNumber: form.getValues('typeApprovalNumber') || recordData.typeApprovalNumber, // Use form value first
             typeAndVariant: form.getValues('typeAndVariant') || recordData.typeAndVariant, // Use form value first
             versiyon: form.getValues('versiyon') || recordData.versiyon, // Use form value first
         };
         console.log("Current Data for Override Decision (Step 2):", currentDataForDecision);

         // Prepare OCR data for decision, including all relevant fields
         const ocrDataForDecision = {
           chassisNumber: ocrData.chassisNumber || undefined,
           brand: ocrData.brand || undefined,
           type: ocrData.type || undefined,
           tradeName: ocrData.tradeName || undefined,
           owner: ocrData.owner || undefined,
           typeApprovalNumber: ocrData.typeApprovalNumber || undefined,
           typeAndVariant: ocrData.typeAndVariant || undefined,
           versiyon: ocrData.versiyon || undefined,
         };
         console.log("OCR Data for Override Decision (Step 2 Label):", ocrDataForDecision);

         console.log("Calling decideOcrOverride flow for Step 2...");
         overrideDecision = await decideOcrOverride({
            ocrData: ocrDataForDecision,
            currentData: currentDataForDecision
         });
         console.log("Override Decision (Step 2):", overrideDecision?.override); // Use optional chaining

         if (!overrideDecision || !overrideDecision.override) {
             throw new Error("Geçersiz kılma kararı alınamadı (Etiket).");
         }
         // --- END: Handle Override Decision ---

         const override = overrideDecision.override;

        // --- Update form fields based on OCR and override decision ---
        fieldsToUpdate.forEach(field => {
            const ocrValue = ocrData[field as keyof typeof ocrData]; // Get corresponding OCR value
            const currentValue = form.getValues(field);
            const shouldOverride = override[field as keyof typeof override];

            if (!ocrValue || ocrValue.trim() === '') {
                // OCR did not find data for this field, clear the form field and update object
                console.log(`[OCR Update - Form Step 2] Clearing ${field} because OCR did not find data.`);
                form.setValue(field, '');
                updates[field as keyof RecordData] = '';
            } else {
                // OCR found data, apply override logic
                if (shouldOverride || !currentValue || currentValue.trim() === '') {
                    // Override if AI says so OR if current field is empty
                    console.log(`[OCR Update - Form Step 2] Updating ${field} with OCR data: '${ocrValue}' (Override: ${shouldOverride}, Current Empty: ${!currentValue || currentValue.trim() === ''})`);
                    form.setValue(field, ocrValue);
                    updates[field as keyof RecordData] = ocrValue;
                } else {
                    // Keep existing value if AI decided not to override and field is not empty
                    console.log(`[OCR Update - Form Step 2] Keeping existing ${field}. Current: '${currentValue}', OCR: '${ocrValue}', Override: ${shouldOverride}`);
                    updates[field as keyof RecordData] = currentValue; // Keep existing value
                }
            }
        });

        // --- Update global state fields based on OCR and override decision ---
         globalFieldsToUpdate.forEach(fieldKey => {
             const ocrValue = ocrData[fieldKey]; // Get corresponding OCR value
             const currentGlobalValue = recordData[fieldKey as keyof RecordData]; // Get current global value
             const shouldOverride = override[fieldKey as keyof typeof override];

             if (!ocrValue || ocrValue.trim() === '') {
                 // OCR did not find data for this global field, clear it in the updates object
                 console.log(`[OCR Update - Global Step 2] Clearing ${fieldKey} because OCR did not find data.`);
                 updates[fieldKey as keyof RecordData] = '';
             } else {
                 // OCR found data, apply override logic
                 if (shouldOverride || !currentGlobalValue || currentGlobalValue.trim() === '') {
                     // Override if AI says so OR if current global value is empty
                     console.log(`[OCR Update - Global Step 2] Preparing update for ${fieldKey}: '${ocrValue}' (Override: ${shouldOverride}, Current Global Empty: ${!currentGlobalValue || currentGlobalValue.trim() === ''})`);
                     updates[fieldKey as keyof RecordData] = ocrValue;
                 } else {
                     // Keep existing global value
                     console.log(`[OCR Update - Global Step 2] Keeping existing ${fieldKey}. Current Global: '${currentGlobalValue}', OCR: '${ocrValue}', Override: ${shouldOverride}`);
                     updates[fieldKey as keyof RecordData] = currentGlobalValue; // Preserve existing global state value
                 }
             }
         });


         toast({
           title: 'Başarılı',
           description: 'Etiket bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
         });

         } catch (aiError) {
            handleAiError(aiError, 2);
              // Fallback: if OCR worked but decision failed, still populate empty fields
             if (ocrResult && ocrResult.ocrData && !overrideDecision) {
                console.warn("Override decision failed (Step 2), populating empty fields with label OCR data as fallback.");
                const ocrDataFallback = ocrResult.ocrData;

                // Fallback logic for form fields - only populate if the form field is currently empty
                fieldsToUpdate.forEach(field => {
                    const formValue = form.getValues(field);
                    const ocrValue = ocrDataFallback[field as keyof typeof ocrDataFallback];

                    if (!ocrValue || ocrValue.trim() === '') {
                        console.log(`[Fallback - Form Step 2] Clearing ${field} because OCR did not find data.`);
                        form.setValue(field, '');
                        updates[field as keyof RecordData] = '';
                    } else if (!formValue || formValue.trim() === '') {
                        console.log(`[Fallback - Form Step 2] Populating empty ${field} with OCR: ${ocrValue}`);
                        form.setValue(field, ocrValue);
                        updates[field as keyof RecordData] = ocrValue;
                    } else {
                        console.log(`[Fallback - Form Step 2] Keeping existing ${field}: ${formValue}`);
                        updates[field as keyof RecordData] = formValue; // Keep existing
                    }
                });


                 // Fallback for global fields - only populate if the global field is currently empty
                 globalFieldsToUpdate.forEach(fieldKey => {
                    const currentGlobalValue = recordData[fieldKey as keyof RecordData];
                    const ocrValue = ocrDataFallback[fieldKey];

                     if (!ocrValue || ocrValue.trim() === '') {
                         console.log(`[Fallback - Global Step 2] Clearing ${fieldKey} because OCR did not find data.`);
                         updates[fieldKey as keyof RecordData] = '';
                     } else if (!currentGlobalValue || currentGlobalValue.trim() === '') {
                          console.log(`[Fallback - Global Step 2] Populating empty ${fieldKey} with OCR: ${ocrValue}`);
                         updates[fieldKey as keyof RecordData] = ocrValue;
                     } else {
                         console.log(`[Fallback - Global Step 2] Keeping existing ${fieldKey}: ${currentGlobalValue}`);
                         updates[fieldKey as keyof RecordData] = currentGlobalValue; // Keep existing
                     }
                 });

             } else {
                 // If AI failed completely, ensure updates reflect current form/global state
                 fieldsToUpdate.forEach(field => {
                      updates[field as keyof RecordData] = form.getValues(field) || recordData[field as keyof RecordData];
                 });
                 globalFieldsToUpdate.forEach(fieldKey => {
                      updates[fieldKey as keyof RecordData] = recordData[fieldKey as keyof RecordData];
                 });
                 updates.brand = recordData.brand; // Preserve brand specifically
             }
       } finally {
            // Update app state regardless of override success, including the file itself
            console.log("Updating global state with (Step 2):", { ...updates, labelDocument: file });
            updateRecordData({ ...updates, labelDocument: file }); // Ensure file object is in state
            setIsLoading(false);
            console.log("OCR Scan finished for Step 2.");
       }

   }, [form, recordData, updateRecordData, toast]);


  React.useEffect(() => {
     let url: string | null = null;
     const setupPreview = () => {
         if (recordData.labelDocument instanceof File) {
             const file = recordData.labelDocument;
             setCurrentFile(file);
             url = URL.createObjectURL(file);
             setImagePreviewUrl(url);
             form.setValue('labelDocument', file);
         } else if (typeof recordData.labelDocument === 'object' && recordData.labelDocument?.name) {
            // If it's serializable info (from persisted state), no preview
            setCurrentFile(null); // No actual File object here
             setImagePreviewUrl(null);
             form.setValue('labelDocument', recordData.labelDocument); // Keep the info
         } else {
             // Reset if neither File nor info object exists
             setCurrentFile(null);
             setImagePreviewUrl(null);
             form.setValue('labelDocument', null);
         }
     };

     setupPreview();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
        setImagePreviewUrl(null); // Also clear state url
      }
    };
    // Only re-run if the labelDocument itself changes identity or type
    // form is intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordData.labelDocument]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setOcrError(null); // Clear previous errors

    if (file) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl); // Clean up old preview
      }
       const newPreviewUrl = URL.createObjectURL(file);
       setImagePreviewUrl(newPreviewUrl);
       setCurrentFile(file); // Store the actual File object

      form.setValue('labelDocument', file); // Set File object in form
      updateRecordData({ labelDocument: file }); // Update global state with File object
       console.log("Label file selected:", file.name);

    } else {
        // Handle cancellation or no file selection
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(null);
        }
        setCurrentFile(null);
        form.setValue('labelDocument', null);
        // Use undefined to explicitly clear the document in global state
        updateRecordData({ labelDocument: undefined });
        console.log("Label file selection cancelled or no file chosen.");
    }
      // Reset file input to allow selecting the same file again
      if (event.target) {
          event.target.value = '';
      }
  };

  const handleManualScanClick = () => {
      if (currentFile && !isLoading) {
          console.log("Manual scan button clicked for Step 2");
          initiateOcrScan(currentFile);
      } else if (!currentFile) {
          toast({
              title: 'Dosya Seçilmedi',
              description: 'Lütfen önce taranacak bir etiket resmi dosyası seçin.',
              variant: 'destructive',
          });
      }
  };

  const onSubmit = (data: FormData) => {
      // Check if there is a current file or if there's file info from persisted state
       const documentValue = form.getValues('labelDocument');
       const hasDocument = currentFile || (typeof documentValue === 'object' && documentValue?.name);

      // Allow skipping this step if no document is provided (it's optional)

     // Prioritize the current File object if it exists, otherwise use persisted info
     const documentToSave = currentFile || recordData.labelDocument;

     console.log("Submitting Step 2 Data:", data);
     console.log("Label Document to save (or info):", documentToSave);


    // Update global state, ensuring the file (or its info) is correctly passed
    // Also update fields that might have been changed by OCR/manual input in this step
    updateRecordData({
        // Preserve potentially updated global fields from OCR
        chassisNumber: recordData.chassisNumber,
        brand: recordData.brand,
        type: recordData.type,
        tradeName: recordData.tradeName,
        owner: recordData.owner,
        // Get latest form values for fields on this page
        typeApprovalNumber: data.typeApprovalNumber,
        typeAndVariant: data.typeAndVariant,
        versiyon: data.versiyon,
        // Save label document
        labelDocument: documentToSave // This will be the File or the info object
    });
    router.push('/new-record/step-3'); // Navigate to the NEW step 3 (additional photos/videos)
  };

  const goBack = () => {
     // Save current data before going back
     updateRecordData({
        // Preserve global fields
        chassisNumber: recordData.chassisNumber,
        brand: recordData.brand,
        type: recordData.type,
        tradeName: recordData.tradeName,
        owner: recordData.owner,
        // Save current form values
        typeApprovalNumber: form.getValues('typeApprovalNumber'),
        typeAndVariant: form.getValues('typeAndVariant'),
        versiyon: form.getValues('versiyon'), // Save versiyon
        labelDocument: currentFile || recordData.labelDocument // Save current file/info
    });
    router.push('/new-record/step-1');
  };

  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
     // Sync form fields with global state when the component loads or recordData changes
     // This ensures data potentially updated by step 1 OCR/override is reflected here
     form.reset({
        chassisNumber: recordData.chassisNumber || '',
        typeApprovalNumber: recordData.typeApprovalNumber || '',
        typeAndVariant: recordData.typeAndVariant || '',
        versiyon: recordData.versiyon || '', // Sync versiyon
        labelDocument: recordData.labelDocument || null
     });
     // Re-setup preview based on potentially updated recordData
     const setupPreview = () => {
         if (recordData.labelDocument instanceof File) {
             const file = recordData.labelDocument;
             setCurrentFile(file);
             // Avoid creating new object URLs unnecessarily if preview already exists
             if (!imagePreviewUrl || currentFile?.name !== file.name) {
                 if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                 const url = URL.createObjectURL(file);
                 setImagePreviewUrl(url);
             }
         } else if (typeof recordData.labelDocument === 'object' && recordData.labelDocument?.name) {
             setCurrentFile(null);
              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); // Clean up if switching from File to info
             setImagePreviewUrl(null);
         } else {
             setCurrentFile(null);
              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); // Clean up if no document
             setImagePreviewUrl(null);
         }
     };
     setupPreview();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData, router]); // form is excluded as form.reset handles it


  if (!branch) {
      return <div className="flex min-h-screen items-center justify-center p-4">Şube seçimine yönlendiriliyorsunuz...</div>;
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Tag className="text-primary" />
            Yeni Kayıt - Adım 2: Etiket Bilgileri (İsteğe Bağlı)
          </CardTitle>
          <CardDescription>
             Varsa araç etiketini yükleyin ve 'Etiketi Tara' butonu ile bilgileri alın. Bu adımı atlayabilirsiniz.
             (Şube: {branch})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="labelDocument"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Etiket Belgesi</FormLabel>
                        <FormControl>
                        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                            {imagePreviewUrl ? (
                                <div className="relative w-full max-w-xs h-48 mb-4">
                                     <Image
                                        src={imagePreviewUrl}
                                        alt="Yüklenen Etiket Önizlemesi"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        className="rounded-md"
                                        unoptimized // Use unoptimized for local object URLs
                                        data-ai-hint="vehicle identification label"
                                    />
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                    <span>Etiket önizlemesi burada görünecek</span>
                                </div>
                            )}

                              {currentFile?.name ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {currentFile.name}</p>
                              ) : typeof field.value === 'object' && field.value?.name ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name} (Önizleme Yok)</p>
                              ): !imagePreviewUrl && (
                               <p className="text-sm text-muted-foreground">Etiket belgesini yüklemek için tıklayın veya sürükleyip bırakın.</p>
                              )}


                            <Input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                id="label-file-upload"
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
                                    disabled={!currentFile || isLoading}
                                 >
                                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                                    Etiketi Tara (OCR)
                                 </Button>
                                <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: 'Yakında', description: 'Kamera özelliği eklenecektir.'})}>
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
                         {/* Display form message if there's an error related to the document field itself */}
                         <FormMessage />
                    </FormItem>
                    )}
                />

                {/* Auto-filled/Display Fields */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="chassisNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Şase Numarası (Ruhsat/Etiket)</FormLabel>
                            <FormControl>
                            {/* Use the field value directly, as it's managed by useForm and synced */}
                            <Input placeholder="Ruhsattan/Etiketten alınacak..." {...field} disabled />
                            </FormControl>
                            {/* No FormMessage needed for disabled display field */}
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="typeApprovalNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tip Onay Numarası</FormLabel>
                            <FormControl>
                            <Input placeholder="Etiketi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="typeAndVariant"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Varyant</FormLabel> {/* Changed label */}
                            <FormControl>
                            <Input placeholder="Etiketi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="versiyon"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Versiyon</FormLabel>
                            <FormControl>
                            <Input placeholder="Etiketi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>


              <div className="flex justify-between">
                 <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                     Geri
                </Button>
                 <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  Devam Et
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

        