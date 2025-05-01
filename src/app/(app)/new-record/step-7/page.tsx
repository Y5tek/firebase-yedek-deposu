
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppState } from '@/hooks/use-app-state';
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
        if (isLoadingApprovals || !typeApprovalList || typeApprovalList.length === 0) {
            toast({
                title: "Liste Yüklenemedi",
                description: "Tip onay listesi henüz yüklenmedi veya boş.",
                variant: "destructive"
            });
            return; // Don't run if data isn't ready
        }
        setIsFindingApprovalNo(true); // Indicate loading state for the button action

        // --- Define matching criteria based on request ---
        // Use form values first, fallback to recordData for values not directly on this form's schema
        const criteria = {
            sube_adi: branch, // Match current branch
            proje_adi: form.getValues('projectName') || recordData.projectName,
            tip_onay: form.getValues('typeApprovalType') || recordData.typeApprovalType,
            tip_onay_seviye: form.getValues('typeApprovalLevel') || recordData.typeApprovalLevel,
            varyant: recordData.typeAndVariant, // From global state (likely Step 2)
            versiyon: form.getValues('typeApprovalVersion') || recordData.typeApprovalVersion,
        };

        console.log("Attempting to find match with criteria:", criteria);

        // Filter the list based on the defined criteria
        const matchedRecords = typeApprovalList.filter(record => {
            let isMatch = true;
            // Compare each criterion, only if the criterion has a value
            // Use optional chaining and nullish coalescing for safer access
             if (criteria.sube_adi && record.sube_adi !== criteria.sube_adi) isMatch = false;
             if (criteria.proje_adi && record.proje_adi !== criteria.proje_adi) isMatch = false;
             if (criteria.tip_onay && record.tip_onay !== criteria.tip_onay) isMatch = false;
             if (criteria.tip_onay_seviye && record.tip_onay_seviye !== criteria.tip_onay_seviye) isMatch = false;
             if (criteria.varyant && record.varyant !== criteria.varyant) isMatch = false;
             if (criteria.versiyon && record.versiyon !== criteria.versiyon) isMatch = false;


            // Also check if tip_onay_no exists and starts with "AİTM"
            if (!record.tip_onay_no || !record.tip_onay_no.toUpperCase().startsWith('AİTM')) {
                 isMatch = false;
             }

            return isMatch;
        });

        console.log("Matched records found:", matchedRecords);

        let message = "";
        let variant: "default" | "destructive" = "default";

        // If exactly one match is found, auto-populate the field
        if (matchedRecords.length === 1) {
            const matchedNumber = matchedRecords[0].tip_onay_no;
             const currentApprovalNo = form.getValues('typeApprovalNumber');
            if (matchedNumber && (!currentApprovalNo || currentApprovalNo !== matchedNumber)) {
                 console.log("Auto-populating TİP ONAY NO with:", matchedNumber);
                 form.setValue('typeApprovalNumber', matchedNumber);
                 updateRecordData({ typeApprovalNumber: matchedNumber }); // Update global state too
                 message = `Tip Onay No bulundu ve dolduruldu: ${matchedNumber}`;
                 variant = "default";
             } else if (matchedNumber && currentApprovalNo === matchedNumber) {
                 message = `Tip Onay No zaten doğru şekilde ayarlanmış: ${matchedNumber}`;
                 variant = "default";
             } else {
                 // This case should ideally not happen if matchedNumber exists
                 message = "Eşleşen Tip Onay No bulundu ancak alan güncellenemedi.";
                 variant = "destructive";
             }
        } else if (matchedRecords.length > 1) {
            console.warn("Multiple matching Type Approval Numbers found. Cannot auto-populate.");
            message = `Birden fazla (${matchedRecords.length}) eşleşen Tip Onay Numarası bulundu. Otomatik doldurma yapılamadı. Lütfen kriterleri daraltın veya manuel giriş yapın.`;
            variant = "destructive";
            // Clear the field if multiple matches are found
            // form.setValue('typeApprovalNumber', ''); // Consider if this behavior is desired
            // updateRecordData({ typeApprovalNumber: '' });
        } else {
             console.log("No unique matching Type Approval Number found starting with AİTM based on criteria.");
             message = "Belirtilen kriterlere uyan ve 'AİTM' ile başlayan Tip Onay Numarası bulunamadı.";
             variant = "destructive";
             // Clear the field if no match is found
             form.setValue('typeApprovalNumber', '');
             updateRecordData({ typeApprovalNumber: '' });
        }

         toast({
            title: "Tip Onay No Arama Sonucu",
            description: message,
            variant: variant,
        });
        setIsFindingApprovalNo(false); // Reset loading state

   // Dependencies: Include all criteria fields from form/state
   }, [
       typeApprovalList,
       isLoadingApprovals,
       branch,
       form, // Include form instance as getValues is used
       recordData.projectName, // Include individual fields used in criteria
       recordData.typeApprovalType,
       recordData.typeApprovalLevel,
       recordData.typeAndVariant,
       recordData.typeApprovalVersion,
       updateRecordData,
       toast
   ]);


   // Effect to potentially auto-populate on load (optional, can be removed if button is the only trigger)
   React.useEffect(() => {
       // Commented out to make the button the primary trigger.
       // findAndSetTypeApprovalNumber();
   }, [
       // Only trigger find on load if absolutely necessary based on specific deps
       // typeApprovalList, branch, // etc.
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
      // This function currently generates a placeholder URL.
      // In a real application, you would fetch the URL associated with the
      // selected recordData.typeApprovalNumber from Firestore or another source.
      // For now, it links based on the *current* document attached in state, if any.
      const docInfo = getSerializableFileInfo(recordData.typeApprovalDocument);
       if (docInfo) {
           console.warn("Placeholder URL generation for Type Approval Document.");
           // Using a generic placeholder that looks like a Firebase URL structure
            return `https://firebasestorage.googleapis.com/v0/b/placeholder-bucket.appspot.com/o/documents%2F${encodeURIComponent(docInfo.name)}?alt=media`;
       }
      return null; // Return null if no document info found
  };

  const typeApprovalDocumentUrl = getTypeApprovalDocumentUrl();

  const onSubmit = async (data: FormData) => { // Use form data
    setIsLoading(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate saving

        // Update the recordData state with the edited values from the form
        // AND ensure all other recordData fields are preserved
        const currentState = useAppState.getState().recordData;
        updateRecordData({
            ...currentState, // Start with current state
            // Overwrite with submitted form data
            sequenceNo: data.sequenceNo,
            projectName: data.projectName,
            typeApprovalType: data.typeApprovalType,
            typeApprovalLevel: data.typeApprovalLevel,
            typeApprovalVersion: data.typeApprovalVersion,
            typeApprovalNumber: data.typeApprovalNumber, // Get latest value from form
            engineNumber: data.engineNumber,
            detailsOfWork: data.detailsOfWork,
            projectNo: data.projectNo,
        });

         // Access the *updated* state after the updateRecordData call
         const finalRecordData = useAppState.getState().recordData;

        const archiveEntry = {
          // Spread all existing fields from the final state
          ...finalRecordData,
          // Ensure file info is serializable
          registrationDocument: getSerializableFileInfo(finalRecordData.registrationDocument),
          labelDocument: getSerializableFileInfo(finalRecordData.labelDocument),
          typeApprovalDocument: getSerializableFileInfo(finalRecordData.typeApprovalDocument),
          additionalPhotos: finalRecordData.additionalPhotos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
          additionalVideos: finalRecordData.additionalVideos?.map(getSerializableFileInfo).filter(Boolean) as { name: string; type?: string; size?: number }[] | undefined,
          // Add metadata
          branch: branch, // Ensure branch is included
          archivedAt: new Date().toISOString(),
          fileName: `${branch || 'NO-BRANCH'}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}` // Handle null branch
        };

        console.log("Archiving final entry:", archiveEntry);

        const currentArchive = finalRecordData.archive || [];
        // Use the state setter function to ensure atomicity if needed, though direct update is usually fine here
        updateRecordData({ archive: [...currentArchive, archiveEntry] });


        toast({
          title: 'Kayıt Tamamlandı ve Arşivlendi',
          description: 'Tüm bilgiler başarıyla kaydedildi ve arşive eklendi.',
        });
        resetRecordData(); // Reset form data after successful archive
        router.push('/archive'); // Redirect to the archive page
    } catch (error) {
         console.error("Archiving error:", error);
         toast({
             title: 'Arşivleme Hatası',
             description: 'Kayıt arşivlenirken bir hata oluştu. Lütfen tekrar deneyin.',
             variant: 'destructive',
         });
    } finally {
       setIsLoading(false);
    }
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
    if (!branch || !recordData.chassisNumber) {
        toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
        router.push('/select-branch');
    } else {
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
    }
   // Only run when branch or chassis number changes, or on mount
   // Removed form and recordData from deps to prevent excessive resets, rely on state sync from updateRecordData
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [branch, recordData.chassisNumber, router, toast]);


  if (!branch || !recordData.chassisNumber) {
    return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }


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
            (Şube: {branch}, Şase: {recordData.chassisNumber})
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
                           <FormLabel>VARYANT</FormLabel>
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
                                <FormLabel className="pt-2">TİP ONAY NO</FormLabel> {/* Adjusted padding */}
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

