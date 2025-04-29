// noinspection JSUnusedLocalSymbols
'use client';

import * as React from 'react';
import Image from 'next/image'; // Import next/image
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
import { Upload, Camera, Tag, Loader2, Image as ImageIcon, AlertCircle, ScanSearch } from 'lucide-react'; // Added ImageIcon, AlertCircle, ScanSearch
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Import RecordData
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image'; // Assuming same flow can extract label info
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Schema for step 2 fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(), // Display only, filled from step 1/OCR
  typeApprovalNumber: z.string().optional(),
  typeAndVariant: z.string().optional(),
  labelDocument: z.any().optional() // Make optional initially
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep2() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(50); // Step 2 of 4
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [ocrError, setOcrError] = React.useState<string | null>(null); // State for OCR errors
  const [currentFile, setCurrentFile] = React.useState<File | null>(null); // Keep track of the current File object

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      chassisNumber: recordData.chassisNumber || '', // Pre-fill from previous step
      typeApprovalNumber: recordData.typeApprovalNumber || '',
      typeAndVariant: recordData.typeAndVariant || '',
      labelDocument: recordData.labelDocument || null, // Use saved label doc if exists
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);


   // Function to handle the OCR process for the label
   const initiateOcrScan = React.useCallback(async (file: File) => {
     if (!file) return;
     setIsLoading(true);
     setOcrError(null);
     console.log("Starting OCR scan for Step 2...");


     try {
       const reader = new FileReader();
       reader.readAsDataURL(file);
        await new Promise<void>((resolve, reject) => {
            reader.onloadend = resolve;
            reader.onerror = reject;
        });

       const base64String = reader.result as string;

       try {
         console.log("Calling extractVehicleData flow for label...");
         // Call Genkit flow for OCR (reuse or create specific one if needed)
         const ocrResult = await extractVehicleData({ imageBase64: base64String });
         console.log("OCR Result (Step 2 Label):", ocrResult.ocrData);


          // Get current form data AND data from previous steps to pass to decision flow
          const currentDataForDecision = {
              chassisNumber: recordData.chassisNumber, // Use value from global state (set in Step 1)
              brand: recordData.brand,
              type: recordData.type, // Include "tipi" from global state
              tradeName: recordData.tradeName,
              owner: recordData.owner,
              typeApprovalNumber: form.getValues('typeApprovalNumber'), // Current Step 2 form value
              typeAndVariant: form.getValues('typeAndVariant'), // Current Step 2 form value
          };
            console.log("Current Data for Override Decision (Step 2):", currentDataForDecision);


         // Prepare OCR data for decision flow
         const ocrDataForDecision = ocrResult.ocrData; // Use the full OCR data from label
         console.log("OCR Data for Override Decision (Step 2 Label):", ocrDataForDecision);


         // Call Genkit flow to decide which fields to override
         console.log("Calling decideOcrOverride flow for Step 2...");
         const overrideDecision = await decideOcrOverride({
            ocrData: ocrDataForDecision, // Pass all OCR data from the *label* scan
            currentData: currentDataForDecision // Pass combined current data
          });
         console.log("Override Decision (Step 2):", overrideDecision.override);


         // --- Update form fields and state based on the OCR data and override decision ---
         const ocrData = ocrResult.ocrData;
         const override = overrideDecision.override;
         const updates: Partial<RecordData> = {}; // Use RecordData

         // IMPORTANT: Even if chassis number is found in the label OCR, we prioritize the one from Step 1 (License).
         // However, the decision flow *might* still suggest overriding other fields based on the label scan.
         // We update the global state if the decision says so for other fields.

         if (override.chassisNumber && ocrData.chassisNumber && ocrData.chassisNumber !== recordData.chassisNumber) {
             // Optional: Log or notify if label chassis differs significantly from license chassis?
             console.warn("Chassis number on label OCR differs from license OCR:", ocrData.chassisNumber);
             // We are NOT updating the form/state chassis number here, sticking to Step 1's value.
         }

         // Type Approval Number
         if (override.typeApprovalNumber && ocrData.typeApprovalNumber) {
            console.log("Updating typeApprovalNumber field with OCR data:", ocrData.typeApprovalNumber);
           form.setValue('typeApprovalNumber', ocrData.typeApprovalNumber);
           updates.typeApprovalNumber = ocrData.typeApprovalNumber;
         } else {
             console.log("Not overriding typeApprovalNumber. Override:", override.typeApprovalNumber, "OCR Data:", ocrData.typeApprovalNumber);
         }

         // Type and Variant
         if (override.typeAndVariant && ocrData.typeAndVariant) {
            console.log("Updating typeAndVariant field with OCR data:", ocrData.typeAndVariant);
           form.setValue('typeAndVariant', ocrData.typeAndVariant);
           updates.typeAndVariant = ocrData.typeAndVariant;
         } else {
             console.log("Not overriding typeAndVariant. Override:", override.typeAndVariant, "OCR Data:", ocrData.typeAndVariant);
         }

         // Update potentially other fields in the global state based on label OCR decision
         if (override.brand && ocrData.brand) {
             console.log("Preparing update for brand in global state:", ocrData.brand);
             updates.brand = ocrData.brand;
         }
         if (override.type && ocrData.type) {
            console.log("Preparing update for type in global state:", ocrData.type);
            updates.type = ocrData.type; // Update "tipi" if suggested
         }
         if (override.tradeName && ocrData.tradeName) {
             console.log("Preparing update for tradeName in global state:", ocrData.tradeName);
             updates.tradeName = ocrData.tradeName;
         }
         if (override.owner && ocrData.owner) {
            console.log("Preparing update for owner in global state:", ocrData.owner);
            updates.owner = ocrData.owner;
         }


         // Update app state with potentially overridden values from this OCR scan
         console.log("Updating global state with (Step 2):", { ...updates, labelDocument: file });
         if (Object.keys(updates).length > 0) {
             updateRecordData({ ...updates, labelDocument: file }); // Ensure file object is in state
         } else {
             // If no updates based on decision, still ensure the file object is in state
             updateRecordData({ labelDocument: file });
         }


         toast({
           title: 'Başarılı',
           description: 'Etiket bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
         });
         } catch (aiError) {
             console.error('AI/OCR error in Step 2:', aiError);
             const errorMessage = aiError instanceof Error ? aiError.message : 'Bilinmeyen bir hata oluştu.';

              // Check for specific 503 error
              if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('service unavailable')) {
                  setOcrError('Yapay zeka servisi şu anda yoğun veya kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya bilgileri manuel girin.');
                  toast({
                    title: 'Servis Kullanılamıyor',
                    description: 'Yapay zeka servisi şu anda yoğun veya geçici olarak devre dışı. Lütfen tekrar deneyin.',
                    variant: 'destructive',
                    duration: 5000,
                  });
              } else {
                 setOcrError('Etiket okunurken bir hata oluştu. Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin.');
                  toast({
                    title: 'OCR Hatası',
                    description: 'Etiket taranırken bir hata oluştu. Bilgileri kontrol edin.',
                    variant: 'destructive',
                     duration: 5000,
                  });
              }
       } finally {
          setIsLoading(false);
          console.log("OCR Scan finished for Step 2.");
       }

     } catch (error) {
       // Catch errors from FileReader or other setup
       console.error('File handling/reading error in Step 2:', error);
       toast({
         title: 'Dosya Hatası',
         description: 'Dosya okunurken veya işlenirken bir hata oluştu.',
         variant: 'destructive',
       });
       setIsLoading(false);
       setOcrError('Dosya okunurken bir hata oluştu.');
     }
   }, [form, recordData, updateRecordData, toast]);


  // Revoke object URL on unmount or change
  React.useEffect(() => {
     // Function to set preview and current file from app state
     const setupPreview = () => {
         if (recordData.labelDocument instanceof File) {
             const file = recordData.labelDocument;
             setCurrentFile(file);
             const url = URL.createObjectURL(file);
             setImagePreviewUrl(url);
             form.setValue('labelDocument', file); // Sync form state
         } else if (typeof recordData.labelDocument === 'object' && recordData.labelDocument?.name) {
             setCurrentFile(null);
             setImagePreviewUrl(null);
             form.setValue('labelDocument', recordData.labelDocument);
         } else {
             setCurrentFile(null);
             setImagePreviewUrl(null);
             form.setValue('labelDocument', null);
         }
     };

     setupPreview();

    // Cleanup function
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordData.labelDocument]); // Re-run when labelDocument in global state changes


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setOcrError(null); // Clear previous errors

    if (file) {
      // Revoke previous URL if exists
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
       // Create new object URL for preview
       const newPreviewUrl = URL.createObjectURL(file);
       setImagePreviewUrl(newPreviewUrl);
       setCurrentFile(file); // Update the current file state

      form.setValue('labelDocument', file); // Update form state
      updateRecordData({ labelDocument: file }); // Update app state immediately

      // Automatically initiate OCR scan upon file selection
      // await initiateOcrScan(file); // Deactivated auto-scan

    } else {
        // Clear preview if no file is selected
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        setCurrentFile(null);
        form.setValue('labelDocument', null); // Clear document value in form
        updateRecordData({ labelDocument: undefined }); // Clear in app state
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
      if (!currentFile && !(typeof data.labelDocument === 'object' && data.labelDocument?.name)) {
          toast({
              title: 'Eksik Bilgi',
              description: 'Lütfen devam etmeden önce bir etiket belgesi yükleyin.',
              variant: 'destructive',
          });
          return; // Prevent submission if no document is loaded
      }

     // Ensure the current file object or persisted info is saved
     const documentToSave = currentFile || recordData.labelDocument;

     console.log("Submitting Step 2 Data:", data);
     console.log("Label Document to save:", documentToSave);


    updateRecordData({
        // Ensure chassisNumber from global state is preserved, not overwritten by disabled form field
        chassisNumber: recordData.chassisNumber,
        typeApprovalNumber: data.typeApprovalNumber,
        typeAndVariant: data.typeAndVariant,
        labelDocument: documentToSave // Save the file object or its info
    });
    router.push('/new-record/step-3');
  };

  const goBack = () => {
    // Save current data before going back
     updateRecordData({
        // Ensure chassisNumber from global state is preserved
        chassisNumber: recordData.chassisNumber,
        typeApprovalNumber: form.getValues('typeApprovalNumber'),
        typeAndVariant: form.getValues('typeAndVariant'),
        labelDocument: currentFile || recordData.labelDocument // Preserve File or info
    });
    router.push('/new-record/step-1');
  };

   // Redirect if no branch is selected
  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
     // Pre-fill chassis number when component mounts if not already set in form
     // Also pre-fill other fields from global state if they exist
     if (recordData.chassisNumber && form.getValues('chassisNumber') !== recordData.chassisNumber) {
       form.setValue('chassisNumber', recordData.chassisNumber);
     }
     if (recordData.typeApprovalNumber && form.getValues('typeApprovalNumber') !== recordData.typeApprovalNumber) {
        form.setValue('typeApprovalNumber', recordData.typeApprovalNumber);
     }
     if (recordData.typeAndVariant && form.getValues('typeAndVariant') !== recordData.typeAndVariant) {
         form.setValue('typeAndVariant', recordData.typeAndVariant);
     }
  }, [branch, recordData, form, router]);


  if (!branch) {
      // Optionally show a loading or redirecting message
      return <div className="flex min-h-screen items-center justify-center p-4">Şube seçimine yönlendiriliyorsunuz...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Tag className="text-primary" />
            Yeni Kayıt - Adım 2: Etiket Bilgileri
          </CardTitle>
          <CardDescription>
             Lütfen araç etiketini yükleyin ve 'Etiketi Tara' butonu ile bilgileri alın.
             (Şube: {branch})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {/* File Upload Section */}
                <FormField
                    control={form.control}
                    name="labelDocument"
                    render={({ field }) => ( // field not used directly for display, use imagePreviewUrl
                    <FormItem>
                        <FormLabel>Etiket Belgesi</FormLabel>
                        <FormControl>
                        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                             {/* Image Preview */}
                            {imagePreviewUrl ? (
                                <div className="relative w-full max-w-xs h-48 mb-4">
                                     <Image
                                        src={imagePreviewUrl}
                                        alt="Yüklenen Etiket Önizlemesi"
                                        fill // Use fill instead of layout="fill"
                                        style={{ objectFit: 'contain' }} // Use style for objectFit
                                        className="rounded-md"
                                        unoptimized // Add if external images cause issues
                                    />
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                    <span>Etiket önizlemesi burada görünecek</span>
                                </div>
                            )}

                             {/* Display filename if available */}
                              {currentFile?.name ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {currentFile.name}</p>
                              ) : typeof field.value === 'object' && field.value?.name ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name} (Önizleme Yok)</p>
                              ): !imagePreviewUrl && ( // Show placeholder text only if no preview and no file info
                               <p className="text-sm text-muted-foreground">Etiket belgesini yüklemek için tıklayın veya sürükleyip bırakın.</p>
                              )}


                            <Input
                                type="file"
                                accept="image/*" // Primarily images for labels
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                id="label-file-upload"
                                disabled={isLoading} // Disable file input while OCR is loading
                            />
                             <div className="flex flex-wrap justify-center gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                    <Upload className="mr-2 h-4 w-4" /> {imagePreviewUrl ? 'Değiştir' : 'Dosya Seç'}
                                </Button>
                                 {/* Scan Image Button */}
                                 <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleManualScanClick}
                                    disabled={!currentFile || isLoading} // Disable if no file or loading
                                 >
                                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                                    Etiketi Tara (OCR)
                                 </Button>
                                {/* Basic Camera Placeholder */}
                                <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: 'Yakında', description: 'Kamera özelliği eklenecektir.'})}>
                                    <Camera className="mr-2 h-4 w-4" /> Kamera ile Tara
                                </Button>
                            </div>
                           {/* {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />} */}
                           {ocrError && !isLoading && ( // Show error only if not loading
                                <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>OCR Hatası</AlertTitle>
                                <AlertDescription>{ocrError}</AlertDescription>
                                </Alert>
                             )}
                        </div>
                        </FormControl>
                         {/* Add FormMessage if validation requires a file */}
                         {/* <FormMessage /> */}
                    </FormItem>
                    )}
                />


              {/* Auto-filled/Display Fields */}
              <FormField
                control={form.control}
                name="chassisNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şase Numarası (Ruhsattan)</FormLabel>
                    <FormControl>
                       {/* Ensure the value displayed is from recordData, even though the field is disabled */}
                      <Input placeholder="Ruhsattan alınacak..." {...field} value={recordData.chassisNumber || field.value || ''} disabled />
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

              <div className="flex justify-between">
                 <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                     Geri
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || !currentFile && !(typeof form.getValues('labelDocument') === 'object' && form.getValues('labelDocument')?.name)}>
                   {/* {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} */}
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
