
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, FileText, Loader2, Save, ChevronRight } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Import RecordData
import { cn } from '@/lib/utils';

// Schema for the İş Emri Formu
const FormSchema = z.object({
    projectName: z.string().optional(),
    workOrderNumber: z.string().optional(),
    plate: z.string().optional(), // Use plateNumber from global state
    chassisNumber: z.string().optional(), // Use chassisNumber from global state
    workOrderDate: z.date().optional(),
    completionDate: z.date().optional(),
    detailsOfWork: z.string().optional(),
    sparePartsUsed: z.string().optional(),
    notes: z.string().optional(), // Reuse notes from Step 4 or make specific
    pricing: z.string().optional(),
    vehicleAcceptanceSignature: z.string().optional(), // Placeholder for signature
    customerSignature: z.string().optional(), // Placeholder for signature
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep5() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(80); // Step 5 of 6

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
        projectName: recordData.projectName || '',
        workOrderNumber: recordData.workOrderNumber || '3', // Default İş Emri No
        plate: recordData.plateNumber || '', // Use plateNumber from state
        chassisNumber: recordData.chassisNumber || '', // Use chassisNumber from state
        workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
        completionDate: recordData.completionDate ? new Date(recordData.completionDate) : new Date(),
        detailsOfWork: recordData.detailsOfWork || '',
        sparePartsUsed: recordData.sparePartsUsed || '',
        notes: recordData.notes || '', // Reuse Step 4 notes by default
        pricing: recordData.pricing || '',
        vehicleAcceptanceSignature: recordData.vehicleAcceptanceSignature || '',
        customerSignature: recordData.customerSignature || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    // Update app state with the latest form data
    updateRecordData({
        projectName: data.projectName,
        workOrderNumber: data.workOrderNumber,
        // plateNumber and chassisNumber are already in state, just pass them along
        plateNumber: recordData.plateNumber, // Ensure it's consistent
        chassisNumber: recordData.chassisNumber, // Ensure it's consistent
        workOrderDate: data.workOrderDate?.toISOString(),
        completionDate: data.completionDate?.toISOString(),
        detailsOfWork: data.detailsOfWork,
        sparePartsUsed: data.sparePartsUsed,
        notes: data.notes, // Save the potentially updated notes
        pricing: data.pricing,
        vehicleAcceptanceSignature: data.vehicleAcceptanceSignature,
        customerSignature: data.customerSignature,
    });

    console.log("Submitting Step 5 Data, navigating to Step 6:", data);

    setIsLoading(false);
    router.push('/new-record/step-6'); // Navigate to the new Step 6 (Final Check Form)
  };

  const goBack = () => {
    // Save current data before going back
    updateRecordData({
        projectName: form.getValues('projectName'),
        workOrderNumber: form.getValues('workOrderNumber'),
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
            plate: recordData.plateNumber || '', // Sync with plateNumber from state
            chassisNumber: recordData.chassisNumber || '', // Sync with chassisNumber from state
            workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
            completionDate: recordData.completionDate ? new Date(recordData.completionDate) : new Date(),
            detailsOfWork: recordData.detailsOfWork || '',
            sparePartsUsed: recordData.sparePartsUsed || '',
            notes: recordData.notes || '', // Reuse notes
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
            Lütfen iş emri formunu doldurun ve devam edin.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
          </CardDescription>
          {/* Optional: Add Header mimicking image if needed */}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Top Section: Project, WO#, Dates etc. */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                 <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proje Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Proje adı..." {...field} disabled={isLoading} />
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
                          <Input placeholder="İş emri no..." {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="workOrderDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                          <FormLabel>İş Emri Tarihi</FormLabel>
                           <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                    disabled={isLoading}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
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

              {/* Second Row: Plate, Chassis, Branch, Completion Date */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md">
                    <FormField
                        control={form.control}
                        name="plate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plaka</FormLabel>
                            <FormControl>
                                {/* Display plateNumber from global state */}
                                <Input value={recordData.plateNumber || 'N/A'} disabled />
                            </FormControl>
                            <FormDescription>Önceki adımlardan</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                   <FormField
                        control={form.control}
                        name="chassisNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şasi No</FormLabel>
                            <FormControl>
                                {/* Display chassisNumber from global state */}
                                <Input value={recordData.chassisNumber || 'N/A'} disabled />
                            </FormControl>
                            <FormDescription>Önceki adımlardan</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                     <FormItem>
                        <FormLabel>Şube Adı</FormLabel>
                        <FormControl>
                            <Input value={branch || 'N/A'} disabled />
                         </FormControl>
                        <FormDescription>Şube Seçiminden</FormDescription>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="completionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                          <FormLabel>İşin Bitiş Tarihi</FormLabel>
                           <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                    disabled={isLoading}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
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

              {/* Large Text Areas */}
              <FormField
                control={form.control}
                name="detailsOfWork"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yapılacak İşlerin Detayları</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Yapılacak işleri buraya girin..." className="min-h-[100px] resize-y" {...field} disabled={isLoading} />
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
                      <Textarea placeholder="Kullanılan yedek parçaları buraya girin..." className="min-h-[100px] resize-y" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="notes" // Reusing notes field, consider renaming if distinct notes are needed
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklamalar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ek açıklamaları buraya girin..." className="min-h-[100px] resize-y" {...field} disabled={isLoading} />
                    </FormControl>
                     <FormDescription>Seri Tadilat Formundaki notlar buraya taşınmıştır, düzenleyebilirsiniz.</FormDescription>
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
                      <Textarea placeholder="Ücretlendirme detaylarını buraya girin..." className="min-h-[80px] resize-y" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               {/* Signature Placeholders */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-md">
                 <div className="space-y-2">
                    <FormLabel>Araç Kabul</FormLabel>
                    <div className="h-20 border rounded-md bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                        (İmza Alanı - Araç Kabul)
                    </div>
                    {/* Hidden input for potential future integration or data storage */}
                    <FormField control={form.control} name="vehicleAcceptanceSignature" render={({ field }) => <Input type="hidden" {...field} />} />
                 </div>
                 <div className="space-y-2">
                     <FormLabel>Müşteri İmzası</FormLabel>
                     <div className="h-20 border rounded-md bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                        (İmza Alanı - Müşteri)
                    </div>
                    {/* Hidden input for potential future integration or data storage */}
                    <FormField control={form.control} name="customerSignature" render={({ field }) => <Input type="hidden" {...field} />} />
                 </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                  Geri
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                  Devam Et (Son Kontrol)
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
