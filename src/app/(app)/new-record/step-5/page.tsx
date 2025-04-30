
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FileText, Loader2, ChevronRight, Check } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state';
import { cn } from '@/lib/utils'; // Import cn only
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

// Schema for the İş Emri Formu (based on the image)
const FormSchema = z.object({
    // Top Section (mostly pre-filled)
    customerName: z.string().optional(), // Müşteri Adı
    plateAndChassis: z.string().optional(), // Plaka&Şasi
    formDate: z.date().optional(), // Tarih (from Step 4)
    branchName: z.string().optional(), // Şube Adı
    projectNo: z.string().optional(), // Proje No (#ERROR! in image)

    // Checklist Items (Assuming simple boolean checks for now)
    check1_exposedPart: z.boolean().optional(), // 1- AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET
    check2_isofixSeat: z.boolean().optional(), // 2- İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET
    check3_seatbelts: z.boolean().optional(), // 3- EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET .
    check4_windowApproval: z.boolean().optional(), // 4- CAMLARIN ONAYLARINI KONTROL ET

    // Controller Info
    controllerNameAndSurname: z.string().optional(), // Adı-Soyadı
    // Signature omitted as it's usually handled separately
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep5() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(80); // Step 5 of 6 (Adjusted progress)

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      // Pre-fill from previous steps
      customerName: recordData.customerName || '',
      plateAndChassis: `${recordData.plateNumber || 'Plaka Yok'} / ${recordData.chassisNumber || 'Şasi Yok'}`,
      formDate: recordData.formDate ? new Date(recordData.formDate) : new Date(),
      branchName: branch || 'Şube Yok',
      projectNo: '', // Default to empty or a placeholder if needed
      // Checklist defaults (assuming they are checked/positive initially)
      check1_exposedPart: true,
      check2_isofixSeat: true,
      check3_seatbelts: true,
      check4_windowApproval: true,
      // Controller info (potentially from Step 4)
      controllerNameAndSurname: recordData.controllerName || '',
    },
  });

    // Derive read-only values for display
    const displayFormDate = recordData.formDate ? format(new Date(recordData.formDate), 'PPP', { locale: tr }) : 'Tarih Yok';

  const onSubmit = (data: FormData) => {
    setIsLoading(true);

    // Update app state with the latest form data from this step
    // NOTE: We only need to save data specific to *this* form if it's different
    // from previous steps or if there are new fields.
    // In this case, the form seems mostly about checks and repeating info.
    // Let's save the check statuses and potentially the project number.
    updateRecordData({
        // Potentially save project number if editable:
        // projectNo: data.projectNo,
        // Save check statuses (example assuming they are saved)
        // araSonCheck1: data.check1_exposedPart, // Need to decide how to store these checks
        // araSonCheck2: data.check2_isofixSeat,
        // araSonCheck3: data.check3_seatbelts,
        // araSonCheck4: data.check4_windowApproval,
    });

    console.log("Submitting Step 5 Data, navigating to Step 6:", data);

    setIsLoading(false);
    router.push('/new-record/step-6'); // Navigate to Step 6 (Teklif Formu)
  };

  const goBack = () => {
    // Save any relevant data if needed before going back
    // updateRecordData({ ... });
    router.push('/new-record/step-4');
  };

  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
      toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
      router.push('/select-branch');
    }
    // Sync form with potentially updated recordData from earlier steps
    form.reset({
      customerName: recordData.customerName || '',
      plateAndChassis: `${recordData.plateNumber || 'Plaka Yok'} / ${recordData.chassisNumber || 'Şasi Yok'}`,
      formDate: recordData.formDate ? new Date(recordData.formDate) : new Date(),
      branchName: branch || 'Şube Yok',
      projectNo: '', // Keep default or update if persisted
      check1_exposedPart: true, // Reapply defaults or use persisted state if available
      check2_isofixSeat: true,
      check3_seatbelts: true,
      check4_windowApproval: true,
      controllerNameAndSurname: recordData.controllerName || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData]);


  if (!branch || !recordData.chassisNumber) {
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  // Checklist questions from the image
   const checklistItems = [
    { id: 'check1_exposedPart', label: '1- AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET' },
    { id: 'check2_isofixSeat', label: '2- İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET' },
    { id: 'check3_seatbelts', label: '3- EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET .' },
    { id: 'check4_windowApproval', label: '4- CAMLARIN ONAYLARINI KONTROL ET' },
  ];


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-4xl mb-4" />
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
           {/* Header mimicking the image */}
           <div className="flex justify-between items-start mb-4">
               {/* Left Side: Logo Placeholder */}
                <div className="w-24 h-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    {/* Optional: <Image src="/logo.png" alt="Logo" width={96} height={48} /> */}
                    LOGO
                </div>

                {/* Center: Title */}
                <CardTitle className="text-2xl font-bold text-center flex-1">
                    ARA VE SON KONTROL FORMU
                </CardTitle>

                 {/* Right Side: Document Info Box */}
                 <div className="text-xs border p-2 rounded-md space-y-1 w-40">
                    <div className="flex justify-between"><span className="font-medium">Doküman No:</span> BÖLÜM4.1</div>
                    <div className="flex justify-between"><span className="font-medium">Yayın Tarihi:</span> 01.05.2024</div>
                    <div className="flex justify-between"><span className="font-medium">Revizyon No:</span> 02</div>
                    <div className="flex justify-between"><span className="font-medium">Revizyon Tarihi:</span> 14.01.2025</div>
                    <FormField
                      control={form.control}
                      name="projectNo"
                      render={({ field }) => (
                        <FormItem className="flex justify-between">
                          <FormLabel className="font-medium">Proje No:</FormLabel>
                           {/* Display #ERROR! as per image, make it an input if needed */}
                          <span className='text-red-600 font-bold'>#ERROR!</span>
                          {/* <FormControl>
                            <Input className="h-5 text-xs p-1 w-16" placeholder="#ERROR!" {...field} disabled={isLoading} />
                          </FormControl> */}
                        </FormItem>
                      )}
                    />
                </div>
           </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            {/* Using a simple div structure for layout instead of form submission here */}
            <div className="space-y-6">

                {/* Top Section: Müşteri Adı, Tarih, Şube */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 border p-4 rounded-md">
                     <div className="flex items-center">
                        <span className="font-medium w-28 shrink-0">Müşteri Adı</span>
                        <span className="mx-2">:</span>
                        <Input value={recordData.customerName || ''} disabled className="bg-muted/50" />
                    </div>
                    <div className="flex items-center">
                         <span className="font-medium w-28 shrink-0">Tarih</span>
                         <span className="mx-2">:</span>
                         <Input value={displayFormDate} disabled className="bg-muted/50" />
                    </div>
                    <div className="flex items-center">
                        {/* Project No already in the top right box */}
                    </div>
                     <div className="flex items-center col-span-1 md:col-span-2">
                         <span className="font-medium w-28 shrink-0">Plaka&Şasi</span>
                         <span className="mx-2">:</span>
                         <Input value={`${recordData.plateNumber || 'Plaka Yok'} / ${recordData.chassisNumber || 'Şasi Yok'}`} disabled className="bg-muted/50"/>
                    </div>
                     <div className="flex items-center">
                         <span className="font-medium w-28 shrink-0">Şube Adı</span>
                         <span className="mx-2">:</span>
                         <Input value={branch || ''} disabled className="bg-muted/50" />
                    </div>
                </div>

                {/* Checklist Table Section */}
                 <div className="border p-4 rounded-md space-y-4 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">Kontrol Edilecek Hususlar</TableHead>
                                <TableHead className="text-center">ARA OLUMLU</TableHead>
                                <TableHead className="text-center">SON OLUMLU</TableHead>
                                <TableHead className="text-center">ARA OLUMSUZ</TableHead>
                                <TableHead className="text-center">SON OLUMSUZ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {checklistItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.label}</TableCell>
                                 {/* Assuming ARA OLUMLU is checked by default */}
                                <TableCell className="text-center">
                                     {/* Placeholder for Checkbox - For visual mimicry */}
                                     <div className="flex justify-center">
                                         <Check className="h-5 w-5 text-green-600" />
                                     </div>
                                     {/* Example using real checkbox if needed */}
                                    {/* <FormField
                                        control={form.control}
                                        name={`${item.id}_ara_olumlu` as keyof FormData} // Adjust name as needed
                                        render={({ field }) => (
                                            <FormItem className="flex justify-center">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            </FormItem>
                                        )}
                                    /> */}
                                </TableCell>
                                {/* Assuming SON OLUMLU is checked by default */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                </TableCell>
                                {/* ARA OLUMSUZ - Empty */}
                                <TableCell className="text-center"></TableCell>
                                {/* SON OLUMSUZ - Empty */}
                                <TableCell className="text-center"></TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>

                {/* Controller Section */}
                 <div className="flex justify-end">
                    <div className="border p-4 rounded-md w-full md:w-1/2 lg:w-1/3 space-y-2">
                        <h4 className="font-medium text-center">KONTROL EDEN</h4>
                        <FormField
                            control={form.control}
                            name="controllerNameAndSurname"
                            render={({ field }) => (
                            <FormItem className="flex items-center">
                                <FormLabel className="w-20 shrink-0">Adı-Soyadı:</FormLabel>
                                {/* Pre-fill from Step 4 if available */}
                                <FormControl>
                                    <Input {...field} disabled className="bg-muted/50"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormItem className="flex items-center">
                            <FormLabel className="w-20 shrink-0">İmza:</FormLabel>
                            <div className="h-10 border-b flex-1"></div> {/* Placeholder for signature line */}
                        </FormItem>
                    </div>
                 </div>


                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                        Geri
                    </Button>
                    {/* Changed to call onSubmit, which now navigates */}
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                         Devam Et (Teklif Formu)
                    </Button>
                </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
