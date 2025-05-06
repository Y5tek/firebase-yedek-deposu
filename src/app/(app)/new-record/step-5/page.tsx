
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, ClipboardList, Loader2, ChevronRight } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Import RecordData
import { cn } from '@/lib/utils'; // Import cn

// Schema for the İş Emri Form based on the image
const FormSchema = z.object({
    projectName: z.string().optional(),
    plate: z.string().optional(), // Plate specific to İş Emri
    workOrderDate: z.date().optional(),
    detailsOfWork: z.string().optional(),
    workOrderNumber: z.string().optional().default('3'), // Default to 3 based on image
    // chassisNumber: z.string().optional(), // Read-only from state
    completionDate: z.date().optional(),
    projectNo: z.string().optional(), // Proje No next to İş Emri No
    sparePartsUsed: z.string().optional(), // Merging "Kullanılan Diğer Yedek Parçalar" and "AÇIKLAMALAR"
    pricing: z.string().optional(),
    vehicleAcceptanceSignature: z.string().optional(), // Text field for name/placeholder
    customerSignature: z.string().optional(), // Text field for name/placeholder
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep5() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(75); // Step 5 of 7 (approx 71%)

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      projectName: recordData.projectName || '',
      plate: recordData.plate || recordData.plateNumber || '', // Use İş Emri plate or fallback to ruhsat plate
      workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
      detailsOfWork: recordData.detailsOfWork || '',
      workOrderNumber: recordData.workOrderNumber || '3',
      completionDate: recordData.completionDate ? new Date(recordData.completionDate) : undefined, // Optional
      projectNo: recordData.projectNo || '',
      sparePartsUsed: recordData.sparePartsUsed || '', // Combined field
      pricing: recordData.pricing || '',
      vehicleAcceptanceSignature: recordData.vehicleAcceptanceSignature || '',
      customerSignature: recordData.customerSignature || '',
    },
  });

  const onSubmit = (data: FormData) => {
    setIsLoading(true);

    // Update app state with the latest form data
    updateRecordData({
        projectName: data.projectName,
        plate: data.plate, // Save İş Emri plate
        workOrderDate: data.workOrderDate?.toISOString(),
        detailsOfWork: data.detailsOfWork,
        workOrderNumber: data.workOrderNumber,
        completionDate: data.completionDate?.toISOString(),
        projectNo: data.projectNo,
        sparePartsUsed: data.sparePartsUsed,
        pricing: data.pricing,
        vehicleAcceptanceSignature: data.vehicleAcceptanceSignature,
        customerSignature: data.customerSignature,
        // Keep chassisNumber from previous steps
        chassisNumber: recordData.chassisNumber,
    });

    console.log("Submitting Step 5 Data, navigating to Step 6:", data);

    setIsLoading(false);
    router.push('/new-record/step-6'); // Navigate to the next step (Ara ve Son Kontrol)
  };

  const goBack = () => {
    // Save current data before going back
     updateRecordData({
        projectName: form.getValues('projectName'),
        plate: form.getValues('plate'),
        workOrderDate: form.getValues('workOrderDate')?.toISOString(),
        detailsOfWork: form.getValues('detailsOfWork'),
        workOrderNumber: form.getValues('workOrderNumber'),
        completionDate: form.getValues('completionDate')?.toISOString(),
        projectNo: form.getValues('projectNo'),
        sparePartsUsed: form.getValues('sparePartsUsed'),
        pricing: form.getValues('pricing'),
        vehicleAcceptanceSignature: form.getValues('vehicleAcceptanceSignature'),
        customerSignature: form.getValues('customerSignature'),
     });
    router.push('/new-record/step-4'); // Navigate back to Seri Tadilat form
  };

  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
      toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
      router.push('/select-branch');
    }
    // Sync form with persisted data
    form.reset({
      projectName: recordData.projectName || '',
      plate: recordData.plate || recordData.plateNumber || '',
      workOrderDate: recordData.workOrderDate ? new Date(recordData.workOrderDate) : new Date(),
      detailsOfWork: recordData.detailsOfWork || '',
      workOrderNumber: recordData.workOrderNumber || '3',
      completionDate: recordData.completionDate ? new Date(recordData.completionDate) : undefined,
      projectNo: recordData.projectNo || '',
      sparePartsUsed: recordData.sparePartsUsed || '',
      pricing: recordData.pricing || '',
      vehicleAcceptanceSignature: recordData.vehicleAcceptanceSignature || '',
      customerSignature: recordData.customerSignature || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData]); // Removed router, form from deps


  if (!branch || !recordData.chassisNumber) {
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-4xl mb-4" />
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
             {/* Left Side: Title */}
             <CardTitle className="text-2xl font-bold">
                 İş Emri
             </CardTitle>
             {/* Center: Branch Name */}
             <CardTitle className="text-xl font-semibold text-center flex-1">
                 Şube Adı: {branch}
             </CardTitle>
             {/* Right Side: Document Info Box */}
              <div className="text-xs border p-2 rounded-md space-y-1 w-40">
                <div className="flex justify-between"><span className="font-medium">Doküman No:</span> BÖLÜM1.3</div>
                <div className="flex justify-between"><span className="font-medium">Yayın Tarihi:</span> 01.05.2024</div>
                <div className="flex justify-between"><span className="font-medium">Revizyon No:</span> 02</div>
                <div className="flex justify-between"><span className="font-medium">Revizyon Tarihi:</span> 14.01.2025</div>
            </div>
          </div>
          <CardDescription>
            Lütfen İş Emri formunu doldurun.
            (Şase: {recordData.chassisNumber})
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Top Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border p-4 rounded-md">
                     {/* Left Column */}
                     <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="projectName"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">Proje Adı</FormLabel>
                                <span className="mx-2">:</span>
                                <FormControl>
                                <Input placeholder="Proje adı..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="plate"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">Plaka</FormLabel>
                                <span className="mx-2">:</span>
                                <FormControl>
                                <Input placeholder="Plaka no..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="workOrderDate"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">İş Emri Tarihi</FormLabel>
                                <span className="mx-2">:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "flex-1 pl-3 text-left font-normal justify-start", // Adjusted width & justify
                                            !field.value && "text-muted-foreground"
                                        )}
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
                                <FormMessage className="ml-[calc(theme(space.28)+theme(space.4))]"/> {/* Indent message */}
                            </FormItem>
                            )}
                         />
                    </div>
                    {/* Right Column */}
                     <div className="space-y-4">
                         <FormField
                            control={form.control}
                            name="workOrderNumber"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">İş Emri No</FormLabel>
                                <span className="mx-2">:</span>
                                <FormControl>
                                <Input type="text" placeholder="İş emri no..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormItem className="flex items-center">
                            <FormLabel className="w-28 shrink-0">Şase No</FormLabel>
                            <span className="mx-2">:</span>
                            <FormControl>
                            <Input value={recordData.chassisNumber || 'N/A'} disabled />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        <FormField
                            control={form.control}
                            name="completionDate"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">İşin Bitiş Tarihi</FormLabel>
                                <span className="mx-2">:</span>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "flex-1 pl-3 text-left font-normal justify-start",
                                        !field.value && "text-muted-foreground"
                                        )}
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
                                 <FormMessage className="ml-[calc(theme(space.28)+theme(space.4))]"/> {/* Indent message */}
                            </FormItem>
                            )}
                         />
                          <FormField
                            control={form.control}
                            name="projectNo"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-28 shrink-0">Proje No</FormLabel>
                                <span className="mx-2">:</span>
                                <FormControl>
                                <Input type="text" placeholder="Proje no..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Yapılacak İşler */}
                 <FormField
                    control={form.control}
                    name="detailsOfWork"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Yapılacak İşler</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Yapılacak işlerin detaylarını buraya yazın..."
                            className="resize-y min-h-[150px]" // Larger area
                            {...field}
                            disabled={isLoading}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {/* Kullanılan Diğer Yedek Parçalar / Açıklamalar */}
                <FormField
                    control={form.control}
                    name="sparePartsUsed"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kullanılan Diğer Yedek Parçalar / Açıklamalar</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Kullanılan yedek parçaları ve ek açıklamaları buraya yazın..."
                            className="resize-y min-h-[150px]" // Larger area
                            {...field}
                            disabled={isLoading}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                 {/* Ücretlendirme */}
                 <FormField
                    control={form.control}
                    name="pricing"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ücretlendirme</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Ücretlendirme detaylarını buraya yazın..."
                            className="resize-y min-h-[100px]"
                            {...field}
                            disabled={isLoading}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />


                 {/* Approval Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                    {/* ARAÇ KABUL */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-center">ARAÇ KABUL</h4>
                         <FormField
                            control={form.control}
                            name="vehicleAcceptanceSignature"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adı-Soyadı:</FormLabel>
                                <FormControl>
                                <Input placeholder="Araç kabul eden adı..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormItem>
                             <FormLabel>İmza:</FormLabel>
                             <div className="h-16 border rounded-md bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                                 (İmza Alanı)
                             </div>
                        </FormItem>
                    </div>

                    {/* MÜŞTERİ İMZASI */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-center">MÜŞTERİ İMZASI</h4>
                        <FormField
                            control={form.control}
                            name="customerSignature"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adı-Soyadı:</FormLabel>
                                <FormControl>
                                <Input placeholder="Müşteri adı..." {...field} disabled={isLoading} value={recordData.customerName || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormItem>
                             <FormLabel>İmza:</FormLabel>
                              <div className="h-16 border rounded-md bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                                 (İmza Alanı)
                             </div>
                        </FormItem>
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

