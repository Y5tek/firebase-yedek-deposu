
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
  const [progress] = React.useState(14); // Step 1 of 7 (approx 14%)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [ocrError, setOcrError] = React.useState<string | null>(null); // State for OCR errors
  const [currentFile, setCurrentFile] = React.useState<File | null>(null); // Keep track of the current File object

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { // Initialize fields as empty
      chassisNumber: '',
      brand: '',
      type: '',
      tradeName: '',
      owner: '',
      plateNumber: '',
      document: null, // Document will be loaded from state in useEffect
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper function to handle potential 503 errors from AI flows
  const handleAiError = (error: unknown, step: number) => {
    console.error(`AI/OCR error in Step ${step}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir yapay zeka hatası oluştu.';

    // Check for specific AI Service Unavailable error
    if (errorMessage.includes('AI Service Unavailable') || errorMessage.includes('503') || errorMessage.includes('500 Internal Server Error')) {
        const errorType = errorMessage.includes('503') ? 'Yoğun/Kullanılamıyor' : 'Sunucu Hatası';
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
      console.log("OCR Result (Step 1):", ocrResult.ocrData);

      // Proceed only if OCR data is available
      if (!ocrResult || !ocrResult.ocrData) {
          throw new Error("OCR veri çıkarma işlemi başarısız oldu veya veri bulunamadı.");
      }

      const ocrData = ocrResult.ocrData;

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
      };
      console.log("Current Data for Override Decision (Step 1):", currentDataForDecision);

      const ocrDataForDecision = {
        ...ocrData,
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

      // --- Update form fields and prepare global state updates based on the OCR data and override decision ---
      const override = overrideDecision.override;

       // Function to decide if a field should be updated
       const shouldUpdate = (fieldName: keyof typeof override): boolean => {
         const ocrValue = ocrData[fieldName as keyof typeof ocrData];
         const currentValue = form.getValues(fieldName as keyof FormData);
         // Override decision is true AND OCR has value
         const condition1 = override[fieldName] && ocrValue;
         // Current value is empty AND OCR has value
         const condition2 = !currentValue && ocrValue;
         console.log(`shouldUpdate(${fieldName})? OCR: ${ocrValue}, Current: ${currentValue}, Override: ${override[fieldName]}, Cond1: ${condition1}, Cond2: ${condition2}, Result: ${!!(condition1 || condition2)}`);
         return !!(condition1 || condition2);
       };

      // Update chassisNumber field
      if (shouldUpdate('chassisNumber')) {
        console.log("Updating chassisNumber field with OCR data:", ocrData.chassisNumber);
        form.setValue('chassisNumber', ocrData.chassisNumber || ''); // Use fallback
        updates.chassisNumber = ocrData.chassisNumber;
      } else {
          console.log(`Not updating chassisNumber. Override decision: ${override.chassisNumber}, OCR Data: ${ocrData.chassisNumber}, Current Value: ${form.getValues('chassisNumber')}`);
          // If not overriding, ensure global state update uses current form value or existing global state value
          updates.chassisNumber = form.getValues('chassisNumber') || recordData.chassisNumber;
      }

      // Update brand field
      if (shouldUpdate('brand')) {
          console.log("Updating brand field with OCR data:", ocrData.brand);
          form.setValue('brand', ocrData.brand || ''); // Use fallback to empty string
          updates.brand = ocrData.brand;
      } else {
          console.log(`Not updating brand. Override decision: ${override.brand}, OCR Data: ${ocrData.brand}, Current Value: ${form.getValues('brand')}`);
          // Ensure global state reflects the actual value (either existing or form value)
           updates.brand = form.getValues('brand') || recordData.brand; // Prefer form value if exists, else keep global
      }

      // Update type field
      if (shouldUpdate('type')) {
          console.log("Updating type field with OCR data:", ocrData.type);
          form.setValue('type', ocrData.type || ''); // Use fallback
          updates.type = ocrData.type;
      } else {
          console.log(`Not updating type. Override decision: ${override.type}, OCR Data: ${ocrData.type}, Current Value: ${form.getValues('type')}`);
           updates.type = form.getValues('type') || recordData.type;
      }

      // Update tradeName field
      if (shouldUpdate('tradeName')) {
          console.log("Updating tradeName field with OCR data:", ocrData.tradeName);
          form.setValue('tradeName', ocrData.tradeName || ''); // Use fallback
          updates.tradeName = ocrData.tradeName;
      } else {
           console.log(`Not updating tradeName. Override decision: ${override.tradeName}, OCR Data: ${ocrData.tradeName}, Current Value: ${form.getValues('tradeName')}`);
            updates.tradeName = form.getValues('tradeName') || recordData.tradeName;
      }

      // Update owner field
      if (shouldUpdate('owner')) {
          console.log("Updating owner field with OCR data:", ocrData.owner);
          form.setValue('owner', ocrData.owner || ''); // Use fallback
          updates.owner = ocrData.owner;
      } else {
          console.log(`Not updating owner. Override decision: ${override.owner}, OCR Data: ${ocrData.owner}, Current Value: ${form.getValues('owner')}`);
           updates.owner = form.getValues('owner') || recordData.owner;
      }

      // Update plateNumber field
       if (shouldUpdate('plateNumber')) {
           console.log("Updating plateNumber field with OCR data:", ocrData.plateNumber);
           form.setValue('plateNumber', ocrData.plateNumber || ''); // Use fallback
           updates.plateNumber = ocrData.plateNumber;
       } else {
            console.log(`Not updating plateNumber. Override decision: ${override.plateNumber}, OCR Data: ${ocrData.plateNumber}, Current Value: ${form.getValues('plateNumber')}`);
             updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber;
       }


      // Update global state for step 2 fields if decision suggests it (these are not form fields here)
      // Using a separate check as these aren't form fields in Step 1
      const shouldUpdateGlobal = (fieldName: keyof typeof override): boolean => {
          const ocrValue = ocrData[fieldName as keyof typeof ocrData];
          const currentGlobalValue = recordData[fieldName as keyof typeof recordData];
          const condition1 = override[fieldName] && ocrValue;
          const condition2 = !currentGlobalValue && ocrValue;
          console.log(`shouldUpdateGlobal(${fieldName})? OCR: ${ocrValue}, Current Global: ${currentGlobalValue}, Override: ${override[fieldName]}, Cond1: ${condition1}, Cond2: ${condition2}, Result: ${!!(condition1 || condition2)}`);
          return !!(condition1 || condition2);
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


      toast({
        title: 'Başarılı',
        description: 'Araç ruhsatı bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
      });

    } catch (aiError) {
      // Handle AI specific errors (including potential 503)
      handleAiError(aiError, 1);
       // Fallback: if OCR worked but decision failed, still populate *empty* form fields
       if (ocrResult && ocrResult.ocrData && !overrideDecision) {
            console.warn("Override decision failed, populating empty fields with OCR data as fallback.");
            const ocrDataFallback = ocrResult.ocrData;
            // Fallback logic for each field - only populate if the form field is currently empty
            if (!form.getValues('chassisNumber') && ocrDataFallback.chassisNumber) {
                form.setValue('chassisNumber', ocrDataFallback.chassisNumber);
                updates.chassisNumber = ocrDataFallback.chassisNumber;
            } else { updates.chassisNumber = form.getValues('chassisNumber') || recordData.chassisNumber; } // Use current form value or existing

            if (!form.getValues('brand') && ocrDataFallback.brand) {
                form.setValue('brand', ocrDataFallback.brand);
                 updates.brand = ocrDataFallback.brand;
            } else { updates.brand = form.getValues('brand') || recordData.brand; }

            if (!form.getValues('type') && ocrDataFallback.type) {
                form.setValue('type', ocrDataFallback.type);
                 updates.type = ocrDataFallback.type;
            } else { updates.type = form.getValues('type') || recordData.type; }

            if (!form.getValues('tradeName') && ocrDataFallback.tradeName) {
                form.setValue('tradeName', ocrDataFallback.tradeName);
                updates.tradeName = ocrDataFallback.tradeName;
            } else { updates.tradeName = form.getValues('tradeName') || recordData.tradeName; }

            if (!form.getValues('owner') && ocrDataFallback.owner) {
                 form.setValue('owner', ocrDataFallback.owner);
                 updates.owner = ocrDataFallback.owner;
            } else { updates.owner = form.getValues('owner') || recordData.owner; }

             if (!form.getValues('plateNumber') && ocrDataFallback.plateNumber) {
                 form.setValue('plateNumber', ocrDataFallback.plateNumber);
                 updates.plateNumber = ocrDataFallback.plateNumber;
             } else { updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber; }

             // Fallback for global state fields (take existing or OCR if existing is empty)
             updates.typeApprovalNumber = recordData.typeApprovalNumber || ocrDataFallback.typeApprovalNumber;
             updates.typeAndVariant = recordData.typeAndVariant || ocrDataFallback.typeAndVariant;
       } else {
           // If OCR itself failed or decision failed without OCR fallback,
           // ensure updates reflect current form values or existing global state for consistency
           updates.chassisNumber = form.getValues('chassisNumber') || recordData.chassisNumber;
           updates.brand = form.getValues('brand') || recordData.brand;
           updates.type = form.getValues('type') || recordData.type;
           updates.tradeName = form.getValues('tradeName') || recordData.tradeName;
           updates.owner = form.getValues('owner') || recordData.owner;
           updates.plateNumber = form.getValues('plateNumber') || recordData.plateNumber;
           updates.typeApprovalNumber = recordData.typeApprovalNumber; // Keep existing global
           updates.typeAndVariant = recordData.typeAndVariant;     // Keep existing global
       }

    } finally {
       // Update app state with the collected updates and the file itself
       console.log("Updating global state with:", { ...updates, registrationDocument: file });
       updateRecordData({ ...updates, registrationDocument: file }); // Ensure file object and field data is in state
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
        form.setValue('document', file);
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
      form.resetField('chassisNumber');
      form.resetField('brand');
      form.resetField('type');
      form.resetField('tradeName');
      form.resetField('owner');
      form.resetField('plateNumber');
      console.log("Cleared text fields after new file upload.");

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
        plateNumber: form.getValues('plateNumber'), // Save plateNumber
        registrationDocument: documentToSave // This will be the File or the info object
    });
    router.push('/new-record/step-2');
  };

  // Load initial data from state (document preview and initial field values if persisted)
   React.useEffect(() => {
       if (!branch) {
           router.push('/select-branch');
           return; // Early return if no branch
       }

       // Load document from state for preview
       const docFromState = recordData.registrationDocument;
       if (docFromState instanceof File) {
           // The preview useEffect will handle this case
       } else if (typeof docFromState === 'object' && docFromState?.name) {
           form.setValue('document', docFromState);
           setImagePreviewUrl(null); // Ensure no old preview shows
           setCurrentFile(null);
       } else {
           // Ensure preview is cleared if no doc in state
           setImagePreviewUrl(null);
           setCurrentFile(null);
           form.setValue('document', null);
       }

       // Set initial form field values from recordData (if available), otherwise empty string
       form.setValue('chassisNumber', recordData.chassisNumber || '');
       form.setValue('brand', recordData.brand || '');
       form.setValue('type', recordData.type || '');
       form.setValue('tradeName', recordData.tradeName || '');
       form.setValue('owner', recordData.owner || '');
       form.setValue('plateNumber', recordData.plateNumber || '');

       console.log("Step 1 Initialized with recordData:", {
           chassisNumber: recordData.chassisNumber,
           brand: recordData.brand,
           type: recordData.type,
           tradeName: recordData.tradeName,
           owner: recordData.owner,
           plateNumber: recordData.plateNumber
       });


       // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [branch, router, recordData.chassisNumber, recordData.brand, recordData.type, recordData.tradeName, recordData.owner, recordData.plateNumber]); // Depend on individual fields to re-sync if they change in state
  // Note: We deliberately exclude the full `recordData` to avoid resetting fields unnecessarily on every minor change.
  // We also exclude `form` to avoid loops. `form.setValue` does not need `form` as a dependency.


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
                                disabled={!(currentFile || (typeof field.value === 'object' && field.value?.name)) || isLoading} // Enable if current file OR persisted info exists
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
                          <Input placeholder="Plaka girin veya Resmi Tara..." {...field} disabled={isLoading} />
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

    