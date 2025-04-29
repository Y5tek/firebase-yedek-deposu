'use client';

import * as React from 'react';
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
import { Upload, Camera, Tag, Loader2 } from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state';
import { extractVehicleData } from '@/ai/flows/extract-vehicle-data-from-image'; // Assuming same flow can extract label info
import { decideOcrOverride } from '@/ai/flows/decide-ocr-override';


// Schema for step 2 fields
const FormSchema = z.object({
  chassisNumber: z.string().optional(), // Display only, filled from step 1/OCR
  typeApprovalNumber: z.string().optional(),
  typeAndVariant: z.string().optional(),
  labelDocument: z.any().refine((file) => file?.length > 0, 'Etiket belgesi yüklemek zorunludur.') // File upload for label
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep2() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(50); // Step 2 of 4

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      form.setValue('labelDocument', file); // Update form state
      updateRecordData({ labelDocument: file }); // Update app state

      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const base64String = reader.result as string;

          // Call Genkit flow for OCR (reuse or create specific one if needed)
          const ocrResult = await extractVehicleData({ imageBase64: base64String });

           // Get current form data to pass to decision flow
           const currentData = form.getValues();

          // Call Genkit flow to decide which fields to override
          const overrideDecision = await decideOcrOverride({
             ocrData: ocrResult.ocrData, // Pass all OCR data, even if not directly used in this step's form
             currentData: {
               // Pass relevant current data
               chassisNumber: recordData.chassisNumber, // From previous step
               brand: recordData.brand,
               type: recordData.type,
               tradeName: recordData.tradeName,
               owner: recordData.owner,
               typeApprovalNumber: currentData.typeApprovalNumber,
               typeAndVariant: currentData.typeAndVariant,
             }
           });

          // Update form fields based on the decision (for Step 2 fields)
           const updates: Partial<FormData & { chassisNumber?: string }> = {}; // Include chassisNumber for app state update
           // Check if OCR found chassisNumber and decision allows override (might update app state even if field is read-only)
           if (overrideDecision.override.chassisNumber && ocrResult.ocrData.chassisNumber) {
              // form.setValue('chassisNumber', ocrResult.ocrData.chassisNumber); // Field is disabled, but update state
               updates.chassisNumber = ocrResult.ocrData.chassisNumber;
           }
           if (overrideDecision.override.typeApprovalNumber && ocrResult.ocrData.typeApprovalNumber) {
             form.setValue('typeApprovalNumber', ocrResult.ocrData.typeApprovalNumber);
             updates.typeApprovalNumber = ocrResult.ocrData.typeApprovalNumber;
           }
           if (overrideDecision.override.typeAndVariant && ocrResult.ocrData.typeAndVariant) {
             form.setValue('typeAndVariant', ocrResult.ocrData.typeAndVariant);
             updates.typeAndVariant = ocrResult.ocrData.typeAndVariant;
           }

          // Update potentially other fields in the global state based on decision
           if (overrideDecision.override.brand && ocrResult.ocrData.brand) updates.brand = ocrResult.ocrData.brand;
           if (overrideDecision.override.type && ocrResult.ocrData.type) updates.type = ocrResult.ocrData.type;
           if (overrideDecision.override.tradeName && ocrResult.ocrData.tradeName) updates.tradeName = ocrResult.ocrData.tradeName;
           if (overrideDecision.override.owner && ocrResult.ocrData.owner) updates.owner = ocrResult.ocrData.owner;


          // Update app state with potentially overridden values from this OCR scan
          updateRecordData(updates);


          toast({
            title: 'Başarılı',
            description: 'Etiket bilgileri başarıyla okundu.',
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
          description: 'Etiket taranırken bir hata oluştu. Lütfen tekrar deneyin.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onSubmit = (data: FormData) => {
     // Update app state with the latest form data before navigating
    updateRecordData({
        typeApprovalNumber: data.typeApprovalNumber,
        typeAndVariant: data.typeAndVariant,
        labelDocument: data.labelDocument // Save the file object
    });
    router.push('/new-record/step-3');
  };

  const goBack = () => {
    // Save current data before going back potentially?
     updateRecordData({
        typeApprovalNumber: form.getValues('typeApprovalNumber'),
        typeAndVariant: form.getValues('typeAndVariant'),
        labelDocument: form.getValues('labelDocument')
    });
    router.push('/new-record/step-1');
  };

   // Redirect if no branch is selected
  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
     // Pre-fill chassis number when component mounts if not already set
     if (recordData.chassisNumber && !form.getValues('chassisNumber')) {
       form.setValue('chassisNumber', recordData.chassisNumber);
     }
  }, [branch, recordData.chassisNumber, form, router]);


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
             Lütfen araç etiketini yükleyin. Bilgiler otomatik olarak doldurulacaktır.
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
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Etiket Belgesi</FormLabel>
                        <FormControl>
                        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                            {field.value && typeof field.value === 'object' && 'name' in field.value ? (
                                <p className="text-sm text-muted-foreground">Yüklendi: {field.value.name}</p>
                            ) : (
                               <p className="text-sm text-muted-foreground">Etiket belgesini yüklemek için tıklayın veya sürükleyip bırakın.</p>
                            )}
                            <Input
                                type="file"
                                accept="image/*" // Primarily images for labels
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                id="label-file-upload"
                                disabled={isLoading}
                            />
                             <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                    <Upload className="mr-2 h-4 w-4" /> Dosya Seç
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


              {/* Auto-filled/Display Fields */}
              <FormField
                control={form.control}
                name="chassisNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şase Numarası (Ruhsattan)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ruhsattan alınacak..." {...field} disabled />
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
                      <Input placeholder="Etiketten otomatik doldurulacak..." {...field} disabled={isLoading} />
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
                      <Input placeholder="Etiketten otomatik doldurulacak..." {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between">
                 <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                     Geri
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
