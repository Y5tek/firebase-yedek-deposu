
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

// Schema for the form fields including the initial OCR fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(),
  brand: z.string().optional(),
  type: z.string().optional(), // Corresponds to "tipi" from the document
  tradeName: z.string().optional(),
  owner: z.string().optional(),
  plateNumber: z.string().optional(), // Added plateNumber
  document: z.any().optional()
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep1() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(25); // Step 1 of 5
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [ocrError, setOcrError] = React.useState<string | null>(null); // State for OCR errors
  const [currentFile, setCurrentFile] = React.useState<File | null>(null); // Keep track of the current File object

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      chassisNumber: recordData.chassisNumber || '',
      brand: recordData.brand || '',
      type: recordData.type || '',
      tradeName: recordData.tradeName || '',
      owner: recordData.owner || '',
      plateNumber: recordData.plateNumber || '', // Default plateNumber
      document: recordData.registrationDocument || null,
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
      setOcrError(`Belge okunurken bir hata oluştu (Adım ${step}). Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin. Hata: ${errorMessage}`);
      toast({
        title: `OCR Hatası (Adım ${step})`,
        description: `Belge taranırken bir hata oluştu. Bilgileri kontrol edin. ${errorMessage}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
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
      console.log("OCR Result (Step 1):", ocrResult.ocrData);

      // Proceed only if OCR data is available
      if (!ocrResult || !ocrResult.ocrData) {
          throw new Error("OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
      }

      const ocrData = ocrResult.ocrData;

      // --- START: Handle Override Decision ---
      const currentDataForDecision = {
        chassisNumber: form.getValues('chassisNumber') || recordData.chassisNumber,
        brand: form.getValues('brand') || recordData.brand,
        type: form.getValues('type') || recordData.type,
        tradeName: form.getValues('tradeName') || recordData.tradeName,
        owner: form.getValues('owner') || recordData.owner,
        plateNumber: form.getValues('plateNumber') || recordData.plateNumber, // Include plateNumber
        typeApprovalNumber: recordData.typeApprovalNumber, // From global state (step 2)
        typeAndVariant: recordData.typeAndVariant,     // From global state (step 2)
      };
      console.log("Current Data for Override Decision (Step 1):", currentDataForDecision);

      // Extend OcrData in DecideOcrOverrideInputSchema if plateNumber needs AI decision
      const ocrDataForDecision = {
        ...ocrData,
        // plateNumber: ocrData.plateNumber, // Assuming plateNumber is extracted by OCR flow
      };
      console.log("OCR Data for Override Decision (Step 1):", ocrDataForDecision);

      console.log("Calling decideOcrOverride flow...");
      overrideDecision = await decideOcrOverride({
        ocrData: ocrDataForDecision,
        currentData: currentDataForDecision
      });
      console.log("Override Decision (Step 1):", overrideDecision.override);

      if (!overrideDecision || !overrideDecision.override) {
           throw new Error("Geçersiz kılma kararı alınamadı.");
      }
      // --- END: Handle Override Decision ---

      // --- Update form fields and state based on the OCR data and override decision ---
      const override = overrideDecision.override;

      // Function to decide if a field should be updated
      const shouldUpdate = (fieldName: keyof typeof override | 'plateNumber'): boolean => { // Include plateNumber
        // Handle plateNumber specifically if it's not part of override decision schema
        if (fieldName === 'plateNumber') {
             // Update plate number if OCR found it and current is empty, or if OCR is 'better' (customize logic)
             const ocrPlate = (ocrData as any).plateNumber; // Assume plateNumber might exist in ocrData
             const currentPlate = form.getValues('plateNumber');
             return !!(ocrPlate && (!currentPlate || ocrPlate.length > currentPlate.length)); // Example logic
        }
        // Ensure the field exists in ocrData before checking the override decision
        // Also check if OCR actually returned a value for that field.
        const ocrValue = ocrData[fieldName as keyof typeof ocrData];
        return !!(override[fieldName as keyof typeof override] && ocrValue);
      };

      // Update fields based on decision
      if (shouldUpdate('chassisNumber')) {
        console.log("Updating chassisNumber field with OCR data:", ocrData.chassisNumber);
        form.setValue('chassisNumber', ocrData.chassisNumber!);
        updates.chassisNumber = ocrData.chassisNumber;
      } else {
          console.log("Not overriding chassisNumber. Override:", override.chassisNumber, "OCR Data:", ocrData.chassisNumber);
      }

      if (shouldUpdate('brand')) {
          console.log("Updating brand field with OCR data:", ocrData.brand);
          form.setValue('brand', ocrData.brand!);
          updates.brand = ocrData.brand;
      } else {
          console.log("Not overriding brand. Override:", override.brand, "OCR Data:", ocrData.brand);
      }

      if (shouldUpdate('type')) {
          console.log("Updating type field with OCR data:", ocrData.type);
          form.setValue('type', ocrData.type!);
          updates.type = ocrData.type;
      } else {
          console.log("Not overriding type. Override:", override.type, "OCR Data:", ocrData.type);
      }

      if (shouldUpdate('tradeName')) {
          console.log("Updating tradeName field with OCR data:", ocrData.tradeName);
          form.setValue('tradeName', ocrData.tradeName!);
          updates.tradeName = ocrData.tradeName;
      } else {
           console.log("Not overriding tradeName. Override:", override.tradeName, "OCR Data:", ocrData.tradeName);
      }

      if (shouldUpdate('owner')) {
          console.log("Updating owner field with OCR data:", ocrData.owner);
          form.setValue('owner', ocrData.owner!);
          updates.owner = ocrData.owner;
      } else {
          console.log("Not overriding owner. Override:", override.owner, "OCR Data:", ocrData.owner);
      }

       // Update plate number (assuming it's extracted)
       if (shouldUpdate('plateNumber')) {
           const ocrPlate = (ocrData as any).plateNumber; // Get plate number from OCR result
           console.log("Updating plateNumber field with OCR data:", ocrPlate);
           form.setValue('plateNumber', ocrPlate);
           updates.plateNumber = ocrPlate;
       } else {
            console.log("Not updating plateNumber. OCR Data:", (ocrData as any).plateNumber);
       }


      // Update global state for step 2 fields if decision suggests it
      if (shouldUpdate('typeApprovalNumber')) {
           console.log("Preparing update for typeApprovalNumber in global state:", ocrData.typeApprovalNumber);
          updates.typeApprovalNumber = ocrData.typeApprovalNumber;
      } else {
          console.log("Not overriding typeApprovalNumber. Override:", override.typeApprovalNumber, "OCR Data:", ocrData.typeApprovalNumber);
      }
      if (shouldUpdate('typeAndVariant')) {
          console.log("Preparing update for typeAndVariant in global state:", ocrData.typeAndVariant);
          updates.typeAndVariant = ocrData.typeAndVariant;
      } else {
          console.log("Not overriding typeAndVariant. Override:", override.typeAndVariant, "OCR Data:", ocrData.typeAndVariant);
      }


      toast({
        title: 'Başarılı',
        description: 'Araç ruhsatı bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
      });

    } catch (aiError) {
      // Handle AI specific errors (including potential 503)
      handleAiError(aiError, 1);
       // Fallback: if OCR worked but decision failed, still populate empty fields
       if (ocrResult && ocrResult.ocrData && !overrideDecision) {
            console.warn("Override decision failed, populating empty fields with OCR data as fallback.");
            const ocrDataFallback = ocrResult.ocrData;
            if (!form.getValues('chassisNumber') && ocrDataFallback.chassisNumber) {
                form.setValue('chassisNumber', ocrDataFallback.chassisNumber);
                updates.chassisNumber = ocrDataFallback.chassisNumber;
            }
            if (!form.getValues('brand') && ocrDataFallback.brand) {
                form.setValue('brand', ocrDataFallback.brand);
                 updates.brand = ocrDataFallback.brand;
            }
            if (!form.getValues('type') && ocrDataFallback.type) {
                form.setValue('type', ocrDataFallback.type);
                 updates.type = ocrDataFallback.type;
            }
            if (!form.getValues('tradeName') && ocrDataFallback.tradeName) {
                form.setValue('tradeName', ocrDataFallback.tradeName);
                updates.tradeName = ocrDataFallback.tradeName;
            }
            if (!form.getValues('owner') && ocrDataFallback.owner) {
                 form.setValue('owner', ocrDataFallback.owner);
                 updates.owner = ocrDataFallback.owner;
            }
             if (!form.getValues('plateNumber') && (ocrDataFallback as any).plateNumber) { // Fallback for plateNumber
                 form.setValue('plateNumber', (ocrDataFallback as any).plateNumber);
                 updates.plateNumber = (ocrDataFallback as any).plateNumber;
             }

            // Update global state for potential future use even without decision
             updates.typeApprovalNumber = recordData.typeApprovalNumber || ocrDataFallback.typeApprovalNumber;
             updates.typeAndVariant = recordData.typeAndVariant || ocrDataFallback.typeAndVariant;
       }

    } finally {
       // Update app state regardless of override success, including the file itself
       console.log("Updating global state with:", { ...updates, registrationDocument: file });
       updateRecordData({ ...updates, registrationDocument: file }); // Ensure file object is in state
       setIsLoading(false);
       console.log("OCR Scan finished for Step 1.");
    }

  }, [form, recordData, updateRecordData, toast]);


  // Revoke object URL on unmount or change
  React.useEffect(() => {
    const setupPreview = () => {
      if (recordData.registrationDocument instanceof File) {
        const file = recordData.registrationDocument;
        setCurrentFile(file);
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
        form.setValue('document', file);
      } else if (typeof recordData.registrationDocument === 'object' && recordData.registrationDocument?.name) {
        // If it's serializable info (from persisted state), no preview
        setCurrentFile(null); // No actual File object here
        setImagePreviewUrl(null);
        form.setValue('document', recordData.registrationDocument); // Keep the info for the field
      } else {
        // Reset if neither File nor info object exists
        setCurrentFile(null);
        setImagePreviewUrl(null);
        form.setValue('document', null);
      }
    };

    setupPreview();

    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
    // Only re-run if the registrationDocument itself changes identity or type
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

      // Deactivated auto-scan, user clicks button now
      // initiateOcrScan(file); // Optional: Trigger scan immediately after selection
    } else {
      // Handle case where file selection is cancelled or no file is chosen
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setCurrentFile(null);
      form.setValue('document', null);
      // Use undefined to explicitly clear the document in global state
      updateRecordData({ registrationDocument: undefined });
       console.log("File selection cancelled or no file chosen.");
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
    updateRecordData({
        chassisNumber: data.chassisNumber,
        brand: data.brand,
        type: data.type,
        tradeName: data.tradeName,
        owner: data.owner,
        plateNumber: data.plateNumber, // Save plateNumber
        registrationDocument: documentToSave // This will be the File or the info object
    });
    router.push('/new-record/step-2');
  };

  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
     // Sync form fields with global state when the component loads or recordData changes
     // This ensures data from OCR/override is reflected and persisted data is loaded
     form.reset({
        chassisNumber: recordData.chassisNumber || '',
        brand: recordData.brand || '',
        type: recordData.type || '',
        tradeName: recordData.tradeName || '',
        owner: recordData.owner || '',
        plateNumber: recordData.plateNumber || '', // Sync plateNumber
        document: recordData.registrationDocument || null,
     });
      // Setup preview again after form reset ensures correct preview state
       const setupPreview = () => {
         if (recordData.registrationDocument instanceof File) {
            const file = recordData.registrationDocument;
            setCurrentFile(file);
             // Avoid creating new object URLs unnecessarily if preview already exists for the same file
             if (!imagePreviewUrl || currentFile?.name !== file.name) {
                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                const url = URL.createObjectURL(file);
                setImagePreviewUrl(url);
            }
         } else if (typeof recordData.registrationDocument === 'object' && recordData.registrationDocument?.name) {
             setCurrentFile(null);
             setImagePreviewUrl(null);
         } else {
             setCurrentFile(null);
             setImagePreviewUrl(null);
         }
       };
       setupPreview();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData, router]); // form is excluded as form.reset handles sync


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
            Lütfen araç ruhsatını yükleyin ve 'Resmi Tara' butonu ile bilgileri alın.
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
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span>Belge önizlemesi burada görünecek</span>
                          </div>
                        )}

                         {currentFile?.name ? (
                            <p className="text-sm text-muted-foreground">Yüklendi: {currentFile.name}</p>
                         ) : typeof field.value === 'object' && field.value?.name ? (
                             <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name} (Önizleme Yok)</p>
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
                                disabled={!currentFile || isLoading}
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
                            <AlertTitle>OCR/AI Hatası</AlertTitle>
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
                          <Input placeholder="Plaka girin veya Resmi Tara..." {...field} disabled={isLoading} />
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
                        <FormLabel>Sahibi</FormLabel>
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
