'use client';

import * as React from 'react';
import Image from 'next/image'; // Import next/image
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, FileText, Loader2, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import { useAppState } from '@/hooks/use-app-state';
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image';
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';

// Schema for the form fields including the initial OCR fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(),
  brand: z.string().optional(),
  type: z.string().optional(),
  tradeName: z.string().optional(),
  owner: z.string().optional(),
  // Add other fields relevant to step 1 if any, e.g., file upload
  document: z.any().refine((file) => !!file, 'Belge yüklemek zorunludur.') // Changed check to !!file
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep1() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(25); // Step 1 of 4
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null); // State for image preview

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      chassisNumber: recordData.chassisNumber || '',
      brand: recordData.brand || '',
      type: recordData.type || '',
      tradeName: recordData.tradeName || '',
      owner: recordData.owner || '',
      document: recordData.registrationDocument || null, // Use saved document if exists
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount or change
  React.useEffect(() => {
    // Set initial preview if document exists in state (from previous navigation)
    if (recordData.registrationDocument instanceof File) {
      const url = URL.createObjectURL(recordData.registrationDocument);
      setImagePreviewUrl(url);
    } else if (typeof recordData.registrationDocument === 'object' && recordData.registrationDocument?.name) {
        // If only file info exists (persisted state), we can't preview
        setImagePreviewUrl(null);
    }

    // Cleanup function
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to handle initial state and setup cleanup

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous URL if exists
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      // Create new object URL for preview
      const newPreviewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(newPreviewUrl);

      setIsLoading(true);
      form.setValue('document', file); // Update form state
       // Update app state immediately for UI feedback if needed
       updateRecordData({ registrationDocument: file });
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const base64String = reader.result as string;

          // Call Genkit flow for OCR
          const ocrResult = await extractVehicleData({ imageBase64: base64String });

          // Get current form data to pass to decision flow
          const currentData = form.getValues();

          // Call Genkit flow to decide which fields to override
          const overrideDecision = await decideOcrOverride({
             ocrData: ocrResult.ocrData,
             currentData: {
               chassisNumber: currentData.chassisNumber,
               brand: currentData.brand,
               type: currentData.type,
               tradeName: currentData.tradeName,
               owner: currentData.owner,
               // Pass other relevant fields if they exist in the form
               typeApprovalNumber: recordData.typeApprovalNumber,
               typeAndVariant: recordData.typeAndVariant,
             }
           });

          // Update form fields based on the decision
           const updates: Partial<FormData> = {};
           if (overrideDecision.override.chassisNumber && ocrResult.ocrData.chassisNumber) {
             form.setValue('chassisNumber', ocrResult.ocrData.chassisNumber);
             updates.chassisNumber = ocrResult.ocrData.chassisNumber;
           }
           if (overrideDecision.override.brand && ocrResult.ocrData.brand) {
             form.setValue('brand', ocrResult.ocrData.brand);
             updates.brand = ocrResult.ocrData.brand;
           }
           if (overrideDecision.override.type && ocrResult.ocrData.type) {
             form.setValue('type', ocrResult.ocrData.type);
             updates.type = ocrResult.ocrData.type;
           }
           if (overrideDecision.override.tradeName && ocrResult.ocrData.tradeName) {
             form.setValue('tradeName', ocrResult.ocrData.tradeName);
             updates.tradeName = ocrResult.ocrData.tradeName;
           }
           if (overrideDecision.override.owner && ocrResult.ocrData.owner) {
             form.setValue('owner', ocrResult.ocrData.owner);
             updates.owner = ocrResult.ocrData.owner;
           }
          // Update app state with potentially overridden values
          updateRecordData(updates);

          toast({
            title: 'Başarılı',
            description: 'Araç ruhsatı bilgileri başarıyla okundu.',
          });
        };
        reader.onerror = (error) => {
          console.error("File reading error:", error);
           toast({
            title: 'Hata',
            description: 'Dosya okunurken bir hata oluştu.',
            variant: 'destructive',
          });
           setIsLoading(false);
        }
      } catch (error) {
        console.error('OCR error:', error);
        toast({
          title: 'OCR Hatası',
          description: 'Belge taranırken bir hata oluştu. Lütfen tekrar deneyin.',
          variant: 'destructive',
        });
         // Clear preview if OCR fails? Optional.
         // if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
         // setImagePreviewUrl(null);
      } finally {
        setIsLoading(false);
      }
    } else {
        // Clear preview if no file is selected
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
        form.setValue('document', null); // Clear document value in form
        updateRecordData({ registrationDocument: undefined }); // Clear in app state
    }
  };

  const onSubmit = (data: FormData) => {
    // Update app state with the latest form data before navigating
    // Ensure the actual file object is passed if it exists, otherwise the stored info
    const documentToSave = data.document instanceof File ? data.document : recordData.registrationDocument;

    updateRecordData({
        chassisNumber: data.chassisNumber,
        brand: data.brand,
        type: data.type,
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
                Lütfen araç ruhsatını yükleyin. Bilgiler otomatik olarak doldurulacaktır.
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
                                        layout="fill"
                                        objectFit="contain"
                                        className="rounded-md"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                    <span>Belge önizlemesi burada görünecek</span>
                                </div>
                            )}

                            {/* Display filename if available */}
                            {field.value && typeof field.value === 'object' && 'name' in field.value ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name}</p>
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
                                disabled={isLoading}
                            />
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                    <Upload className="mr-2 h-4 w-4" /> {imagePreviewUrl ? 'Değiştir' : 'Dosya Seç'}
                                </Button>
                                {/* Basic Camera Placeholder */}
                                <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: 'Yakında', description: 'Kamera özelliği eklenecektir.'})}>
                                    <Camera className="mr-2 h-4 w-4" /> Kamera ile Tara
                                </Button>
                            </div>
                            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />}
                        </div>
                        </FormControl>
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
                            <Input placeholder="Otomatik doldurulacak..." {...field} disabled={isLoading} />
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
                            <Input placeholder="Otomatik doldurulacak..." {...field} disabled={isLoading} />
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
                            <Input placeholder="Otomatik doldurulacak..." {...field} disabled={isLoading} />
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
                            <Input placeholder="Otomatik doldurulacak..." {...field} disabled={isLoading} />
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
                                <Input placeholder="Otomatik doldurulacak..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || !form.formState.isValid}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Devam Et
                </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
