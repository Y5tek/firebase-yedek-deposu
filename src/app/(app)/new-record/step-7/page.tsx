
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppState, RecordData } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowLeft, ExternalLink, FileText, Loader2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getSerializableFileInfo } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useQuery } from '@tanstack/react-query';
import { getTypeApprovalRecords } from '@/services/firestore';
import type { TypeApprovalRecord } from '@/types';


// Define Zod schema for editable fields on this page
const FormSchema = z.object({
    sequenceNo: z.string().optional(), // SIRA NO (Assuming it's linked to workOrderNumber or sequenceNo)
    projectName: z.string().optional(), // PROJE ADI
    typeApprovalType: z.string().optional(), // TİP ONAY
    typeApprovalLevel: z.string().optional(), // tip onay seviye
    typeApprovalVersion: z.string().optional(), // VERSİYON
    typeApprovalNumber: z.string().optional(), // TİP ONAY NO - Now potentially auto-filled/manually triggered
    engineNumber: z.string().optional(), // MOTOR NO
    detailsOfWork: z.string().optional(), // YAPILACAK İŞLER (Assuming it's from İş Emri)
    projectNo: z.string().optional(), // PROJE NO
});

type FormData = z.infer<typeof FormSchema>;


export default function NewRecordStep7() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData, resetRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFindingApprovalNo, setIsFindingApprovalNo] = React.useState(false); // State for button loading
  const [progress] = React.useState(100); // Final Step

  // Fetch Type Approval Records using React Query
  const { data: typeApprovalList = [], isLoading: isLoadingApprovals, error: fetchApprovalsError } = useQuery<TypeApprovalRecord[], Error>({
    queryKey: ['typeApprovalRecords'], // Use the same key as the list page
    queryFn: getTypeApprovalRecords,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
  });


  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { // Initialize form with data from state
        sequenceNo: recordData.sequenceNo || recordData.workOrderNumber || '',
        projectName: recordData.projectName || '',
        typeApprovalType: recordData.typeApprovalType || '',
        typeApprovalLevel: recordData.typeApprovalLevel || '',
        typeApprovalVersion: recordData.typeApprovalVersion || '',
        typeApprovalNumber: recordData.typeApprovalNumber || '', // Initialize with current value
        engineNumber: recordData.engineNumber || '',
        detailsOfWork: recordData.detailsOfWork || '',
        projectNo: recordData.projectNo || '',
    },
  });

   // Function to find and set the Type Approval Number
   const findAndSetTypeApprovalNumber = React.useCallback(() => {
        console.log("findAndSetTypeApprovalNumber called");
        if (isLoadingApprovals) {
            toast({ title: "Liste Yükleniyor", description: "Tip onay listesi yükleniyor, lütfen bekleyin.", variant: "default" });
            return;
        }
        if (!typeApprovalList || typeApprovalList.length === 0) {
            toast({ title: "Liste Boş", description: "Tip onay listesi boş veya yüklenemedi.", variant: "destructive" });
            return;
        }
        setIsFindingApprovalNo(true);

        // --- Define matching criteria ---
        // Prioritize form values, then fallback to recordData
        const getFormOrRecordValue = (key: keyof FormData) => form.getValues(key) || recordData[key as keyof typeof recordData];

        const criteria = {
            sube_adi: branch, // Use current branch from global state
            proje_adi: getFormOrRecordValue('projectName'),
            tip_onay: getFormOrRecordValue('typeApprovalType'),
            tip_onay_seviye: getFormOrRecordValue('typeApprovalLevel'),
            varyant: recordData.typeAndVariant, // This likely comes from Step 2, not this form
            versiyon: getFormOrRecordValue('typeApprovalVersion'),
        };

        console.log("Attempting to find match with criteria:", criteria);
        // console.log("Full Type Approval List:", typeApprovalList); // Can be verbose, uncomment if needed

        // Filter the list based on the defined criteria
        const matchedRecords = typeApprovalList.filter(record => {
             const checkMatch = (field: keyof TypeApprovalRecord, criterionValue: string | undefined | null) => {
                // If criterion is empty/null, don't filter based on it (matches everything)
                if (!criterionValue) return true;
                // Compare case-insensitively and trim whitespace
                return record[field] && typeof record[field] === 'string' &&
                       record[field]?.trim().toLowerCase() === criterionValue.trim().toLowerCase();
            };

            let isMatch = true;
            // Compare each criterion
            if (!checkMatch('sube_adi', criteria.sube_adi)) isMatch = false;
            if (!checkMatch('proje_adi', criteria.proje_adi)) isMatch = false;
            if (!checkMatch('tip_onay', criteria.tip_onay)) isMatch = false;
            if (!checkMatch('tip_onay_seviye', criteria.tip_onay_seviye)) isMatch = false;
            if (!checkMatch('varyant', criteria.varyant)) isMatch = false;
            if (!checkMatch('versiyon', criteria.versiyon)) isMatch = false;

            // Also check if tip_onay_no exists and starts with "AİTM" (case-insensitive)
            const tipOnayNo = record.tip_onay_no?.trim().toUpperCase();
            if (!tipOnayNo || !tipOnayNo.startsWith('AİTM')) {
                 isMatch = false;
             }

             // if (isMatch) console.log("Potential match found:", record); // Can be verbose

            return isMatch;
        });

        console.log(`Found ${matchedRecords.length} matched records.`);

        let message = "";
        let variant: "default" | "destructive" = "default";
        let numberToSet = ''; // Variable to hold the number to set or empty string to clear

        if (matchedRecords.length === 1) {
            const matchedNumber = matchedRecords[0].tip_onay_no;
            if (matchedNumber) {
                console.log("Unique match found. Setting TİP ONAY NO to:", matchedNumber); // Updated log message
                numberToSet = matchedNumber;
                message = `Tip Onay No bulundu ve dolduruldu: ${matchedNumber}`; // Updated message
                variant = "default";
            } else {
                // This case shouldn't normally happen if the filter requires tip_onay_no
                console.warn("Unique match found, but tip_onay_no is empty.");
                message = "Eşleşen kayıt bulundu ancak Tip Onay No boş."; // Updated message
                variant = "destructive";
            }
        } else if (matchedRecords.length > 1) {
            console.warn("Multiple matching Type Approval Numbers found. Cannot auto-populate.");
            message = `Birden fazla (${matchedRecords.length}) eşleşen Tip Onay Numarası bulundu. Otomatik doldurma yapılamadı. Lütfen kriterleri daraltın veya manuel giriş yapın.`; // Updated message
            variant = "destructive";
             numberToSet = ''; // Clear the field if multiple matches
        } else {
             console.log("No unique matching Type Approval Number found starting with AİTM based on criteria.");
             message = "Belirtilen kriterlere uyan ve 'AİTM' ile başlayan Tip Onay Numarası bulunamadı."; // Updated message
             variant = "destructive";
             numberToSet = ''; // Clear the field if no match
        }

        // Update form and global state
        form.setValue('typeApprovalNumber', numberToSet);
        updateRecordData({ typeApprovalNumber: numberToSet });

         toast({
            title: "Tip Onay No Arama Sonucu", // Updated title
            description: message,
            variant: variant,
            duration: matchedRecords.length === 1 ? 5000 : 9000, // Longer duration for errors/warnings
        });
        setIsFindingApprovalNo(false);

   // Re-added dependencies for useCallback
   }, [
       typeApprovalList,
       isLoadingApprovals,
       branch,
       form,
       recordData.projectName,
       recordData.typeApprovalType,
       recordData.typeApprovalLevel,
       recordData.typeAndVariant,
       recordData.typeApprovalVersion,
       updateRecordData,
       toast
   ]);

   // Format dates safely
   const formatDateSafe = (dateString: string | undefined, formatStr: string = 'dd.MM.yyyy'): string => {
       if (!dateString) return '-';
       try {
           // Ensure the date string is valid ISO format before parsing
           if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(dateString)) {
              const parsedDate = new Date(dateString);
              if (isNaN(parsedDate.getTime())) {
                   return 'Geçersiz Tarih';
              }
              return format(parsedDate, formatStr, { locale: tr });
           }
           return format(parseISO(dateString), formatStr, { locale: tr });
       } catch (error) {
           console.error("Date formatting error:", error, "Input:", dateString);
           return 'Geçersiz Tarih';
       }
   };

  // Helper to get document URL or handle missing/invalid data
  // TODO: Replace with actual Firebase URL retrieval logic
  const getTypeApprovalDocumentUrl = (): string | null => {
      // Placeholder: Link based on the *current* document attached in state, if any.
      // Replace with logic to fetch URL based on the selected typeApprovalNumber.
      const docInfo = getSerializableFileInfo(recordData.typeApprovalDocument);
       if (docInfo) {
           console.warn("Placeholder URL generation for Type Approval Document.");
            return `https://firebasestorage.googleapis.com/v0/b/placeholder-bucket.appspot.com/o/documents%2F${encodeURIComponent(docInfo.name)}?alt=media`;
       }
      return null; // Return null if no document info found
  };

  const typeApprovalDocumentUrl = getTypeApprovalDocumentUrl();

  // --- onSubmit Function ---
   const onSubmit = async (data: FormData) => { // Use form data from this page
       setIsLoading(true);
       console.log("Starting archive process...");

       try {
           // 1. Get the most current recordData from state
           const currentState = useAppState.getState().recordData;

            // 2. Create the final data object, merging form data from this step
            // We don't need validation here as per the request, archive even if data is missing.
            const finalRecordData: RecordData = {
                ...currentState, // Start with current state
                // Overwrite with potentially edited fields from this summary form
                sequenceNo: data.sequenceNo,
                projectName: data.projectName,
                typeApprovalType: data.typeApprovalType,
                typeApprovalLevel: data.typeApprovalLevel,
                typeApprovalVersion: data.typeApprovalVersion,
                typeApprovalNumber: data.typeApprovalNumber, // Get latest value from form
                engineNumber: data.engineNumber,
                detailsOfWork: data.detailsOfWork,
                projectNo: data.projectNo,
            };

            // 3. Construct the archive entry
            const archiveEntry = {
                // Include all relevant fields from the finalRecordData
                ...finalRecordData,
                // Explicitly include branch
                branch: branch,
                // Add metadata
                archivedAt: new Date().toISOString(),
                fileName: `${branch || 'NO-BRANCH'}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}-${new Date().getTime()}`, // Unique filename
                // Ensure file info is serializable (important!)
                registrationDocument: getSerializableFileInfo(finalRecordData.registrationDocument),
                labelDocument: getSerializableFileInfo(finalRecordData.labelDocument),
                typeApprovalDocument: getSerializableFileInfo(finalRecordData.typeApprovalDocument),
                additionalPhotos: finalRecordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
                additionalVideos: finalRecordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
                // Remove the archive array itself from the entry being archived
                archive: undefined,
            };

            // Remove the 'archive' property before saving if it exists
            delete (archiveEntry as any).archive;


            console.log("Archiving final entry:", archiveEntry);

           // 4. Update the archive in the Zustand state
           const currentArchive = useAppState.getState().recordData.archive || [];
            updateRecordData({
                 // Persist the updated editable fields from this step back to the main state
                 // (though they will be reset shortly, this ensures consistency if needed before reset)
                 sequenceNo: data.sequenceNo,
                 projectName: data.projectName,
                 typeApprovalType: data.typeApprovalType,
                 typeApprovalLevel: data.typeApprovalLevel,
                 typeApprovalVersion: data.typeApprovalVersion,
                 typeApprovalNumber: data.typeApprovalNumber,
                 engineNumber: data.engineNumber,
                 detailsOfWork: data.detailsOfWork,
                 projectNo: data.projectNo,
                 // Add the new entry to the archive array
                 archive: [...currentArchive, archiveEntry]
             });


           toast({
             title: 'Kayıt Tamamlandı ve Arşivlendi',
             description: 'Tüm bilgiler başarıyla kaydedildi ve arşive eklendi.',
           });

            // 5. Reset the form data for a new record
            console.log("Resetting record data...");
           resetRecordData(); // Reset form data after successful archive

            // 6. Redirect to the archive page
            console.log("Navigating to archive page...");
           router.push('/archive');

       } catch (error) {
            console.error("Archiving error:", error);
            toast({
                title: 'Arşivleme Hatası',
                description: 'Kayıt arşivlenirken bir hata oluştu. Lütfen tekrar deneyin.',
                variant: 'destructive',
            });
            setIsLoading(false); // Ensure loading is stopped on error
       }
       // Do not set isLoading to false here if navigation happens successfully
   };

  const goBack = () => {
     // Save current form data to state before going back
     updateRecordData({
          sequenceNo: form.getValues('sequenceNo'),
          projectName: form.getValues('projectName'),
          typeApprovalType: form.getValues('typeApprovalType'),
          typeApprovalLevel: form.getValues('typeApprovalLevel'),
          typeApprovalVersion: form.getValues('typeApprovalVersion'),
          typeApprovalNumber: form.getValues('typeApprovalNumber'), // Save latest value
          engineNumber: form.getValues('engineNumber'),
          detailsOfWork: form.getValues('detailsOfWork'),
          projectNo: form.getValues('projectNo'),
     });
    router.push('/new-record/step-6');
  };

   // Redirect if essential data is missing & sync form on load/data change
   React.useEffect(() => {
       // Remove the check for missing branch or chassisNumber
       // if (!branch || !recordData.chassisNumber) {
       //     toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
       //     router.push('/select-branch');
       // } else {
           // Sync form with the latest recordData from state on initial load or when critical data changes
            form.reset({
               sequenceNo: recordData.sequenceNo || recordData.workOrderNumber || '',
               projectName: recordData.projectName || '',
               typeApprovalType: recordData.typeApprovalType || '',
               typeApprovalLevel: recordData.typeApprovalLevel || '',
               typeApprovalVersion: recordData.typeApprovalVersion || '',
               typeApprovalNumber: recordData.typeApprovalNumber || '', // Sync this as well
               engineNumber: recordData.engineNumber || '',
               detailsOfWork: recordData.detailsOfWork || '',
               projectNo: recordData.projectNo || '',
            });
       // }
   // Only run when branch or chassis number changes, or on mount
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [branch, recordData.chassisNumber, router, toast, recordData]); // Added recordData dependency to re-sync on any change


   // Remove the loading check related to missing branch/chassis
   // if (!branch || !recordData.chassisNumber) {
   //   return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
   // }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
      <Progress value={progress} className="w-full max-w-3xl mb-4" />
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
             <FileText className="text-primary" />
            Kayıt Özeti ve Tamamlama
          </CardTitle>
          <CardDescription>
            Lütfen tüm bilgileri kontrol edin ve kaydedin. Gerekirse alanları düzenleyebilirsiniz.
            (Şube: {branch || 'Belirtilmedi'}, Şase: {recordData.chassisNumber || 'Belirtilmedi'})
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1 */}
                 <div className="border rounded-md p-4 space-y-4">
                     <FormField
                         control={form.control}
                         name="sequenceNo"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>SIRA NO</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sıra No..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                     />
                      <FormItem className="grid grid-cols-[150px_1fr] items-center">
                          <FormLabel>ŞUBE ADI</FormLabel>
                          <FormControl>
                              <Input value={branch || '-'} disabled className="bg-secondary/30"/>
                           </FormControl>
                       </FormItem>
                       <FormField
                         control={form.control}
                         name="projectName"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>PROJE ADI</FormLabel>
                                <FormControl>
                                    <Input placeholder="Proje Adı..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                      />
                      <FormField
                         control={form.control}
                         name="typeApprovalType"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>TİP ONAY</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tip Onay..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                      />
                       <FormField
                         control={form.control}
                         name="typeApprovalLevel"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>TİP ONAY SEVİYE</FormLabel>
                                <FormControl>
                                    <Input placeholder="Onay Seviyesi..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                      />
                      <FormItem className="grid grid-cols-[150px_1fr] items-center">
                           <FormLabel>Varyant</FormLabel> {/* Changed label */}
                           <FormControl>
                              <Input value={recordData.typeAndVariant || '-'} disabled className="bg-secondary/30"/>
                           </FormControl>
                       </FormItem>
                       <FormField
                         control={form.control}
                         name="typeApprovalVersion"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>VERSİYON</FormLabel>
                                <FormControl>
                                    <Input placeholder="Versiyon..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                      />
                 </div>

                {/* Section 2 */}
                <div className="border rounded-md p-4 space-y-4">
                     <FormField
                         control={form.control}
                         name="typeApprovalNumber"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr_auto] items-start gap-x-2"> {/* Changed to items-start for multiline description */}
                                <FormLabel className="pt-2">TİP ONAY NO</FormLabel>
                                <div className="flex flex-col w-full"> {/* Wrap input and message */}
                                    <FormControl>
                                         <Input
                                             placeholder={isLoadingApprovals ? "Liste yükleniyor..." : "Tip Onay No..."}
                                             {...field}
                                             disabled={isLoading || isLoadingApprovals || isFindingApprovalNo}
                                        />
                                    </FormControl>
                                    <FormMessage className="mt-1" /> {/* Add margin top */}
                                     <FormDescription className="text-xs mt-1"> {/* Add margin top */}
                                         Eşleşen kayıt bulunursa otomatik doldurulur (AİTM ile başlamalıdır) veya "No Bul" ile deneyin.
                                     </FormDescription>
                                </div>
                                {/* Button to trigger lookup */}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={findAndSetTypeApprovalNumber}
                                    disabled={isLoading || isLoadingApprovals || isFindingApprovalNo}
                                    className="whitespace-nowrap mt-[2px]" // Align button slightly better
                                >
                                    {isFindingApprovalNo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                                    <span className="ml-1 hidden sm:inline">No Bul</span>
                                </Button>
                            </FormItem>
                         )}
                     />
                     {/* Document Link */}
                     <FormItem className="grid grid-cols-[150px_1fr] items-center">
                        <FormLabel>TİP ONAY BELGESİ</FormLabel>
                         {typeApprovalDocumentUrl ? (
                             <Button
                                 type="button" // Important: Prevent form submission
                                 variant="link"
                                 asChild
                                 className="p-0 h-auto justify-start text-primary hover:underline"
                             >
                                 <a href={typeApprovalDocumentUrl} target="_blank" rel="noopener noreferrer">
                                     <FileText className="mr-2 h-4 w-4" />
                                     Tip Onay Belgesine erişmek için tıklayınız
                                     <ExternalLink className="ml-2 h-3 w-3 opacity-70"/>
                                 </a>
                             </Button>
                         ) : (
                             <span className="text-sm text-muted-foreground italic">(Tip Onay Belgesi Yüklenmedi)</span>
                         )}
                     </FormItem>
                 </div>


                {/* Section 3 */}
                <div className="border rounded-md p-4 space-y-4">
                    <FormItem className="grid grid-cols-[150px_1fr] items-center">
                        <FormLabel>TARİH</FormLabel>
                        <FormControl>
                            <Input value={formatDateSafe(recordData.formDate || recordData.workOrderDate || recordData.finalCheckDate)} disabled className="bg-secondary/30"/>
                        </FormControl>
                    </FormItem>
                     <FormItem className="grid grid-cols-[150px_1fr] items-center">
                         <FormLabel>ŞASİ NO</FormLabel>
                         <FormControl>
                             <Input value={recordData.chassisNumber || '-'} disabled className="bg-secondary/30"/>
                         </FormControl>
                     </FormItem>
                     <FormField
                         control={form.control}
                         name="engineNumber"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>MOTOR NO</FormLabel>
                                <FormControl>
                                    <Input placeholder="Motor No..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                     />
                      <FormItem className="grid grid-cols-[150px_1fr] items-center">
                         <FormLabel>PLAKA</FormLabel>
                          <FormControl>
                             <Input value={recordData.plateNumber || recordData.plate || '-'} disabled className="bg-secondary/30"/>
                          </FormControl>
                      </FormItem>
                      <FormItem className="grid grid-cols-[150px_1fr] items-center">
                         <FormLabel>MÜŞTERİ ADI</FormLabel>
                         <FormControl>
                             <Input value={recordData.customerName || '-'} disabled className="bg-secondary/30"/>
                         </FormControl>
                      </FormItem>
                      <FormField
                         control={form.control}
                         name="detailsOfWork"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>YAPILACAK İŞLER</FormLabel>
                                <FormControl>
                                    <Input placeholder="Yapılacak İşler..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                      />
                       <FormField
                         control={form.control}
                         name="projectNo"
                         render={({ field }) => (
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>PROJE NO</FormLabel>
                                <FormControl>
                                    <Input placeholder="Proje No..." {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage className="col-start-2"/>
                            </FormItem>
                         )}
                     />
                 </div>


              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                   <ArrowLeft className="mr-2 h-4 w-4"/> Geri
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || isLoadingApprovals || isFindingApprovalNo}>
                  {(isLoading || isFindingApprovalNo) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
