
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
import { Save, ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getSerializableFileInfo } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; // Import form components
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { getTypeApprovalRecords } from '@/services/firestore'; // Import function to fetch records
import type { TypeApprovalRecord } from '@/types'; // Import type


// Define Zod schema for editable fields on this page
const FormSchema = z.object({
    sequenceNo: z.string().optional(), // SIRA NO (Assuming it's linked to workOrderNumber or sequenceNo)
    projectName: z.string().optional(), // PROJE ADI
    typeApprovalType: z.string().optional(), // TİP ONAY
    typeApprovalLevel: z.string().optional(), // tip onay seviye
    typeApprovalVersion: z.string().optional(), // VERSİYON
    typeApprovalNumber: z.string().optional(), // TİP ONAY NO - Now potentially auto-filled
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
  const [progress] = React.useState(100); // Final Step

  // Fetch Type Approval Records using React Query
  const { data: typeApprovalList = [], isLoading: isLoadingApprovals } = useQuery<TypeApprovalRecord[], Error>({
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

   // Effect to auto-populate Type Approval Number
   React.useEffect(() => {
        if (isLoadingApprovals || !typeApprovalList || typeApprovalList.length === 0) {
            return; // Don't run if data isn't ready
        }

        // Define matching criteria (adjust these fields as needed)
        const criteria = {
            sube_adi: branch, // Match current branch
            proje_adi: recordData.projectName, // Match project name
            tip_onay: recordData.typeApprovalType, // Match type approval type
            tip_onay_seviye: recordData.typeApprovalLevel, // Match level
            varyant: recordData.typeAndVariant, // Match variant
            versiyon: recordData.typeApprovalVersion, // Match version
        };

        console.log("Attempting to find match with criteria:", criteria);

        const matchedRecords = typeApprovalList.filter(record => {
            let isMatch = true;
            // Check each criterion - only compare if the criterion value exists in recordData
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

        // If exactly one match is found, auto-populate the field
        if (matchedRecords.length === 1) {
            const matchedNumber = matchedRecords[0].tip_onay_no;
             // Only update if the field is currently empty or different from the matched number
             const currentApprovalNo = form.getValues('typeApprovalNumber');
            if (matchedNumber && (!currentApprovalNo || currentApprovalNo !== matchedNumber)) {
                 console.log("Auto-populating TİP ONAY NO with:", matchedNumber);
                 form.setValue('typeApprovalNumber', matchedNumber);
                 // Also update the global state immediately for consistency
                 updateRecordData({ typeApprovalNumber: matchedNumber });
             } else {
                 console.log("TİP ONAY NO already set or matches the found number. No update needed.");
             }
        } else if (matchedRecords.length > 1) {
            console.warn("Multiple matching Type Approval Numbers found. Cannot auto-populate.");
            // Optionally, show a message to the user or allow selection
             // For now, just leave the field as is
             // form.setValue('typeApprovalNumber', recordData.typeApprovalNumber || ''); // Reset to original or empty
        } else {
             console.log("No unique matching Type Approval Number found starting with AİTM.");
             // Leave the field as is (or reset if needed)
             // form.setValue('typeApprovalNumber', recordData.typeApprovalNumber || ''); // Reset to original or empty
        }

   // Dependencies: Run when approval list or relevant recordData changes
   // form is excluded to prevent loops on setValue
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [
       typeApprovalList,
       isLoadingApprovals,
       branch,
       recordData.projectName,
       recordData.typeApprovalType,
       recordData.typeApprovalLevel,
       recordData.typeAndVariant,
       recordData.typeApprovalVersion,
       recordData.typeApprovalNumber, // Include this to re-evaluate if it changes manually
       updateRecordData, // Add updateRecordData to dependencies
   ]);


  // Format dates safely
   const formatDateSafe = (dateString: string | undefined, formatStr: string = 'dd.MM.yyyy'): string => {
       if (!dateString) return '-';
       try {
           // Ensure the date string is valid ISO format before parsing
           if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(dateString)) {
              // Attempt to parse potentially non-ISO formats if needed, or return default
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
      const docInfo = getSerializableFileInfo(recordData.typeApprovalDocument);
       if (docInfo) {
           console.warn("Placeholder URL generation for Type Approval Document.");
           // Return a dummy URL for now, replace with actual Firebase logic
           // Construct a generic placeholder URL or use the actual URL if available
           // Example: return `https://your-storage-provider.com/path/to/${encodeURIComponent(docInfo.name)}`;
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
        // Sync form with latest recordData from state, but *after* the auto-populate effect runs
        // We might not need to reset here if the effect handles the initial population correctly
         // form.reset({
         //    sequenceNo: recordData.sequenceNo || recordData.workOrderNumber || '',
         //    projectName: recordData.projectName || '',
         //    typeApprovalType: recordData.typeApprovalType || '',
         //    typeApprovalLevel: recordData.typeApprovalLevel || '',
         //    typeApprovalVersion: recordData.typeApprovalVersion || '',
         //    typeApprovalNumber: recordData.typeApprovalNumber || '', // Initialize
         //    engineNumber: recordData.engineNumber || '',
         //    detailsOfWork: recordData.detailsOfWork || '',
         //    projectNo: recordData.projectNo || '',
         // });
    }
    // Exclude form from dependencies to avoid infinite loops
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [branch, recordData.chassisNumber, router, toast]); // Removed recordData deps managed by auto-populate effect


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
             {/* Pass form instance to FormProvider */}
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
                              {/* Display only, not editable */}
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
                            <FormItem className="grid grid-cols-[150px_1fr] items-center">
                                <FormLabel>TİP ONAY NO</FormLabel>
                                <FormControl>
                                     <Input
                                         placeholder={isLoadingApprovals ? "Liste yükleniyor..." : "Tip Onay No..."}
                                         {...field}
                                         disabled={isLoading || isLoadingApprovals} // Disable while loading list too
                                    />
                                </FormControl>
                                <FormDescription className="col-start-2 text-xs">
                                    Eşleşen kayıt bulunursa otomatik doldurulur (AİTM ile başlamalıdır).
                                </FormDescription>
                                <FormMessage className="col-start-2"/>
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
                                     {/* Using Input for consistency, could use Textarea if needed */}
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
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || isLoadingApprovals}>
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
