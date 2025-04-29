
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, FileSpreadsheet, Loader2, ChevronRight } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state'; // RecordData type is implicitly used via useAppState
import { cn } from '@/lib/utils'; // Import cn only

// Schema for the detailed form based on the image
const FormSchema = z.object({
    customerName: z.string().optional(),
    formDate: z.date().optional(),
    sequenceNo: z.string().optional(), // Assuming SIRA is a string field
    // Plaka & Şasi and Şube Adı will be pulled from state, not form fields here
    q1_suitable: z.enum(['olumlu', 'olumsuz']).optional(),
    q2_typeApprovalMatch: z.enum(['olumlu', 'olumsuz']).optional(),
    q3_scopeExpansion: z.enum(['olumlu', 'olumsuz']).optional(),
    q4_unaffectedPartsDefect: z.enum(['olumlu', 'olumsuz']).optional(),
    notes: z.string().optional(),
    controllerName: z.string().optional(),
    authorityName: z.string().optional(),
    // Signatures are usually handled differently (e.g., separate component or upload), omitting direct field
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep4() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false); // Keep loading state if needed for async ops later
  const [progress] = React.useState(80); // Step 4 of 5

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      customerName: recordData.customerName || '',
      formDate: recordData.formDate ? new Date(recordData.formDate) : new Date(), // Default to today if no date
      sequenceNo: recordData.sequenceNo || '3', // Default SIRA to 3 based on image
      q1_suitable: recordData.q1_suitable ?? 'olumlu', // Default to olumlu using ??
      q2_typeApprovalMatch: recordData.q2_typeApprovalMatch ?? 'olumlu', // Default to olumlu using ??
      q3_scopeExpansion: recordData.q3_scopeExpansion ?? 'olumlu', // Default to olumlu using ??
      q4_unaffectedPartsDefect: recordData.q4_unaffectedPartsDefect ?? 'olumlu', // Default to olumlu using ??
      notes: recordData.notes || '',
      controllerName: recordData.controllerName || '',
      authorityName: recordData.authorityName || '',
    },
  });

  const onSubmit = (data: FormData) => {
    setIsLoading(true); // Optional: Keep if future steps might be async

    // Update app state with the latest form data
    updateRecordData({
        customerName: data.customerName,
        formDate: data.formDate?.toISOString(), // Store date as ISO string
        sequenceNo: data.sequenceNo,
        q1_suitable: data.q1_suitable,
        q2_typeApprovalMatch: data.q2_typeApprovalMatch,
        q3_scopeExpansion: data.q3_scopeExpansion,
        q4_unaffectedPartsDefect: data.q4_unaffectedPartsDefect,
        notes: data.notes,
        controllerName: data.controllerName,
        authorityName: data.authorityName,
    });

    console.log("Submitting Step 4 Data, navigating to Step 5:", data);

    setIsLoading(false); // Optional: Reset loading state
    router.push('/new-record/step-5'); // Navigate to the new Step 5 (Offer Form)
  };

  const goBack = () => {
    // Save current data before going back
    updateRecordData({
        customerName: form.getValues('customerName'),
        formDate: form.getValues('formDate')?.toISOString(),
        sequenceNo: form.getValues('sequenceNo'),
        q1_suitable: form.getValues('q1_suitable'),
        q2_typeApprovalMatch: form.getValues('q2_typeApprovalMatch'),
        q3_scopeExpansion: form.getValues('q3_scopeExpansion'),
        q4_unaffectedPartsDefect: form.getValues('q4_unaffectedPartsDefect'),
        notes: form.getValues('notes'),
        controllerName: form.getValues('controllerName'),
        authorityName: form.getValues('authorityName'),
    });
    router.push('/new-record/step-3');
  };

  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
      toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
      router.push('/select-branch');
    }
    // Sync form with persisted data and apply defaults
    form.reset({
        customerName: recordData.customerName || '',
        formDate: recordData.formDate ? new Date(recordData.formDate) : new Date(), // Default to today
        sequenceNo: recordData.sequenceNo || '3',
        q1_suitable: recordData.q1_suitable ?? 'olumlu',
        q2_typeApprovalMatch: recordData.q2_typeApprovalMatch ?? 'olumlu',
        q3_scopeExpansion: recordData.q3_scopeExpansion ?? 'olumlu',
        q4_unaffectedPartsDefect: recordData.q4_unaffectedPartsDefect ?? 'olumlu',
        notes: recordData.notes || '',
        controllerName: recordData.controllerName || '',
        authorityName: recordData.authorityName || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData]); // removed router from deps


  if (!branch || !recordData.chassisNumber) {
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  // Checklist questions
  const checklistItems = [
    { id: 'q1_suitable', label: '1- YAPILACAK TADİLATA ARAÇ UYGUN MU?' },
    { id: 'q2_typeApprovalMatch', label: '2- TİP ONAY NUMARASI TUTUYOR MU?' },
    { id: 'q3_scopeExpansion', label: '3- TUTMUYORSA KAPSAM GENİŞLETMEYE UYGUN MU?' },
    { id: 'q4_unaffectedPartsDefect', label: '4- TADİLATTAN ETKİLENMEYEN KISIMLARINDA HER HANGİBİR KUSUR VAR MI?' },
  ];


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-4xl mb-4" />
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {/* Optional: Logo */}
            {/* <Image src="/placeholder.svg" alt="Logo" width={100} height={40} /> */}
            <FileSpreadsheet className="text-primary" />
            Seri Tadilat Uygunluk Formu
          </CardTitle>
          <CardDescription>
            Lütfen formu doldurun ve devam edin.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
            </CardDescription>
            {/* Placeholder for Document Info from image - could be static or dynamic */}
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 border p-2 rounded-md mt-2">
                <div>Doküman No: BÖLÜM1.1</div>
                <div>Yayın Tarihi: 01.05.2024</div>
                <div>Revizyon No: 02</div>
                <div>Revizyon Tarihi: 14.01.2025</div>
            </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Top Section: Müşteri Adı, Tarih, Sıra */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                    <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Müşteri Adı</FormLabel>
                            <FormControl>
                            <Input placeholder="Müşteri adı..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="formDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel>Tarih</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "pl-3 text-left font-normal justify-start", // Added justify-start
                                    !field.value && "text-muted-foreground"
                                    )}
                                    disabled={isLoading}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" /> {/* Moved icon left */}
                                    {field.value ? (
                                    format(field.value, "PPP", { locale: tr })
                                    ) : (
                                    <span>Tarih seçin</span>
                                    )}

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
                        name="sequenceNo"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sıra</FormLabel>
                            <FormControl>
                            <Input type="text" placeholder="Sıra no..." {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {/* Second Row: Plaka, Şasi, Şube Adı */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                     <FormItem>
                        <FormLabel>Plaka</FormLabel>
                        <Input value={recordData.plateNumber || 'Plaka Yok'} disabled />
                         <FormDescription>Bu bilgi önceki adımlardan alınmıştır.</FormDescription>
                    </FormItem>
                    <FormItem>
                        <FormLabel>Şasi</FormLabel>
                        <Input value={recordData.chassisNumber || 'Şasi Yok'} disabled />
                         <FormDescription>Bu bilgi önceki adımlardan alınmıştır.</FormDescription>
                    </FormItem>
                    <FormItem>
                        <FormLabel>Şube Adı</FormLabel>
                        <Input value={branch || 'Şube Yok'} disabled />
                         <FormDescription>Bu bilgi şube seçiminden alınmıştır.</FormDescription>
                    </FormItem>
                </div>

                {/* Checklist Section */}
                 <div className="border p-4 rounded-md space-y-4">
                    <div className="grid grid-cols-[1fr_80px_80px] items-center font-medium mb-2"> {/* Fixed width for radio columns */}
                        <span className="col-start-1"></span> {/* Empty cell for alignment */}
                        <span className="text-center px-2">OLUMLU</span>
                        <span className="text-center px-2">OLUMSUZ</span>
                    </div>
                    {checklistItems.map((item) => (
                        <FormField
                            key={item.id}
                            control={form.control}
                            name={item.id as keyof FormData}
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-[1fr_80px_80px] items-center gap-x-2 border-t py-3"> {/* Adjusted gap and padding */}
                                     {/* Use block and self-center to align label with checkboxes */}
                                     <FormLabel className="col-start-1 block self-center">{item.label}</FormLabel>
                                     <FormControl className="col-start-2 justify-self-center">
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex justify-center"
                                            disabled={isLoading}
                                        >
                                            <RadioGroupItem value="olumlu" id={`${item.id}-olumlu`} />
                                        </RadioGroup>
                                    </FormControl>
                                     <FormControl className="col-start-3 justify-self-center">
                                         <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex justify-center"
                                            disabled={isLoading}
                                        >
                                            <RadioGroupItem value="olumsuz" id={`${item.id}-olumsuz`} />
                                        </RadioGroup>
                                    </FormControl>
                                    {/* Message can span if needed, but might not be necessary per item */}
                                     <FormMessage className="col-span-3 col-start-1 mt-1" />
                                </FormItem>
                            )}
                        />
                    ))}
                 </div>


                {/* Notes Section */}
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Not</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Ek notlarınızı buraya yazın..."
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
                    {/* Kontrol Eden */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-center">KONTROL EDEN</h4>
                         <FormField
                            control={form.control}
                            name="controllerName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adı-Soyadı:</FormLabel>
                                <FormControl>
                                <Input placeholder="Kontrol eden adı..." {...field} disabled={isLoading} />
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

                    {/* Merkez/Şube Yetkilisi */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-center">MERKEZ/ŞUBE YETKİLİSİ</h4>
                        <FormField
                            control={form.control}
                            name="authorityName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adı-Soyadı:</FormLabel>
                                <FormControl>
                                <Input placeholder="Yetkili adı..." {...field} disabled={isLoading} />
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
                        Devam Et (Teklif Formu)
                    </Button>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
