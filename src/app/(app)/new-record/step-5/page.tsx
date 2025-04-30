
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
<<<<<<< HEAD
import { FileText, Loader2, ChevronRight, Check } from 'lucide-react'; // Adjusted icons
=======
import { CalendarIcon, FileText, Loader2, Save, ChevronRight } from 'lucide-react'; // Adjusted icons
>>>>>>> origin/main

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep5() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
<<<<<<< HEAD
  const [progress] = React.useState(80); // Step 5 of 6 (Adjusted progress)
=======
  const [progress] = React.useState(80); // Step 5 of 6
>>>>>>> origin/main

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main

  const onSubmit = (data: FormData) => {
    setIsLoading(true);

    // Update app state with the latest form data from this step
    // NOTE: We only need to save data specific to *this* form if it's different
    // from previous steps or if there are new fields.
    // In this case, the form seems mostly about checks and repeating info.
    // Let's save the check statuses and potentially the project number.
    updateRecordData({
<<<<<<< HEAD
        // Potentially save project number if editable:
        // projectNo: data.projectNo,
        // Save check statuses (example assuming they are saved)
        // araSonCheck1: data.check1_exposedPart, // Need to decide how to store these checks
        // araSonCheck2: data.check2_isofixSeat,
        // araSonCheck3: data.check3_seatbelts,
        // araSonCheck4: data.check4_windowApproval,
=======
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
>>>>>>> origin/main
    });

    console.log("Submitting Step 5 Data, navigating to Step 6:", data);

    setIsLoading(false);
<<<<<<< HEAD
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

=======
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
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
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
                <Button type="submit"  className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                  Devam Et (Son Kontrol)
                </Button>
              </div>
            </form>
>>>>>>> origin/main
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
