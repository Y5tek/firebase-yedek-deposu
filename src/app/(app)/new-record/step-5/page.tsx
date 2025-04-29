
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
    offerAuthorizedName: z.string().optional(),
    offerCompanyName: z.string().optional(),
    offerCompanyAddress: z.string().optional(),
    offerTaxOfficeAndNumber: z.string().optional(),
    offerPhoneNumber: z.string().optional(),
    offerEmailAddress: z.string().email({ message: "Geçerli bir e-posta adresi girin." }).optional().or(z.literal('')), // Allow empty string
    offerDate: z.date().optional(),
    offerItems: z.array(OfferItemSchema).min(1, "En az bir teklif kalemi eklemelisiniz."), // Ensure at least one item
    offerAcceptance: z.enum(['accepted', 'rejected']).optional(),
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
      offerAuthorizedName: recordData.offerAuthorizedName || '',
      offerCompanyName: recordData.offerCompanyName || 'ÖZ ÇAĞRI DİZAYN OTO MÜHENDİSLİK', // Prefill
      offerCompanyAddress: recordData.offerCompanyAddress || '',
      offerTaxOfficeAndNumber: recordData.offerTaxOfficeAndNumber || 'TEPECİK / 662 081 45 97', // Prefill
      offerPhoneNumber: recordData.offerPhoneNumber || '',
      offerEmailAddress: recordData.offerEmailAddress || '',
      offerDate: recordData.offerDate ? new Date(recordData.offerDate) : new Date(),
      offerItems: recordData.offerItems?.length ? recordData.offerItems : [{ id: Math.random().toString(36).substring(2, 15), itemName: '', quantity: undefined, unitPrice: undefined, totalPrice: undefined }], // Default to one item
      offerAcceptance: recordData.offerAcceptance ?? 'accepted', // Default to accepted
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "offerItems",
  });

  // Watch offerItems to recalculate totals
   const watchedItems = form.watch("offerItems");

   React.useEffect(() => {
     watchedItems.forEach((item, index) => {
       const quantity = item.quantity;
       const unitPrice = item.unitPrice;
       const currentTotal = item.totalPrice;
       const calculatedTotal = (quantity && unitPrice) ? quantity * unitPrice : undefined;

       // Update total only if it differs to avoid infinite loops
       if (calculatedTotal !== currentTotal) {
          form.setValue(`offerItems.${index}.totalPrice`, calculatedTotal, { shouldValidate: false, shouldDirty: true }); // Don't revalidate on calculation
       }
     });
   }, [watchedItems, form]);


  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate saving

    // Update app state with the latest form data
    updateRecordData({
        offerAuthorizedName: data.offerAuthorizedName,
        offerCompanyName: data.offerCompanyName,
        offerCompanyAddress: data.offerCompanyAddress,
        offerTaxOfficeAndNumber: data.offerTaxOfficeAndNumber,
        offerPhoneNumber: data.offerPhoneNumber,
        offerEmailAddress: data.offerEmailAddress,
        offerDate: data.offerDate?.toISOString(), // Store date as ISO string
        offerItems: data.offerItems,
        offerAcceptance: data.offerAcceptance,
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
        plateNumber: finalRecordData.plateNumber,
        // --- Data from Step 4 Form ---
        customerName: finalRecordData.customerName,
        formDate: finalRecordData.formDate, // Step 4 date
        sequenceNo: finalRecordData.sequenceNo,
        q1_suitable: finalRecordData.q1_suitable,
        q2_typeApprovalMatch: finalRecordData.q2_typeApprovalMatch,
        q3_scopeExpansion: finalRecordData.q3_scopeExpansion,
        q4_unaffectedPartsDefect: finalRecordData.q4_unaffectedPartsDefect,
        notes: finalRecordData.notes, // Step 4 notes
        controllerName: finalRecordData.controllerName,
        authorityName: finalRecordData.authorityName,
        // --- Data from this step (Step 5 Form) ---
        offerAuthorizedName: data.offerAuthorizedName,
        offerCompanyName: data.offerCompanyName,
        offerCompanyAddress: data.offerCompanyAddress,
        offerTaxOfficeAndNumber: data.offerTaxOfficeAndNumber,
        offerPhoneNumber: data.offerPhoneNumber,
        offerEmailAddress: data.offerEmailAddress,
        offerDate: data.offerDate?.toISOString(), // Step 5 date
        offerItems: data.offerItems,
        offerAcceptance: data.offerAcceptance,
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
      description: 'Teklif formu başarıyla kaydedildi ve tüm kayıt arşivlendi.',
    });
    updateRecordData({}, true); // Reset record data (keeping archive)
    router.push('/archive');
  };

  const goBack = () => {
    // Save current data before going back
    updateRecordData({
        offerAuthorizedName: form.getValues('offerAuthorizedName'),
        offerCompanyName: form.getValues('offerCompanyName'),
        offerCompanyAddress: form.getValues('offerCompanyAddress'),
        offerTaxOfficeAndNumber: form.getValues('offerTaxOfficeAndNumber'),
        offerPhoneNumber: form.getValues('offerPhoneNumber'),
        offerEmailAddress: form.getValues('offerEmailAddress'),
        offerDate: form.getValues('offerDate')?.toISOString(),
        offerItems: form.getValues('offerItems'),
        offerAcceptance: form.getValues('offerAcceptance'),
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
      offerAuthorizedName: recordData.offerAuthorizedName || '',
      offerCompanyName: recordData.offerCompanyName || 'ÖZ ÇAĞRI DİZAYN OTO MÜHENDİSLİK', // Prefill
      offerCompanyAddress: recordData.offerCompanyAddress || '',
      offerTaxOfficeAndNumber: recordData.offerTaxOfficeAndNumber || 'TEPECİK / 662 081 45 97', // Prefill
      offerPhoneNumber: recordData.offerPhoneNumber || '',
      offerEmailAddress: recordData.offerEmailAddress || '',
      offerDate: recordData.offerDate ? new Date(recordData.offerDate) : new Date(),
      offerItems: recordData.offerItems?.length ? recordData.offerItems : [{ id: Math.random().toString(36).substring(2, 15), itemName: '', quantity: undefined, unitPrice: undefined, totalPrice: undefined }], // Default to one item
      offerAcceptance: recordData.offerAcceptance ?? 'accepted', // Default to accepted
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData]); // removed router from deps


  if (!branch || !recordData.chassisNumber) {
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  // Calculate overall total for the offer footer
   const overallTotal = watchedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-5xl mb-4" />
      <Card className="w-full max-w-5xl shadow-lg">
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
                     Teklif Formu
                 </CardTitle>

                 {/* Right Side: Document Info Box */}
                 <div className="text-xs border p-2 rounded-md space-y-1 w-40">
                    <div className="flex justify-between"><span className="font-medium">Doküman No:</span> BÖLÜM1.2</div>
                    <div className="flex justify-between"><span className="font-medium">Yayın Tarihi:</span> 01.05.2024</div>
                    <div className="flex justify-between"><span className="font-medium">Revizyon No:</span> 02</div>
                    <div className="flex justify-between"><span className="font-medium">Revizyon Tarihi:</span> 14.01.2025</div>
                </div>
           </div>
           <CardDescription>
            Lütfen teklif formunu doldurun ve kaydedin. Bu son adımdır.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Top Section: Authorized Person Info */}
                <div className="border p-4 rounded-md space-y-4">
                    <h3 className="font-semibold text-lg mb-2">Teklif Vermeye Yetkili Kişinin;</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* Left Column */}
                         <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="offerAuthorizedName"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                    <FormLabel className="w-40 shrink-0">Adı ve Soyadı</FormLabel>
                                    <span className="mx-2">:</span>
                                    <FormControl className="flex-1">
                                    <Input placeholder="#N/A" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                             />
                             <FormField
                                control={form.control}
                                name="offerCompanyName"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                     <FormLabel className="w-40 shrink-0">Firma Adı</FormLabel>
                                     <span className="mx-2">:</span>
                                     <FormControl className="flex-1">
                                     <Input placeholder="Firma adı..." {...field} disabled={isLoading} />
                                     </FormControl>
                                     <FormMessage />
                                </FormItem>
                                )}
                             />
                              <FormField
                                control={form.control}
                                name="offerCompanyAddress"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                     <FormLabel className="w-40 shrink-0">Açık Adresi</FormLabel>
                                     <span className="mx-2">:</span>
                                     <FormControl className="flex-1">
                                     <Input placeholder="#N/A" {...field} disabled={isLoading} />
                                     </FormControl>
                                     <FormMessage />
                                </FormItem>
                                )}
                             />
                         </div>
                          {/* Right Column */}
                         <div className="space-y-4">
                             <FormField
                                control={form.control}
                                name="offerTaxOfficeAndNumber"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                     <FormLabel className="w-40 shrink-0">Vergi Dairesi ve Vergi Numarası</FormLabel>
                                     <span className="mx-2">:</span>
                                     <FormControl className="flex-1">
                                     <Input placeholder="Vergi d./no..." {...field} disabled={isLoading} />
                                     </FormControl>
                                     <FormMessage />
                                </FormItem>
                                )}
                             />
                             <FormField
                                control={form.control}
                                name="offerPhoneNumber"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                     <FormLabel className="w-40 shrink-0">Telefon Numarası</FormLabel>
                                     <span className="mx-2">:</span>
                                     <FormControl className="flex-1">
                                     <Input type="tel" placeholder="Telefon no..." {...field} disabled={isLoading} />
                                     </FormControl>
                                     <FormMessage />
                                </FormItem>
                                )}
                             />
                              <FormField
                                control={form.control}
                                name="offerEmailAddress"
                                render={({ field }) => (
                                <FormItem className="flex items-center">
                                     <FormLabel className="w-40 shrink-0">Elektronik Posta Adresi</FormLabel>
                                     <span className="mx-2">:</span>
                                     <FormControl className="flex-1">
                                     <Input type="email" placeholder="E-posta adresi..." {...field} disabled={isLoading} />
                                     </FormControl>
                                     <FormMessage />
                                </FormItem>
                                )}
                             />
                         </div>
                    </div>
                    {/* Offer Date - Placed separately like in the image */}
                    <div className="flex justify-end mt-4">
                        <FormField
                            control={form.control}
                            name="offerDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col items-end">
                                <FormLabel className="mb-1 text-xs font-semibold mr-1">TARİH</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-[200px] pl-3 text-left font-normal", // Fixed width
                                        !field.value && "text-muted-foreground"
                                        )}
                                        disabled={isLoading}
                                    >
                                        {field.value ? (
                                        format(field.value, "dd.MM.yyyy") // Format like image
                                        ) : (
                                        <span>Tarih seçin</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
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
                </div>

                 {/* Items Table Section */}
                 <div className="border p-4 rounded-md space-y-4">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">Sıra No</TableHead>
                                <TableHead>Mal ve Malzemenin Adı</TableHead>
                                <TableHead className="w-[100px]">Miktarı</TableHead>
                                <TableHead className="w-[150px]">Birim Fiyatı (TL)</TableHead>
                                <TableHead className="w-[150px]">Toplam (TL)</TableHead>
                                <TableHead className="w-[50px]"></TableHead> {/* Action column */}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`offerItems.${index}.itemName`}
                                        render={({ field }) => (
                                            <Input placeholder="Malzeme adı..." {...field} disabled={isLoading} />
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                     <FormField
                                        control={form.control}
                                        name={`offerItems.${index}.quantity`}
                                        render={({ field }) => (
                                             <Input
                                                 type="number"
                                                 placeholder="Miktar"
                                                 {...field}
                                                 onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} // Handle empty string
                                                 value={field.value ?? ''} // Handle null value
                                                 disabled={isLoading}
                                                 className="text-right"
                                                 min="0"
                                             />
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`offerItems.${index}.unitPrice`}
                                        render={({ field }) => (
                                             <Input
                                                type="number"
                                                placeholder="Birim Fiyat"
                                                {...field}
                                                 onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                                 value={field.value ?? ''}
                                                disabled={isLoading}
                                                className="text-right"
                                                step="0.01"
                                                min="0"
                                             />
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                     {/* Controlled Input for Total Price */}
                                    <Controller
                                        control={form.control}
                                        name={`offerItems.${index}.totalPrice`}
                                        render={({ field }) => (
                                            <Input
                                                type="number"
                                                placeholder="Toplam"
                                                {...field}
                                                value={field.value ?? ''}
                                                disabled // Total is calculated
                                                className="text-right bg-muted/50"
                                                readOnly
                                            />
                                        )}
                                     />
                                </TableCell>
                                <TableCell>
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={() => fields.length > 1 ? remove(index) : toast({ title: "Hata", description: "En az bir satır kalmalıdır.", variant: "destructive" })}
                                    disabled={isLoading || fields.length <= 1}
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ id: Math.random().toString(36).substring(2, 15), itemName: '', quantity: undefined, unitPrice: undefined, totalPrice: undefined })}
                        disabled={isLoading}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Yeni Satır Ekle
                    </Button>
                      {/* Display overall total */}
                      <div className="flex justify-end font-semibold text-lg pr-[66px]"> {/* Align with Total column + remove button */}
                         Genel Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(overallTotal)}
                     </div>
                 </div>

                {/* Footer Text Section */}
                 <div className="border p-4 rounded-md space-y-2 text-sm text-muted-foreground">
                     <p>1- Yukarıda belirtilen (..... Kalem) mal ve malzeme alımına ait teklifimizi KDV hariç .................... TL bedel karşılığında vermeyi kabul ve taahhüt ederiz.</p>
                     <p>2- Teklifimiz Yapıldığı tarihten itibaren 1 ay geçerlidir.</p>
                     <p>3- 6502 Sayılı Tüketici Koruması Hakkında Kanun ve ilgili mevzuat hükümlerini kabul ediyor, mal ve malzemelerin garanti kapsamında olduğunu taahhüt ediyoruz.</p>
                     <p>4- Teklifimizin kabul edilmesi halinde sipariş yazısının, yukarıda yer alan; adresime elden teslim edilmesini:</p>
                      <FormField
                            control={form.control}
                            name="offerAcceptance"
                            render={({ field }) => (
                            <FormItem className="space-y-2 pl-8"> {/* Indent options */}
                                <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex flex-col space-y-1"
                                    disabled={isLoading}
                                >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="accepted" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Kabul ediyorum.</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="rejected" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Kabul etmiyorum.</FormLabel>
                                    </FormItem>
                                </RadioGroup>
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
```