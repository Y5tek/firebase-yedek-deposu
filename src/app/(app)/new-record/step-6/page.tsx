
'use client';

import * as React from 'react';
import Image from 'next/image'; // Keep Image import if needed for logo
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon, FileCheck2, Loader2, Save, ChevronRight } from 'lucide-react'; // Adjusted icons

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAppState, RecordData } from '@/hooks/use-app-state';
import { cn, getSerializableFileInfo } from '@/lib/utils';

const FormSchema = z.object({
  finalCheckDate: z.date().optional(),
  check1_exposedParts_ara: z.boolean().default(true).optional(),
  check1_exposedParts_son: z.boolean().default(true).optional(),
  check2_isofixSeat_ara: z.boolean().default(true).optional(),
  check2_isofixSeat_son: z.boolean().default(true).optional(),
  check3_seatBelts_ara: z.boolean().default(true).optional(),
  check3_seatBelts_son: z.boolean().default(true).optional(),
  check4_windowApprovals_ara: z.boolean().default(true).optional(),
  check4_windowApprovals_son: z.boolean().default(true).optional(),
  finalControllerName: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep6() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(86); // Step 6 of 7

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
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
    },
  });

  const checklistItems = [
    { idBase: 'check1_exposedParts', label: '1- AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET' },
    { idBase: 'check2_isofixSeat', label: '2- İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET' },
    { idBase: 'check3_seatBelts', label: '3- EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET' },
    { idBase: 'check4_windowApprovals', label: '4- CAMLARIN ONAYLARINI KONTROL ET' },
  ];

  const onSubmit = (data: FormData) => {
    setIsLoading(true);

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

    console.log("Submitting Step 6 Data, navigating to Step 7:", data);

    setIsLoading(false);
    router.push('/new-record/step-7'); // Navigate to the new final summary step
  };

  const goBack = () => {
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
             {/* Left Side: Logo Placeholder - Removed for cleaner look */}
             <div className="w-24 h-12"></div>
            <CardTitle className="text-2xl font-bold text-center flex-1">
              ARA VE SON KONTROL FORMU
            </CardTitle>
            <div className="text-xs border p-2 rounded-md space-y-1 w-40">
              <div className="flex justify-between"><span className="font-medium">Doküman No:</span> BÖLÜM4.1</div>
              <div className="flex justify-between"><span className="font-medium">Yayın Tarihi:</span> 01.05.2024</div>
              <div className="flex justify-between"><span className="font-medium">Revizyon No:</span> 02</div>
              <div className="flex justify-between"><span className="font-medium">Revizyon Tarihi:</span> 14.01.2025</div>
            </div>
          </div>
          <CardDescription>
            Lütfen son kontrol formunu doldurun ve devam edin.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Top Info Boxes */}
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

                <FormItem>
                  <FormLabel>Proje No</FormLabel>
                  <Input value={recordData.projectName || 'N/A'} disabled /> {/* Assuming projectName holds Proje No */}
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

                {/* Checklist Section */}
                <div className="border p-4 rounded-md space-y-4">
                    <div className="grid grid-cols-[1fr_80px_80px] items-center font-medium mb-2">
                        <span className="font-semibold">Kontrol Edilecek Hususlar</span>
                        <span className="text-center px-2 font-semibold">ARA</span>
                        <span className="text-center px-2 font-semibold">SON</span>
                    </div>
                    {checklistItems.map((item) => (
                        <div key={item.idBase} className="grid grid-cols-[1fr_80px_80px] items-center gap-x-2 py-3 border-t">
                            <FormLabel className="col-start-1 block self-center text-sm">{item.label}</FormLabel>
                            {/* ARA Checkbox */}
                            <div className="flex items-center justify-center space-x-1">
                                <FormLabel htmlFor={`${item.idBase}_ara_olumlu`} className="text-xs">Oluumlu</FormLabel>
                                <FormField
                                    control={form.control}
                                    name={`${item.idBase}_ara` as keyof FormData}
                                    render={({ field }) => (
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === true} // Explicitly check for true
                                                onCheckedChange={(checked) => field.onChange(checked === true)} // Set true/false
                                                id={`${item.idBase}_ara_olumlu`}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    )}
                                />
                                {/* Add Olumsuz checkbox if needed, currently assuming olumlu */}
                            </div>
                             {/* SON Checkbox */}
                             <div className="flex items-center justify-center space-x-1">
                                <FormLabel htmlFor={`${item.idBase}_son_olumlu`} className="text-xs">Oluumlu</FormLabel>
                                <FormField
                                    control={form.control}
                                    name={`${item.idBase}_son` as keyof FormData}
                                    render={({ field }) => (
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === true} // Explicitly check for true
                                                onCheckedChange={(checked) => field.onChange(checked === true)} // Set true/false
                                                id={`${item.idBase}_son_olumlu`}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    )}
                                />
                                {/* Add Olumsuz checkbox if needed */}
                            </div>
                        </div>
                    ))}
                </div>


              {/* Approval Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                {/* Empty div for spacing */}
                <div></div>
                {/* Kontrol Eden */}
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
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                  Devam Et (Özet)
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
