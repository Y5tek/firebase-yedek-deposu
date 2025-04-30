
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react'; // Added Loader2
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getSerializableFileInfo } from '@/lib/utils';


export default function NewRecordStep7() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData, resetRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress] = React.useState(100); // Final Step

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
      // Placeholder: Assuming typeApprovalDocument is stored in recordData.
      const docInfo = getSerializableFileInfo(recordData.typeApprovalDocument);
       if (docInfo) {
          // In a real app, you would fetch the URL from Firebase Storage using docInfo.name or a stored path.
          // Example: return getDownloadURL(ref(storage, `documents/${docInfo.name}`));
           console.warn("Placeholder URL generation for Type Approval Document.");
           // Return a dummy URL for now, replace with actual Firebase logic
           return `https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/documents%2F${encodeURIComponent(docInfo.name)}?alt=media`; // Replace with your bucket/path
       }
      return null; // Return null if no document info found
  };

  const typeApprovalDocumentUrl = getTypeApprovalDocumentUrl();

  const handleArchive = async () => {
    setIsLoading(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate saving

        // Use the latest data from the state
        const finalRecordData = { ...recordData }; // Copy current state

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
          fileName: `${branch}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}`
        };

        console.log("Archiving final entry:", archiveEntry);

        const currentArchive = finalRecordData.archive || [];
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
    // No state update needed as this is a summary page
    router.push('/new-record/step-6');
  };

   // Redirect if essential data is missing
   React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
        toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
        router.push('/select-branch');
    }
   }, [branch, recordData.chassisNumber, router, toast]);

  if (!branch || !recordData.chassisNumber) {
    return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  // Helper component for read-only form rows
  const ReadOnlyRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="grid grid-cols-[150px_1fr] items-center border-b py-2 last:border-b-0">
      <span className="font-medium text-sm text-muted-foreground">{label}</span>
      {/* Use a div instead of Input for better read-only display */}
      <div className="text-sm bg-secondary/30 px-3 py-2 rounded-md min-h-[40px] flex items-center">
          {value ?? '-'}
      </div>
    </div>
  );

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
            Lütfen tüm bilgileri kontrol edin ve kaydı tamamlayın. Bu sayfadaki alanlar düzenlenemez.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Section 1 */}
            <div className="border rounded-md p-4 space-y-0"> {/* Reduced space-y */}
                <ReadOnlyRow label="SIRA NO" value={recordData.sequenceNo || recordData.workOrderNumber} /> {/* Show sequence or work order */}
                <ReadOnlyRow label="ŞUBE ADI" value={branch} />
                <ReadOnlyRow label="PROJE ADI" value={recordData.projectName} />
                <ReadOnlyRow label="TİP ONAY" value={recordData.typeApprovalType} />
                <ReadOnlyRow label="TİP ONAY SEVİYE" value={recordData.typeApprovalLevel} />
                <ReadOnlyRow label="VARYANT" value={recordData.typeAndVariant} />
                <ReadOnlyRow label="VERSİYON" value={recordData.typeApprovalVersion} />
            </div>

            {/* Section 2 */}
             <div className="border rounded-md p-4 space-y-0">
                 <ReadOnlyRow label="TİP ONAY NO" value={recordData.typeApprovalNumber} />
                 {/* Document Link */}
                <div className="grid grid-cols-[150px_1fr] items-center py-2">
                    <span className="font-medium text-sm text-muted-foreground">TİP ONAY BELGESİ</span>
                     {typeApprovalDocumentUrl ? (
                        <Button
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
                 </div>
            </div>


            {/* Section 3 */}
            <div className="border rounded-md p-4 space-y-0">
                <ReadOnlyRow label="TARİH" value={formatDateSafe(recordData.formDate || recordData.workOrderDate || recordData.finalCheckDate)} /> {/* Use any available date */}
                <ReadOnlyRow label="ŞASİ NO" value={recordData.chassisNumber} />
                <ReadOnlyRow label="MOTOR NO" value={recordData.engineNumber} />
                <ReadOnlyRow label="PLAKA" value={recordData.plateNumber || recordData.plate} /> {/* Show plate from step 1/2 or step 5 */}
                <ReadOnlyRow label="MÜŞTERİ ADI" value={recordData.customerName} />
                <ReadOnlyRow label="YAPILACAK İŞLER" value={recordData.detailsOfWork} />
                <ReadOnlyRow label="PROJE NO" value={recordData.projectNo} />
            </div>


          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
               <ArrowLeft className="mr-2 h-4 w-4"/> Geri
            </Button>
            <Button type="button" onClick={handleArchive} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Kaydı Tamamla ve Arşivle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
