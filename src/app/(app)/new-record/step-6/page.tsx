
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, Loader2, Save, FileCheck2 } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Import RecordData
import { cn, getSerializableFileInfo } from '@/lib/utils'; // Import cn and getSerializableFileInfo


// Schema for the Ara ve Son Kontrol Formu
const FormSchema = z.object({
    // Customer Name, Plate&Chassis, Branch Name will be pulled from state
    finalCheckDate: z.date().optional(), // Tarih
    // Project No is missing in the image, can be added if needed
    check1_exposedParts_ara: z.boolean().default(true).optional(), // AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET - ARA
    check1_exposedParts_son: z.boolean().default(true).optional(), // AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET - SON
    check2_isofixSeat_ara: z.boolean().default(true).optional(), // İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET - ARA
    check2_isofixSeat_son: z.boolean().default(true).optional(), // İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET - SON
    check3_seatBelts_ara: z.boolean().default(true).optional(), // EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET - ARA
    check3_seatBelts_son: z.boolean().default(true).optional(), // EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET - SON
    check4_windowApprovals_ara: z.boolean().default(true).optional(), // CAMLARIN ONAYLARINI KONTROL ET - ARA
    check4_windowApprovals_son: z.boolean().default(true).optional(), // CAMLARIN ONAYLARINI KONTROL ET - SON
    finalControllerName: z.string().optional(), // KONTROL EDEN Adı-Soyadı
    // Signature is usually handled differently, omitting direct field
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep6() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(100); // Step 6 of 6

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      finalCheckDate: recordData.finalCheckDate ? new Date(recordData.finalCheckDate) : new Date(), // Default to today
      check1_exposedParts_ara: recordData.check1_exposedParts_ara ?? true,
      check1_exposedParts_son: recordData.check1_exposedParts_son ?? true,
      check2_isofixSeat_ara: recordData.check2_isofixSeat_ara ?? true,
      check2_isofixSeat_son: recordData.check2_isofixSeat_son ?? true,
      check3_seatBelts_ara: recordData.check3_seatBelts_ara ?? true,
      check3_seatBelts_son: recordData.check3_seatBelts_son ?? true,
      check4_windowApprovals_ara: recordData.check4_windowApprovals_ara ?? true,
      check4_windowApprovals_son: recordData.check4_windowApprovals_son ?? true,
      finalControllerName: recordData.finalControllerName || '',
    },
  });

   // Checklist items definition
    const checklistItems = [
        { idBase: 'check1_exposedParts', label: '1- AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET' },
        { idBase: 'check2_isofixSeat', label: '2- İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET' },
        { idBase: 'check3_seatBelts', label: '3- EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET' },
        { idBase: 'check4_windowApprovals', label: '4- CAMLARIN ONAYLARINI KONTROL ET' },
    ];


  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate saving

    // Update app state with the final check form data
    updateRecordData({
        finalCheckDate: data.finalCheckDate?.toISOString(),
        check1_exposedParts_ara: data.check1_exposedParts_ara,
        check1_exposedParts_son: data.check1_exposedParts_son,
        check2_isofixSeat_ara: data.check2_isofixSeat_ara,
        check2_isofixSeat_son: data.check2_isofixSeat_son,
        check3_seatBelts_ara: data.check3_seatBelts_ara,
        check3_seatBelts_son: data.check3_seatBelts_son,
        check4_windowApprovals_ara: data.check4_windowApprovals_ara,
        check4_windowApprovals_son: data.check4_windowApprovals_son,
        finalControllerName: data.finalControllerName,
    });

    // Use getState() to access the latest state after update
    const finalRecordData = useAppState.getState().recordData;

    // Create the final archive entry including all data
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
        plateNumber: finalRecordData.plateNumber,
        registrationDocument: getSerializableFileInfo(finalRecordData.registrationDocument),
        labelDocument: getSerializableFileInfo(finalRecordData.labelDocument),
        additionalPhotos: finalRecordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
        additionalVideos: finalRecordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
        // --- Data from Step 4 Form ---
        customerName: finalRecordData.customerName,
        formDate: finalRecordData.formDate,
        sequenceNo: finalRecordData.sequenceNo,
        q1_suitable: finalRecordData.q1_suitable,
        q2_typeApprovalMatch: finalRecordData.q2_typeApprovalMatch,
        q3_scopeExpansion: finalRecordData.q3_scopeExpansion,
        q4_unaffectedPartsDefect: finalRecordData.q4_unaffectedPartsDefect,
        notes: finalRecordData.notes, // Note from Step 4/5
        controllerName: finalRecordData.controllerName, // From Step 4
        authorityName: finalRecordData.authorityName, // From Step 4
        // --- Data from Step 5 Form ---
        projectName: finalRecordData.projectName,
        workOrderNumber: finalRecordData.workOrderNumber,
        workOrderDate: finalRecordData.workOrderDate,
        completionDate: finalRecordData.completionDate,
        detailsOfWork: finalRecordData.detailsOfWork,
        sparePartsUsed: finalRecordData.sparePartsUsed,
        pricing: finalRecordData.pricing,
        vehicleAcceptanceSignature: finalRecordData.vehicleAcceptanceSignature,
        customerSignature: finalRecordData.customerSignature,
        // --- Data from this Step 6 Form ---
        finalCheckDate: data.finalCheckDate?.toISOString(),
        check1_exposedParts_ara: data.check1_exposedParts_ara,
        check1_exposedParts_son: data.check1_exposedParts_son,
        check2_isofixSeat_ara: data.check2_isofixSeat_ara,
        check2_isofixSeat_son: data.check2_isofixSeat_son,
        check3_seatBelts_ara: data.check3_seatBelts_ara,
        check3_seatBelts_son: data.check3_seatBelts_son,
        check4_windowApprovals_ara: data.check4_windowApprovals_ara,
        check4_windowApprovals_son: data.check4_windowApprovals_son,
        finalControllerName: data.finalControllerName,
        // --- Metadata ---
        archivedAt: new Date().toISOString(),
        fileName: `${branch}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}`
    };

    console.log("Archiving final entry:", archiveEntry);

    const currentArchive = finalRecordData.archive || [];
    updateRecordData({ archive: [...currentArchive, archiveEntry] });

    setIsLoading(false);
    toast({
      title: 'Kayıt Tamamlandı',
      description: 'Son kontrol formu başarıyla kaydedildi ve tüm kayıt arşivlendi.',
    });
    updateRecordData({}, true); // Reset record data (keeping archive)
    router.push('/archive');
  };

  const goBack = () => {
    // Save current data before going back
    updateRecordData({
        finalCheckDate: form.getValues('finalCheckDate')?.toISOString(),
        check1_exposedParts_ara: form.getValues('check1_exposedParts_ara'),
        check1_exposedParts_son: form.getValues('check1_exposedParts_son'),
        check2_isofixSeat_ara: form.getValues('check2_isofixSeat_ara'),
        check2_isofixSeat_son: form.getValues('check2_isofixSeat_son'),
        check3_seatBelts_ara: form.getValues('check3_seatBelts_ara'),
        check3_seatBelts_son: form.getValues('check3_seatBelts_son'),
        check4_windowApprovals_ara: form.getValues('check4_windowApprovals_ara'),
        check4_windowApprovals_son: form.getValues('check4_windowApprovals_son'),
        finalControllerName: form.getValues('finalControllerName'),
    });
    router.push('/new-record/step-5');
  };

   React.useEffect(() => {
        if (!branch || !recordData.chassisNumber) {
            toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
            router.push('/select-branch');
        }
        // Sync form with persisted data and apply defaults
        form.reset({
            finalCheckDate: recordData.finalCheckDate ? new Date(recordData.finalCheckDate) : new Date(),
            check1_exposedParts_ara: recordData.check1_exposedParts_ara ?? true,
            check1_exposedParts_son: recordData.check1_exposedParts_son ?? true,
            check2_isofixSeat_ara: recordData.check2_isofixSeat_ara ?? true,
            check2_isofixSeat_son: recordData.check2_isofixSeat_son ?? true,
            check3_seatBelts_ara: recordData.check3_seatBelts_ara ?? true,
            check3_seatBelts_son: recordData.check3_seatBelts_son ?? true,
            check4_windowApprovals_ara: recordData.check4_windowApprovals_ara ?? true,
            check4_windowApprovals_son: recordData.check4_windowApprovals_son ?? true,
            finalControllerName: recordData.finalControllerName || '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch, recordData]);

  if (!branch || !recordData.chassisNumber) {
        return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
    }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-4xl mb-4" />
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
           <div className="flex justify-between items-start mb-4">
              <CardTitle className="text-2xl font-bold text-center flex-1 ml-40"> {/* Added ml-40 for centering */}
                 ARA VE SON KONTROL FORMU
              </CardTitle>
               {/* Right Side: Document Info Box */}
               <div className="text-xs border p-2 rounded-md space-y-1 w-40">
                  <div className="flex justify-between"><span className="font-medium">Doküman No:</span> BÖLÜM4.1</div>
                  <div className="flex justify-between"><span className="font-medium">Yayın Tarihi:</span> 01.05.2024</div>
                  <div className="flex justify-between"><span className="font-medium">Revizyon No:</span> 02</div>
                  <div className="flex justify-between"><span className="font-medium">Revizyon Tarihi:</span> 14.01.2025</div>
              </div>
           </div>
            <CardDescription>
            Lütfen son kontrol formunu doldurun ve kaydı tamamlayın.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Top Section: Müşteri Adı, Tarih, Proje No (Missing), Plaka&Şasi, Şube Adı */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                  <FormItem>
                        <FormLabel>Müşteri Adı</FormLabel>
                        <Input value={recordData.customerName || 'N/A'} disabled />
                        <FormDescription>Seri Tadilat Formundan</FormDescription>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="finalCheckDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                          <FormLabel>Tarih</FormLabel>
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
                   {/* Project No - Add if needed */}
                   <FormItem>
                      <FormLabel>Proje No</FormLabel>
                      <Input value={recordData.projectName || 'N/A'} disabled />
                       <FormDescription>İş Emri Formundan</FormDescription>
                   </FormItem>
                    <FormItem>
                        <FormLabel>Plaka & Şasi</FormLabel>
                        <Input value={`${recordData.plateNumber || 'Plaka Yok'} / ${recordData.chassisNumber || 'Şasi Yok'}`} disabled />
                        <FormDescription>Önceki adımlardan</FormDescription>
                    </FormItem>
                   <FormItem>
                        <FormLabel>Şube Adı</FormLabel>
                        <Input value={branch || 'Şube Yok'} disabled />
                         <FormDescription>Şube Seçiminden</FormDescription>
                    </FormItem>
              </div>

               {/* Checklist Table Section */}
               <div className="border p-4 rounded-md space-y-1">
                  {/* Header Row */}
                  <div className="grid grid-cols-[1fr_80px_80px_80px_80px] items-center font-medium mb-2 border-b pb-2">
                      <span className="col-start-1"></span> {/* Empty cell for alignment */}
                      <span className="text-center font-semibold col-span-2">ARA</span>
                      <span className="text-center font-semibold col-span-2">SON</span>
                   </div>
                   <div className="grid grid-cols-[1fr_80px_80px_80px_80px] items-center font-medium mb-2 border-b pb-2">
                      <span className="col-start-1"></span> {/* Empty cell for alignment */}
                      <span className="text-center text-sm">OLUMLU</span>
                      <span className="text-center text-sm">OLUMSUZ</span> {/* Not in image, added for symmetry if needed, otherwise remove */}
                      <span className="text-center text-sm">OLUMLU</span>
                      <span className="text-center text-sm">OLUMSUZ</span> {/* Not in image */}
                   </div>

                  {/* Checklist Items */}
                    {checklistItems.map((item) => (
                        <div key={item.idBase} className="grid grid-cols-[1fr_80px_80px_80px_80px] items-center gap-x-2 py-2 border-b last:border-b-0">
                             <FormLabel className="col-start-1 block self-center text-sm">{item.label}</FormLabel>

                            {/* ARA OLUMLU Checkbox */}
                            <FormField
                                control={form.control}
                                name={`${item.idBase}_ara` as keyof FormData} // Cast needed as we construct the name
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-center col-start-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                id={`${item.idBase}_ara`}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                             />
                            {/* ARA OLUMSUZ (Placeholder/Remove if not needed) */}
                            <div className="col-start-3 flex justify-center"> {/* Empty or placeholder checkbox */}
                                {/* <Checkbox disabled /> */}
                            </div>

                             {/* SON OLUMLU Checkbox */}
                             <FormField
                                control={form.control}
                                name={`${item.idBase}_son` as keyof FormData} // Cast needed as we construct the name
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-center col-start-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                id={`${item.idBase}_son`}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                             />
                            {/* SON OLUMSUZ (Placeholder/Remove if not needed) */}
                            <div className="col-start-5 flex justify-center"> {/* Empty or placeholder checkbox */}
                                {/* <Checkbox disabled /> */}
                            </div>

                             {/* FormMessage spanning across the checkbox columns if needed */}
                             <FormMessage className="col-span-4 col-start-2 mt-1 text-xs" />
                        </div>
                    ))}
                </div>

               {/* Controller Section */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                  {/* Empty column for spacing if needed */}
                  <div></div>

                  {/* Kontrol Eden Section */}
                   <div className="space-y-2">
                        <h4 className="font-medium text-center">KONTROL EDEN</h4>
                         <FormField
                            control={form.control}
                            name="finalControllerName"
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
