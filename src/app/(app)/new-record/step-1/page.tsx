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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, FileText, Loader2, Image as ImageIcon, AlertCircle, ScanSearch } from 'lucide-react'; // Added ImageIcon, AlertCircle, ScanSearch
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Import RecordData type
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image';
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema for the form fields including the initial OCR fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(),
  brand: z.string().optional(),
  type: z.string().optional(), // Corresponds to "tipi" from the document
  tradeName: z.string().optional(),
  owner: z.string().optional(),
  // Add other fields relevant to step 1 if any, e.g., file upload
  document: z.any().optional() // Make optional initially, validation might be needed elsewhere or on submit
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep1() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(25); // Step 1 of 4
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview
  const [ocrError, setOcrError] = React.useState<string | null>(null); // State for OCR errors
  const [currentFile, setCurrentFile] = React.useState<File | null>(null); // Keep track of the current File object

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      chassisNumber: recordData.chassisNumber || '',
      brand: recordData.brand || '',
      type: recordData.type || '', // Map to "tipi"
      tradeName: recordData.tradeName || '',
      owner: recordData.owner || '',
      document: recordData.registrationDocument || null, // Use saved document if exists
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Function to handle the OCR process
  const initiateOcrScan = React.useCallback(async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setOcrError(null);
    console.log("Starting OCR scan for Step 1...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
      });

      const base64String = reader.result as string;

      try {
        console.log("Calling extractVehicleData flow...");
        // Call Genkit flow for OCR
        const ocrResult = await extractVehicleData({ imageBase64: base64String });
        console.log("OCR Result (Step 1):", ocrResult.ocrData);

        const updates: Partial<RecordData> = {}; // Use RecordData type

        // --- START: Handle Override Decision ---

        // Get current form data AND data from subsequent steps (if available in global state)
        const currentDataForDecision = {
          chassisNumber: form.getValues('chassisNumber'),
          brand: form.getValues('brand'),
          type: form.getValues('type'), // Current form value for "tip"
          tradeName: form.getValues('tradeName'),
          owner: form.getValues('owner'),
          typeApprovalNumber: recordData.typeApprovalNumber, // From step 2 state
          typeAndVariant: recordData.typeAndVariant,     // From step 2 state
        };
        console.log("Current Data for Override Decision:", currentDataForDecision);

        // Prepare OCR data for decision flow
        const ocrDataForDecision = ocrResult.ocrData; // Use the full OCR data
        console.log("OCR Data for Override Decision:", ocrDataForDecision);


        // Call Genkit flow to decide which fields to override
        console.log("Calling decideOcrOverride flow...");
        const overrideDecision = await decideOcrOverride({
          ocrData: ocrDataForDecision,
          currentData: currentDataForDecision
        });
        console.log("Override Decision (Step 1):", overrideDecision.override);


        // --- Update form fields and state based on the OCR data and override decision ---
        const ocrData = ocrResult.ocrData;
        const override = overrideDecision.override;

        // Chassis Number
        if (override.chassisNumber && ocrData.chassisNumber) {
          console.log("Updating chassisNumber field with OCR data:", ocrData.chassisNumber);
          form.setValue('chassisNumber', ocrData.chassisNumber);
          updates.chassisNumber = ocrData.chassisNumber;
        } else {
            console.log("Not overriding chassisNumber. Override:", override.chassisNumber, "OCR Data:", ocrData.chassisNumber);
        }

        // Brand
        if (override.brand && ocrData.brand) {
            console.log("Updating brand field with OCR data:", ocrData.brand);
            form.setValue('brand', ocrData.brand);
            updates.brand = ocrData.brand;
        } else {
            console.log("Not overriding brand. Override:", override.brand, "OCR Data:", ocrData.brand);
        }

        // Type (Tip)
        if (override.type && ocrData.type) {
            console.log("Updating type field with OCR data:", ocrData.type);
            form.setValue('type', ocrData.type);
            updates.type = ocrData.type;
        } else {
            console.log("Not overriding type. Override:", override.type, "OCR Data:", ocrData.type);
        }

        // Trade Name
        if (override.tradeName && ocrData.tradeName) {
            console.log("Updating tradeName field with OCR data:", ocrData.tradeName);
            form.setValue('tradeName', ocrData.tradeName);
            updates.tradeName = ocrData.tradeName;
        } else {
             console.log("Not overriding tradeName. Override:", override.tradeName, "OCR Data:", ocrData.tradeName);
        }

        // Owner
        if (override.owner && ocrData.owner) {
            console.log("Updating owner field with OCR data:", ocrData.owner);
            form.setValue('owner', ocrData.owner);
            updates.owner = ocrData.owner;
        } else {
            console.log("Not overriding owner. Override:", override.owner, "OCR Data:", ocrData.owner);
        }

        // Update global state for step 2 fields if decision suggests it
        if (override.typeApprovalNumber && ocrData.typeApprovalNumber) {
             console.log("Preparing update for typeApprovalNumber in global state:", ocrData.typeApprovalNumber);
            updates.typeApprovalNumber = ocrData.typeApprovalNumber;
        }
        if (override.typeAndVariant && ocrData.typeAndVariant) {
            console.log("Preparing update for typeAndVariant in global state:", ocrData.typeAndVariant);
            updates.typeAndVariant = ocrData.typeAndVariant;
        }

        // --- END: Handle Override Decision ---


        // Update app state with all potentially overridden values
        console.log("Updating global state with:", { ...updates, registrationDocument: file });
        updateRecordData({ ...updates, registrationDocument: file }); // Ensure file object is in state

        toast({
          title: 'Başarılı',
          description: 'Araç ruhsatı bilgileri başarıyla okundu ve ilgili alanlar güncellendi.',
        });

      } catch (aiError) {
        console.error('AI/OCR error in Step 1:', aiError);
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
          setOcrError('Belge okunurken bir hata oluştu. Lütfen bilgileri manuel olarak kontrol edin veya tekrar deneyin.');
          toast({
            title: 'OCR Hatası',
            description: 'Belge taranırken bir hata oluştu. Bilgileri kontrol edin.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      } finally {
        setIsLoading(false);
        console.log("OCR Scan finished for Step 1.");
      }

    } catch (error) {
      // Catch errors from FileReader or other setup
      console.error('File handling/reading error in Step 1:', error);
      toast({
        title: 'Dosya Hatası',
        description: 'Dosya okunurken veya işlenirken bir hata oluştu.',
        variant: 'destructive',
      });
      setIsLoading(false);
      setOcrError('Dosya okunurken bir hata oluştu.');
    }
  }, [form, recordData.typeApprovalNumber, recordData.typeAndVariant, updateRecordData, toast]);


  // Revoke object URL on unmount or change
  React.useEffect(() => {
    // Function to set preview and current file from app state
    const setupPreview = () => {
      if (recordData.registrationDocument instanceof File) {
        const file = recordData.registrationDocument;
        setCurrentFile(file);
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
        form.setValue('document', file); // Sync form state
      } else if (typeof recordData.registrationDocument === 'object' && recordData.registrationDocument?.name) {
        // If only file info exists (persisted state), we can't preview but store info
        setCurrentFile(null); // No File object available
        setImagePreviewUrl(null);
        form.setValue('document', recordData.registrationDocument); // Store info in form
      } else {
        setCurrentFile(null);
        setImagePreviewUrl(null);
        form.setValue('document', null);
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
  }, [recordData.registrationDocument]); // Re-run when registrationDocument in global state changes

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

      form.setValue('document', file); // Update form state
      updateRecordData({ registrationDocument: file }); // Update app state immediately

      // Automatically initiate OCR scan upon file selection
      // await initiateOcrScan(file); // Deactivated auto-scan, user clicks button now

    } else {
      // Clear preview if no file is selected
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setCurrentFile(null);
      form.setValue('document', null); // Clear document value in form
      updateRecordData({ registrationDocument: undefined }); // Clear in app state
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
    if (!currentFile && !(typeof data.document === 'object' && data.document?.name)) {
        toast({
            title: 'Eksik Bilgi',
            description: 'Lütfen devam etmeden önce bir ruhsat belgesi yükleyin.',
            variant: 'destructive',
        });
        return; // Prevent submission if no document is loaded
    }

    // Ensure the current file object or persisted info is saved
    const documentToSave = currentFile || recordData.registrationDocument;

    console.log("Submitting Step 1 Data:", data);
    console.log("Document to save:", documentToSave);

    updateRecordData({
        chassisNumber: data.chassisNumber,
        brand: data.brand,
        type: data.type, // Save "tipi" value
        tradeName: data.tradeName,
        owner: data.owner,
        registrationDocument: documentToSave // Save the file object or its info
    });
    router.push('/new-record/step-2');
  };

  // Redirect if no branch is selected
  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
  }, [branch, router]);


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
              {/* File Upload Section */}
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => ( // field is not directly used for input display but for validation state
                  <FormItem>
                    <FormLabel>Ruhsat Belgesi</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                        {/* Image Preview */}
                        {imagePreviewUrl ? (
                          <div className="relative w-full max-w-xs h-48 mb-4">
                            <Image
                              src={imagePreviewUrl}
                              alt="Yüklenen Belge Önizlemesi"
                              fill // Use fill instead of layout="fill"
                              style={{ objectFit: 'contain' }} // Use style for objectFit
                              className="rounded-md"
                              unoptimized // Add if external images cause issues, or configure next.config.js properly
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span>Belge önizlemesi burada görünecek</span>
                          </div>
                        )}

                        {/* Display filename if available */}
                         {currentFile?.name ? (
                            <p className="text-sm text-muted-foreground">Yüklendi: {currentFile.name}</p>
                         ) : typeof field.value === 'object' && field.value?.name ? (
                             <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name} (Önizleme Yok)</p>
                         ) : !imagePreviewUrl && ( // Show placeholder text only if no preview and no file info
                           <p className="text-sm text-muted-foreground">Belge yüklemek için tıklayın veya sürükleyip bırakın.</p>
                         )}


                        <Input
                          type="file"
                          accept="image/*" // Only allow image files
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                          // Disable file input while OCR is loading
                          disabled={isLoading}
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
                                Resmi Tara (OCR)
                           </Button>
                          {/* Basic Camera Placeholder */}
                          <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: 'Yakında', description: 'Kamera özelliği eklenecektir.' })}>
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
                  name="type" // Name matches schema and state
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip</FormLabel> {/* Label for UI */}
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

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || !currentFile && !(typeof form.getValues('document') === 'object' && form.getValues('document')?.name)}>
                {/* {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} */}
                Devam Et
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
