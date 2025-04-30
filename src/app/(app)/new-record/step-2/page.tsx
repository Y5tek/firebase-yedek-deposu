
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


// Schema for step 2 fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(), // Display only, filled from step 1/OCR
  typeApprovalNumber: z.string().optional(),
  typeAndVariant: z.string().optional(),
  labelDocument: z.any().optional(),
  brand: z.string().optional(), // Add brand field
  plateNumber: z.string().optional(), // Add plate number field for display/update
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep2() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(40); // Step 2 of 5
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
      brand: recordData.brand || '', // Pre-fill brand
      plateNumber: recordData.plateNumber || '', // Pre-fill plate number
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Helper function to handle potential 503 errors from AI flows
    const handleAiError = (error: unknown, step: number) => {
        console.error(`AI/OCR error in Step ${step}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir yapay zeka hatası oluştu.';

        // Check for specific AI Service Unavailable error
        if (errorMessage.includes('AI Service Unavailable')) {
            setOcrError('Yapay zeka servisi şu anda yoğun veya kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya bilgileri manuel girin.');
            toast({
                title: 'Servis Kullanılamıyor',
                description: 'Yapay zeka servisi şu anda yoğun veya geçici olarak devre dışı. Lütfen tekrar deneyin.',
                variant: 'destructive',
                duration: 7000, // Longer duration for service errors
            });
        } else {
            // Handle other generic errors
            setOcrError(`Etiket okunurken bir hata oluştu (Adım ${step}). Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin. Hata: ${errorMessage}`);
            toast({
                title: `OCR Hatası (Adım ${step})`,
                description: `Etiket taranırken bir hata oluştu. Bilgileri kontrol edin. ${errorMessage}`,
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

      try {
         console.log("Calling extractVehicleData flow for label...");
         ocrResult = await extractVehicleData({ imageBase64: base64String });
         console.log("OCR Result (Step 2 Label):", ocrResult.ocrData);

         if (!ocrResult || !ocrResult.ocrData) {
             throw new Error("Etiket OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
         }

         const ocrData = ocrResult.ocrData;

         // Get current form data AND data from previous steps
         const currentDataForDecision = {
             chassisNumber: recordData.chassisNumber, // Use value from global state (set in Step 1)
             brand: form.getValues('brand') || recordData.brand, // Use form value first
             type: recordData.type,
             tradeName: recordData.tradeName,
             owner: recordData.owner,
             plateNumber: form.getValues('plateNumber') || recordData.plateNumber, // Use form value first
             typeApprovalNumber: form.getValues('typeApprovalNumber') || recordData.typeApprovalNumber, // Use form value first
             typeAndVariant: form.getValues('typeAndVariant') || recordData.typeAndVariant, // Use form value first
         };
         console.log("Current Data for Override Decision (Step 2):", currentDataForDecision);

         // Ensure all fields from OcrData are present in the decision input
         const ocrDataForDecision = {
           chassisNumber: ocrData.chassisNumber,
           brand: ocrData.brand,
           type: ocrData.type,
           tradeName: ocrData.tradeName,
           owner: ocrData.owner,
           plateNumber: ocrData.plateNumber,
           typeApprovalNumber: ocrData.typeApprovalNumber,
           typeAndVariant: ocrData.typeAndVariant,
         };
         console.log("OCR Data for Override Decision (Step 2 Label):", ocrDataForDecision);

         console.log("Calling decideOcrOverride flow for Step 2...");
         overrideDecision = await decideOcrOverride({
            ocrData: ocrDataForDecision,
            currentData: currentDataForDecision
         });
         console.log("Override Decision (Step 2):", overrideDecision.override);

         if (!overrideDecision || !overrideDecision.override) {
             throw new Error("Geçersiz kılma kararı alınamadı (Etiket).");
         }
         // --- END: Handle Override Decision ---

         const override = overrideDecision.override;

         // Function to decide if a field should be updated
        const shouldUpdate = (fieldName: keyof typeof override): boolean => {
            const ocrValue = ocrData[fieldName as keyof typeof ocrData];
            return !!(override[fieldName] && ocrValue); // Check override flag AND if OCR found a value
        };


         // IMPORTANT: Chassis number update check (primarily for logging difference)
         if (override.chassisNumber && ocrData.chassisNumber && ocrData.chassisNumber !== recordData.chassisNumber) {
             console.warn("Chassis number on label OCR differs from license OCR:", ocrData.chassisNumber);
             // Optionally notify user about discrepancy, but generally trust the registration doc (Step 1) more for chassis no.
             if (overrideDecision.override.chassisNumber) { // If AI explicitly said to override...
                 console.log("AI decided to override chassis number based on label. Applying change.");
                 updates.chassisNumber = ocrData.chassisNumber; // Update global state
                 form.setValue('chassisNumber', ocrData.chassisNumber!); // Update display field
             } else {
                  console.log("AI decided NOT to override chassis number based on label.");
             }
         } else if (shouldUpdate('chassisNumber')) {
             // This case handles if step 1 chassis was empty and label has it.
             console.log("Updating chassisNumber field with label OCR data (was potentially empty):", ocrData.chassisNumber);
             form.setValue('chassisNumber', ocrData.chassisNumber!);
             updates.chassisNumber = ocrData.chassisNumber;
         } else {
             console.log("Not overriding chassisNumber (Step 2). Override:", override.chassisNumber, "OCR Data:", ocrData.chassisNumber);
         }

         // Brand
         if (shouldUpdate('brand')) {
             console.log("Updating brand field with label OCR data:", ocrData.brand);
             form.setValue('brand', ocrData.brand!);
             updates.brand = ocrData.brand;
         } else {
             console.log("Not overriding brand (Step 2). Override:", override.brand, "OCR Data:", ocrData.brand);
         }


         // Type Approval Number
         if (shouldUpdate('typeApprovalNumber')) {
            console.log("Updating typeApprovalNumber field with OCR data:", ocrData.typeApprovalNumber);
            form.setValue('typeApprovalNumber', ocrData.typeApprovalNumber!);
            updates.typeApprovalNumber = ocrData.typeApprovalNumber;
         } else {
             console.log("Not overriding typeApprovalNumber. Override:", override.typeApprovalNumber, "OCR Data:", ocrData.typeApprovalNumber);
         }

         // Type and Variant
         if (shouldUpdate('typeAndVariant')) {
            console.log("Updating typeAndVariant field with OCR data:", ocrData.typeAndVariant);
            form.setValue('typeAndVariant', ocrData.typeAndVariant!);
            updates.typeAndVariant = ocrData.typeAndVariant;
         } else {
             console.log("Not overriding typeAndVariant. Override:", override.typeAndVariant, "OCR Data:", ocrData.typeAndVariant);
         }

         // Plate Number
          if (shouldUpdate('plateNumber')) {
              console.log("Updating plateNumber field with label OCR data:", ocrData.plateNumber);
              form.setValue('plateNumber', ocrData.plateNumber!);
              updates.plateNumber = ocrData.plateNumber;
          } else {
              console.log("Not overriding plateNumber (Step 2). Override:", override.plateNumber, "OCR Data:", ocrData.plateNumber);
          }


         // Update potentially other fields in the global state based on label OCR decision
         // These might override Step 1 data if deemed more accurate by the AI
         if (shouldUpdate('type')) {
            console.log("Preparing update for type in global state (from label):", ocrData.type);
            updates.type = ocrData.type; // Update "tipi"
         } else {
              console.log("Not overriding type (Step 2). Override:", override.type, "OCR Data:", ocrData.type);
         }
         if (shouldUpdate('tradeName')) {
             console.log("Preparing update for tradeName in global state (from label):", ocrData.tradeName);
             updates.tradeName = ocrData.tradeName;
         } else {
                console.log("Not overriding tradeName (Step 2). Override:", override.tradeName, "OCR Data:", ocrData.tradeName);
         }
         if (shouldUpdate('owner')) {
            console.log("Preparing update for owner in global state (from label):", ocrData.owner);
            updates.owner = ocrData.owner;
         } else {
            console.log("Not overriding owner (Step 2). Override:", override.owner, "OCR Data:", ocrData.owner);
         }


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
                if (!form.getValues('typeApprovalNumber') && ocrDataFallback.typeApprovalNumber) {
                     form.setValue('typeApprovalNumber', ocrDataFallback.typeApprovalNumber);
                     updates.typeApprovalNumber = ocrDataFallback.typeApprovalNumber;
                 }
                if (!form.getValues('typeAndVariant') && ocrDataFallback.typeAndVariant) {
                    form.setValue('typeAndVariant', ocrDataFallback.typeAndVariant);
                    updates.typeAndVariant = ocrDataFallback.typeAndVariant;
                }
                if (!form.getValues('brand') && ocrDataFallback.brand) { // Fallback for brand
                    form.setValue('brand', ocrDataFallback.brand);
                    updates.brand = ocrDataFallback.brand;
                }
                 if (!form.getValues('plateNumber') && ocrDataFallback.plateNumber) { // Fallback for plate number
                     form.setValue('plateNumber', ocrDataFallback.plateNumber);
                     updates.plateNumber = ocrDataFallback.plateNumber;
                 }
                // Update global state for potential future use even without decision
                updates.typeApprovalNumber = recordData.typeApprovalNumber || ocrDataFallback.typeApprovalNumber;
                updates.typeAndVariant = recordData.typeAndVariant || ocrDataFallback.typeAndVariant;
                // Also fallback for other fields if empty
                 if (!recordData.chassisNumber && ocrDataFallback.chassisNumber) updates.chassisNumber = ocrDataFallback.chassisNumber;
                 if (!recordData.brand && ocrDataFallback.brand) updates.brand = ocrDataFallback.brand;
                 if (!recordData.type && ocrDataFallback.type) updates.type = ocrDataFallback.type;
                 if (!recordData.tradeName && ocrDataFallback.tradeName) updates.tradeName = ocrDataFallback.tradeName;
                 if (!recordData.owner && ocrDataFallback.owner) updates.owner = ocrDataFallback.owner;
                 if (!recordData.plateNumber && ocrDataFallback.plateNumber) updates.plateNumber = ocrDataFallback.plateNumber; // Fallback for plateNumber

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
        chassisNumber: recordData.chassisNumber, // Preserve potentially updated chassis no
        brand: data.brand, // Update brand from form
        type: recordData.type, // Preserve potentially updated type
        tradeName: recordData.tradeName, // Preserve potentially updated tradeName
        owner: recordData.owner, // Preserve potentially updated owner
        plateNumber: data.plateNumber, // Update plateNumber from form
        typeApprovalNumber: data.typeApprovalNumber,
        typeAndVariant: data.typeAndVariant,
        labelDocument: documentToSave // This will be the File or the info object
    });
    router.push('/new-record/step-3'); // Navigate to the NEW step 3 (additional photos/videos)
  };

  const goBack = () => {
     // Save current data before going back
     updateRecordData({
        chassisNumber: recordData.chassisNumber, // Preserve
        brand: form.getValues('brand'), // Save brand
        plateNumber: form.getValues('plateNumber'), // Save plate number
        typeApprovalNumber: form.getValues('typeApprovalNumber'),
        typeAndVariant: form.getValues('typeAndVariant'),
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
        brand: recordData.brand || '', // Sync brand
        plateNumber: recordData.plateNumber || '', // Sync plate number
        typeApprovalNumber: recordData.typeApprovalNumber || '',
        typeAndVariant: recordData.typeAndVariant || '',
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
                                <AlertTitle>OCR/AI Hatası</AlertTitle>
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
                        name="plateNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plaka</FormLabel>
                            <FormControl>
                            <Input placeholder="Etiketi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Marka</FormLabel>
                            <FormControl>
                            <Input placeholder="Etiketi Tara ile doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
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
                            <FormLabel>Tip ve Varyant</FormLabel>
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
