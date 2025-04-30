'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, FileText, Loader2, Save, PlusCircle, Trash2 } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea'; // May not be needed, but keep import
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData, OfferItem } from '@/hooks/use-app-state'; // Import OfferItem
import { cn, getSerializableFileInfo } from '@/lib/utils'; // Import cn and getSerializableFileInfo


// Schema for an individual offer item
const OfferItemSchema = z.object({
    id: z.string(), // For React key
    itemName: z.string().optional(),
    quantity: z.number().optional().nullable(), // Use nullable for empty input
    unitPrice: z.number().optional().nullable(),
    totalPrice: z.number().optional().nullable(), // Calculated
});

// Schema for the main Offer Form
const FormSchema = z.object({
    projectName: z.string().optional(),
    workOrderNumber: z.string().optional(),
    plate: z.string().optional(),
    chassisNumber: z.string().optional(),
    workOrderDate: z.date().optional(),
    completionDate: z.date().optional(),
    detailsOfWork: z.string().optional(),
    sparePartsUsed: z.string().optional(),
    notes: z.string().optional(),
    pricing: z.string().optional(),
    vehicleAcceptanceSignature: z.string().optional(),
    customerSignature: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep5() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(100); // Step 5 of 5

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
        projectName: recordData.projectName || '',
        workOrderNumber: recordData.workOrderNumber || '3',
        plate: recordData.plate || '',
        chassisNumber: recordData.chassisNumber || '',
        workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
        completionDate: recordData.completionDate ? new Date(recordData.completionDate) : new Date(),
        detailsOfWork: recordData.detailsOfWork || '',
        sparePartsUsed: recordData.sparePartsUsed || '',
        notes: recordData.notes || '',
        pricing: recordData.pricing || '',
        vehicleAcceptanceSignature: recordData.vehicleAcceptanceSignature || '',
        customerSignature: recordData.customerSignature || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate saving

    // Update app state with the latest form data
    updateRecordData({
        projectName: data.projectName,
        workOrderNumber: data.workOrderNumber,
        plate: data.plate,
        chassisNumber: data.chassisNumber,
        workOrderDate: data.workOrderDate?.toISOString(),
        completionDate: data.completionDate?.toISOString(),
        detailsOfWork: data.detailsOfWork,
        sparePartsUsed: data.sparePartsUsed,
        notes: data.notes,
        pricing: data.pricing,
        vehicleAcceptanceSignature: data.vehicleAcceptanceSignature,
        customerSignature: data.customerSignature,
    });

    // Use getState() to access the latest state after update
    const finalRecordData = useAppState.getState().recordData;

    // Create the final archive entry
    const archiveEntry = {
        // --- Data from previous steps ---
        branch: branch,
        chassisNumber: finalRecordData.chassisNumber,
        brand: finalRecordData.brand,
        type: finalRecordData.type,
        tradeName: finalRecordData.tradeName,
        owner: finalRecordData.owner,
        typeApprovalNumber: finalRecordData.typeApprovalNumber,
        typeAndVariant: finalRecordData.typeAndVariant,
        plateNumber: finalRecordData.plateNumber, // Include plateNumber
        // --- Data from previous forms ---
        customerName: finalRecordData.customerName, // From Step 4
        formDate: finalRecordData.formDate, // Step 4 date
        sequenceNo: finalRecordData.sequenceNo, // Step 4
        q1_suitable: finalRecordData.q1_suitable, // Step 4
        q2_typeApprovalMatch: finalRecordData.q2_typeApprovalMatch, // Step 4
        q3_scopeExpansion: finalRecordData.q3_scopeExpansion, // Step 4
        q4_unaffectedPartsDefect: finalRecordData.q4_unaffectedPartsDefect, // Step 4
        notes: finalRecordData.notes, // Step 4 notes
        controllerName: finalRecordData.controllerName, // Step 4
        authorityName: finalRecordData.authorityName, // Step 4
       // --- Data from this step (Step 5 Form) ---
       projectName: data.projectName,
       workOrderNumber: data.workOrderNumber,
       plate: data.plate,
       chassisNumber: data.chassisNumber,
       workOrderDate: data.workOrderDate?.toISOString(),
       completionDate: data.completionDate?.toISOString(),
       detailsOfWork: data.detailsOfWork,
       sparePartsUsed: data.sparePartsUsed,
       pricing: data.pricing,
       vehicleAcceptanceSignature: data.vehicleAcceptanceSignature,
       customerSignature: data.customerSignature,
        // --- File Info & Metadata ---
        registrationDocument: getSerializableFileInfo(finalRecordData.registrationDocument),
        labelDocument: getSerializableFileInfo(finalRecordData.labelDocument),
        additionalPhotos: finalRecordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
        additionalVideos: finalRecordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
        archivedAt: new Date().toISOString(),
        fileName: `${branch}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}`
    };

    console.log("Archiving final entry:", archiveEntry);

    const currentArchive = finalRecordData.archive || [];
    updateRecordData({ archive: [...currentArchive, archiveEntry] });

    setIsLoading(false);
    toast({
      title: 'Kayıt Tamamlandı',
      description: 'İş emri formu başarıyla kaydedildi ve tüm kayıt arşivlendi.',
    });
    updateRecordData({}, true); // Reset record data (keeping archive)
    router.push('/archive');
  };

  const goBack = () => {
    // Save current data before going back
    updateRecordData({
      projectName: form.getValues('projectName'),
      workOrderNumber: form.getValues('workOrderNumber'),
      plate: form.getValues('plate'),
      chassisNumber: form.getValues('chassisNumber'),
      workOrderDate: form.getValues('workOrderDate')?.toISOString(),
      completionDate: form.getValues('completionDate')?.toISOString(),
      detailsOfWork: form.getValues('detailsOfWork'),
      sparePartsUsed: form.getValues('sparePartsUsed'),
      notes: form.getValues('notes'),
      pricing: form.getValues('pricing'),
      vehicleAcceptanceSignature: form.getValues('vehicleAcceptanceSignature'),
      customerSignature: form.getValues('customerSignature'),
    });
    router.push('/new-record/step-4');
  };

   React.useEffect(() => {
        if (!branch || !recordData.chassisNumber) {
            toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
            router.push('/select-branch');
        }
        // Sync form with persisted data and apply defaults
        form.reset({
            projectName: recordData.projectName || '',
            workOrderNumber: recordData.workOrderNumber || '3',
            plate: recordData.plate || '',
            chassisNumber: recordData.chassisNumber || '',
            workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
            completionDate: recordData.completionDate ? new Date(recordData.completionDate) : new Date(),
            detailsOfWork: recordData.detailsOfWork || '',
            sparePartsUsed: recordData.sparePartsUsed || '',
            notes: recordData.notes || '',
            pricing: recordData.pricing || '',
            vehicleAcceptanceSignature: recordData.vehicleAcceptanceSignature || '',
            customerSignature: recordData.customerSignature || '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch, recordData]);

  if (!branch || !recordData.chassisNumber) {
        return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
    }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-5xl mb-4" />
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="text-primary" />
            İş Emri Formu
          </CardTitle>
          <CardDescription>
            Lütfen iş emri formunu doldurun ve kaydedin. Bu son adımdır.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proje Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Proje adı" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workOrderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İş Emri No</FormLabel>
                      <FormControl>
                        <Input placeholder="İş emri no" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="plate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plaka</FormLabel>
                        <FormControl>
                          <Input placeholder="Plaka" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="chassisNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şase No</FormLabel>
                      <FormControl>
                        <Input placeholder="Şase no" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workOrderDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>İş Emri Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isLoading}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="completionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>İşin Bitiş Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isLoading}
                            initialFocus
                            locale={tr}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="detailsOfWork"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yapılacak İşler</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Yapılacak işleri buraya girin" className="resize-none" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="sparePartsUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanılan Diğer Yedek Parçalar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Kullanılan yedek parçaları buraya girin" className="resize-none" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklamalar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ek açıklamaları buraya girin" className="resize-none" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="pricing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ücretlendirme</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ücretlendirme detaylarını buraya girin" className="resize-none" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleAcceptanceSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Araç Kabul</FormLabel>
                      <FormControl>
                        <Input placeholder="Araç kabul imza" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="customerSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Müşteri İmzası</FormLabel>
                      <FormControl>
                        <Input placeholder="Müşteri imza" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                  Geri
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Kaydı Tamamla ve Arşivle
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

