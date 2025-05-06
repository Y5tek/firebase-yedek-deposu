
'use client';

import * as React from 'react';
import Image from 'next/image'; // Import Image component
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAppState, OfferItem, RecordData, ArchiveEntry } from '@/hooks/use-app-state'; // Import OfferItem, RecordData, ArchiveEntry
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea for display
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox for display
import { Archive, Search, FolderOpen, Trash2, Pencil, FileText, Camera, Video, Check, X, Info, Download, Eye, Film, FileSpreadsheet, ClipboardList, FileCheck2, FilePlus } from 'lucide-react'; // Added FilePlus icon
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { tr } from 'date-fns/locale'; // Import Turkish locale
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { getSerializableFileInfo, cn } from '@/lib/utils'; // Import helpers

// ArchiveEntry type is now imported from use-app-state

export default function ArchivePage() {
  const { recordData, updateRecordData } = useAppState();
  const { toast } = useToast();
  const router = useRouter(); // Initialize router
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewingDetailsEntry, setViewingDetailsEntry] = React.useState<ArchiveEntry | null>(null); // State for viewing details
  const [previewMedia, setPreviewMedia] = React.useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null); // State for media preview modal

  // Use recordData.archive or default to empty array
  React.useEffect(() => {
    console.log('ArchivePage: Initial recordData from state:', recordData);
    console.log('ArchivePage: Archive data:', recordData?.archive);
  }, [recordData]);

  const archive: ArchiveEntry[] = React.useMemo(() => {
    const data = recordData?.archive || [];
    // Sort the entire archive by archivedAt date, newest first
    data.sort((a, b) => {
      const timeA = a.archivedAt ? parseISO(a.archivedAt).getTime() : 0;
      const timeB = b.archivedAt ? parseISO(b.archivedAt).getTime() : 0;
      return timeB - timeA; // Descending order
    });
    console.log('ArchivePage: Memoized and sorted archive data:', data);
    return data;
  }, [recordData?.archive]);


  const filteredArchive = React.useMemo(() => {
     const lowerSearchTerm = searchTerm.toLowerCase();
     // Filter the already sorted archive
     const filtered = archive.filter((entry: ArchiveEntry) => {
       // Ensure fields exist before calling toLowerCase()
       return (
         entry.fileName?.toLowerCase().includes(lowerSearchTerm) ||
         entry.chassisNumber?.toLowerCase().includes(lowerSearchTerm) ||
         entry.brand?.toLowerCase().includes(lowerSearchTerm) ||
         entry.owner?.toLowerCase().includes(lowerSearchTerm) ||
         entry.branch?.toLowerCase().includes(lowerSearchTerm) ||
         entry.customerName?.toLowerCase().includes(lowerSearchTerm) || // Search Step 4 customer
         entry.offerCompanyName?.toLowerCase().includes(lowerSearchTerm) || // Search Step 5 company
         entry.plateNumber?.toLowerCase().includes(lowerSearchTerm) || // Search plateNumber (Step 1)
         entry.plate?.toLowerCase().includes(lowerSearchTerm) // Search plate (Step 5 iş emri)
       );
     });
     console.log('ArchivePage: Filtered archive based on searchTerm:', searchTerm, filtered);
     return filtered;
  }, [archive, searchTerm]);


  const groupedArchive = React.useMemo(() => {
     return filteredArchive.reduce((acc, entry) => {
        try {
            // Ensure archivedAt exists and is a valid string before parsing
             if (!entry.archivedAt || typeof entry.archivedAt !== 'string') {
                console.warn("Skipping entry due to invalid or missing archivedAt date:", entry);
                // Place items with invalid dates in a separate "Geçersiz Tarih" group
                 const invalidDateKey = "Geçersiz Tarihli Kayıtlar";
                 if (!acc[invalidDateKey]) {
                     acc[invalidDateKey] = [];
                 }
                 acc[invalidDateKey].push(entry);
                return acc; // Skip this entry if the date is invalid
             }
            const date = parseISO(entry.archivedAt);
            const year = getYear(date);
            const monthName = format(date, 'LLLL', { locale: tr }); // Full month name in Turkish
            const key = `${year}-${monthName}`;

            if (!acc[key]) {
            acc[key] = [];
            }
            acc[key].push(entry);
            // Entries are already sorted by date due to pre-sorting `archive`
            return acc;
          } catch (error) {
             console.error("Error processing date for entry:", entry, error);
             // Group entries with processing errors under "Hatalı Kayıtlar"
             const errorKey = "Hatalı Kayıtlar";
             if (!acc[errorKey]) {
                 acc[errorKey] = [];
             }
             acc[errorKey].push(entry);
             return acc;
         }
      }, {} as { [key: string]: ArchiveEntry[] });
  }, [filteredArchive]);


   // Sort group keys (year-month) chronologically, newest first
  const sortedGroupKeys = React.useMemo(() => {
      const keys = Object.keys(groupedArchive);
       keys.sort((a, b) => {
          // Handle special keys first
          if (a === "Hatalı Kayıtlar") return 1;
          if (b === "Hatalı Kayıtlar") return -1;
          if (a === "Geçersiz Tarihli Kayıtlar") return 1;
          if (b === "Geçersiz Tarihli Kayıtlar") return -1;

          // Assuming format YYYY-MonthName (Turkish) for regular keys
          const [yearAStr, monthNameA] = a.split('-');
          const [yearBStr, monthNameB] = b.split('-');

           // Basic check if split worked, otherwise treat as invalid for sorting
           if (!yearAStr || !monthNameA) return 1;
           if (!yearBStr || !monthNameB) return -1;


          const yearA = parseInt(yearAStr);
          const yearB = parseInt(yearBStr);

           // Handle potential NaN from parseInt
           if (isNaN(yearA)) return 1;
           if (isNaN(yearB)) return -1;

          if (yearA !== yearB) {
              return yearB - yearA; // Sort years descending
          }

          // Convert month names back to numbers for comparison
           const monthOrder = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
           const monthIndexA = monthOrder.indexOf(monthNameA);
           const monthIndexB = monthOrder.indexOf(monthNameB);

           // Handle cases where month name might be invalid
            if (monthIndexA === -1) return 1;
            if (monthIndexB === -1) return -1;

           return monthIndexB - monthIndexA; // Sort months descending within the year
       });
       console.log('ArchivePage: Sorted group keys:', keys);
       return keys;
  }, [groupedArchive]);


  const handleDelete = (fileNameToDelete: string) => {
     // Filter based on the ArchiveEntry type which is the type of elements in `archive`
     // Use the full recordData.archive for filtering to ensure correct state update
     const updatedArchive = (recordData.archive || []).filter((entry: ArchiveEntry) => entry.fileName !== fileNameToDelete);
     updateRecordData({ archive: updatedArchive }); // Update the state with the filtered array
     toast({
        title: "Kayıt Silindi",
        description: `${fileNameToDelete} başarıyla silindi.`,
        variant: "destructive"
     });
  };

   const handleViewDetails = (entry: ArchiveEntry) => {
       setViewingDetailsEntry(entry); // Set the entry to be viewed
   };

   const handleEdit = (entry: ArchiveEntry) => {
        // 1. Find the entry in the current archive (optional, but good practice)
        const entryToEdit = (recordData.archive || []).find((e: ArchiveEntry) => e.fileName === entry.fileName);
        if (!entryToEdit) {
            toast({ title: "Hata", description: "Düzenlenecek kayıt bulunamadı.", variant: "destructive" });
            return;
        }

        // 2. Set the global state with the data of the entry being edited
        //    We need to reconstruct the state as it was before archiving (handling File objects)
        //    For now, we'll load the serialized data. A more complex solution would involve fetching original Files if stored elsewhere.
        console.log("Loading entry for editing:", entryToEdit);
        updateRecordData({
            ...(entryToEdit as Omit<RecordData, 'archive' | 'registrationDocument' | 'labelDocument' | 'typeApprovalDocument' | 'additionalPhotos' | 'additionalVideos'>), // Load all non-file fields first
            // Explicitly set the files to their stored info format
            // NOTE: This means we don't have the actual File objects for OCR re-scan on edit
            registrationDocument: entryToEdit.registrationDocument,
            labelDocument: entryToEdit.labelDocument,
            typeApprovalDocument: entryToEdit.typeApprovalDocument,
            additionalPhotos: entryToEdit.additionalPhotos,
            additionalVideos: entryToEdit.additionalVideos,
            archive: recordData.archive, // IMPORTANT: Keep the existing archive array in the state
        }, { editingId: entry.fileName }); // Pass the ID being edited

        // 3. Navigate to the first step of the form
        router.push('/new-record/step-1');
    };


   // Helper to get file name (since we store info)
   const getFileName = (fileInfo: { name: string } | undefined): string => {
     // console.log("Getting file name for:", fileInfo); // Log file info retrieval - commented out for cleaner logs
     return fileInfo?.name || 'Yok';
   };

   // Helper to format date safely
   const formatDateSafe = (dateString: string | undefined, formatStr: string = 'dd MMMM yyyy HH:mm'): string => {
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

   // Helper to display checklist status
   const renderChecklistStatus = (status: 'olumlu' | 'olumsuz' | undefined) => {
       if (status === 'olumlu') return <Check className="h-5 w-5 text-green-600" />;
       if (status === 'olumsuz') return <X className="h-5 w-5 text-red-600" />;
       return <span className="text-muted-foreground">-</span>;
   };

    // Helper to display boolean checklist status (from Step 6)
   const renderBooleanChecklistStatus = (status: boolean | undefined) => {
       if (status === true) return <Check className="h-5 w-5 text-green-600" />;
       if (status === false) return <X className="h-5 w-5 text-red-600" />; // Assuming false means olumsuz
       return <span className="text-muted-foreground">-</span>;
   };


   // Helper to display Offer Acceptance status
    const renderOfferAcceptanceStatus = (status: 'accepted' | 'rejected' | undefined) => {
        if (status === 'accepted') return <span className="text-green-600 font-medium">Kabul Edildi</span>;
        if (status === 'rejected') return <span className="text-red-600 font-medium">Reddedildi</span>;
        return <span className="text-muted-foreground">-</span>;
    };

   // Helper to format currency
    const formatCurrency = (value: number | undefined | string | null): string => {
         if (value === undefined || value === null || value === '') return '-';
         const numValue = typeof value === 'string' ? parseFloat(value) : value;
         if (isNaN(numValue)) return '-';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(numValue);
    };

    // Placeholder function to get a viewable URL for archived files
    // In a real app, this would fetch the actual file URL from Firebase Storage
    const getFileViewUrl = (fileInfo: { name: string; type?: string; size?: number } | undefined): string | null => {
        if (!fileInfo || !fileInfo.name) return null;
        // Placeholder - replace with actual Firebase Storage URL generation
        console.warn("Placeholder: Using placeholder URL for viewing file:", fileInfo.name);
        // Example placeholder structure (adjust to your Firebase setup)
        // return `https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/archive_files%2F${encodeURIComponent(fileInfo.name)}?alt=media`;
        // For now, generate a temporary blob URL if a File object is somehow available (unlikely for archived data)
        if (fileInfo instanceof File) {
             try {
                 return URL.createObjectURL(fileInfo);
             } catch (e) {
                 console.error("Error creating ObjectURL for archived file preview:", e);
                 return null;
             }
        }
        // If it's just info, we can't generate a view URL without backend integration
        return null;
    };

    const openMediaPreview = (fileInfo: { name: string; type?: string; size?: number } | undefined) => {
        const url = getFileViewUrl(fileInfo); // This might return a blob URL if fileInfo is a File
        if (url && fileInfo?.type) {
            const mediaType = fileInfo.type.startsWith('video/') ? 'video' : 'image';
            setPreviewMedia({ url, type: mediaType, name: fileInfo.name });
        } else if (url) {
             // Assume image if type is unknown but URL exists
             setPreviewMedia({ url, type: 'image', name: fileInfo.name });
        } else {
            toast({ title: "Görüntüleme Yok", description: "Bu dosya için görüntüleme URL'si bulunamadı veya ayarlanmadı.", variant: "destructive" });
        }
    };


    // Checklist questions for Step 4 display
     const checklistItemsStep4 = [
        { id: 'q1_suitable', label: '1- YAPILACAK TADİLATA ARAÇ UYGUN MU?' },
        { id: 'q2_typeApprovalMatch', label: '2- TİP ONAY NUMARASI TUTUYOR MU?' },
        { id: 'q3_scopeExpansion', label: '3- TUTMUYORSA KAPSAM GENİŞLETMEYE UYGUN MU?' },
        { id: 'q4_unaffectedPartsDefect', label: '4- TADİLATTAN ETKİLENMEYEN KISIMLARINDA HER HANGİBİR KUSUR VAR MI?' },
      ];

      // Checklist questions for Step 6 display
     const checklistItemsStep6 = [
        { idBase: 'check1_exposedParts', label: '1- AÇIKTA BİR AKSAM KALMADIĞINI KONTROL ET' },
        { idBase: 'check2_isofixSeat', label: '2- İSOFİX VE KOLTUK BAĞLANTILARININ DÜZGÜNCE YAPILDIĞINI KONTROL ET' },
        { idBase: 'check3_seatBelts', label: '3- EMNİYET KEMERLERİNİN DOĞRU ÇALIŞTIĞINI KONTROL ET' },
        { idBase: 'check4_windowApprovals', label: '4- CAMLARIN ONAYLARINI KONTROL ET' },
      ];

      // Helper to render readonly checkbox display for Step 4
      const renderReadonlyRadioGroup = (checkedValue: 'olumlu' | 'olumsuz' | undefined) => (
        <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-1">
                <Checkbox checked={checkedValue === 'olumlu'} disabled className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600/20" />
                <span className="text-xs">Oluumlu</span>
            </div>
            <div className="flex items-center space-x-1">
                 <Checkbox checked={checkedValue === 'olumsuz'} disabled className="data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600/20"/>
                 <span className="text-xs">Olumsuz</span>
            </div>
        </div>
      );

       // Helper to render readonly checkbox display for Step 6
       const renderReadonlyCheckbox = (checked: boolean | undefined) => (
         <div className="flex items-center justify-center">
             <Checkbox checked={checked} disabled className={cn(
                 "data-[state=checked]:border-primary data-[state=checked]:bg-primary/20", // General checked style
                 checked === true && "data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600/20", // Green if true
                 checked === false && "data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600/20", // Red border if false (but still 'checked' visually)
             )} />
          </div>
       );


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Archive className="text-primary" />
            Arşivlenmiş Kayıtlar
          </CardTitle>
          <CardDescription>Kaydedilmiş tüm belgeleri ve verileri burada bulabilirsiniz.</CardDescription>
          <div className="flex items-center gap-2 pt-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Şube, Şase, Plaka, Müşteri, Firma ara..." // Updated placeholder
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredArchive.length === 0 ? (
             <p className="text-center text-muted-foreground py-6">Arşivlenmiş kayıt bulunamadı veya arama kriterlerine uyan kayıt yok.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {sortedGroupKeys.map((groupKey) => (
                 groupedArchive[groupKey] && groupedArchive[groupKey].length > 0 ? ( // Ensure the group exists and has entries
                    <AccordionItem value={groupKey} key={groupKey}>
                      <AccordionTrigger className="text-lg font-medium bg-secondary/50 px-4 py-3 rounded-t-md hover:bg-secondary">
                          <FolderOpen className="mr-2 h-5 w-5 text-primary" /> {groupKey} ({groupedArchive[groupKey].length} kayıt)
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Dosya Adı (Şube/Şase)</TableHead>
                                      <TableHead>Müşteri/Firma</TableHead>
                                      <TableHead>Marka</TableHead>
                                      <TableHead>Plaka</TableHead>
                                      <TableHead>Arşivlenme Tarihi</TableHead>
                                      <TableHead>Belgeler</TableHead>
                                      <TableHead className="text-right">İşlemler</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                              {groupedArchive[groupKey].map((entry) => (
                                  <TableRow key={entry.fileName}>
                                      <TableCell className="font-medium">{entry.fileName}</TableCell>
                                      <TableCell>
                                          {/* Show customer from step 4 or company from step 5 */}
                                          {entry.customerName || entry.offerCompanyName || '-'}
                                          {entry.customerName && entry.offerCompanyName && <span className="text-xs text-muted-foreground block">(Form: {entry.customerName} / Teklif: {entry.offerCompanyName})</span>}
                                      </TableCell>
                                      <TableCell>{entry.brand || '-'}</TableCell>
                                      <TableCell>{entry.plateNumber || entry.plate || '-'}</TableCell> {/* Show plate from either source */}
                                      <TableCell>{formatDateSafe(entry.archivedAt)}</TableCell>
                                      <TableCell>
                                          <div className="flex flex-wrap gap-2 items-center">
                                          {entry.registrationDocument && (
                                              <div title={`Ruhsat: ${getFileName(entry.registrationDocument)}`} className="flex items-center gap-1 text-green-600">
                                                  <FileText className="h-4 w-4" />
                                                  <span className="text-xs hidden sm:inline">Ruhsat</span>
                                              </div>
                                          )}
                                          {entry.labelDocument && (
                                              <div title={`Etiket: ${getFileName(entry.labelDocument)}`} className="flex items-center gap-1 text-blue-600">
                                                  <FileText className="h-4 w-4" />
                                                  <span className="text-xs hidden sm:inline">Etiket</span>
                                              </div>
                                          )}
                                          {entry.typeApprovalDocument && ( // Display Type Approval Doc presence
                                              <div title={`Tip Onay: ${getFileName(entry.typeApprovalDocument)}`} className="flex items-center gap-1 text-indigo-600">
                                                  <FileText className="h-4 w-4" />
                                                  <span className="text-xs hidden sm:inline">Tip Onay</span>
                                              </div>
                                          )}
                                          {entry.additionalPhotos && entry.additionalPhotos.length > 0 && (
                                              <div title={`${entry.additionalPhotos.length} Ek Fotoğraf`} className="flex items-center gap-1 text-purple-600">
                                                  <Camera className="h-4 w-4" />
                                                  <span className="text-xs">{entry.additionalPhotos.length}</span>
                                              </div>
                                          )}
                                          {entry.additionalVideos && entry.additionalVideos.length > 0 && (
                                              <div title={`${entry.additionalVideos.length} Ek Video`} className="flex items-center gap-1 text-orange-600">
                                                  <Video className="h-4 w-4" />
                                                  <span className="text-xs">{entry.additionalVideos.length}</span>
                                              </div>
                                          )}
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-right space-x-1">
                                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(entry)} title="Detayları Gör">
                                              <Info className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} title="Düzenle">
                                              <Pencil className="h-4 w-4 text-blue-600" />
                                          </Button>
                                          <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" title="Sil">
                                                      <Trash2 className="h-4 w-4" />
                                                  </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                  <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                      Bu işlem geri alınamaz. '{entry.fileName}' kaydını ve ilişkili tüm verileri kalıcı olarak silmek istediğinizden emin misiniz?
                                                  </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDelete(entry.fileName)} className="bg-destructive hover:bg-destructive/90">
                                                      Sil
                                                  </AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </TableCell>
                                  </TableRow>
                              ))}
                              </TableBody>
                            </Table>
                          </div>
                      </AccordionContent>
                    </AccordionItem>
                 ) : null
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

        {/* View Details Modal - Restructured by Step */}
        {viewingDetailsEntry && (
            <AlertDialog open={!!viewingDetailsEntry} onOpenChange={() => setViewingDetailsEntry(null)}>
                <AlertDialogContent className="max-w-4xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kayıt Detayları: {viewingDetailsEntry.fileName}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu kaydın arşivlenmiş tüm verilerini aşağıda adım adım görebilirsiniz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-md border p-4 bg-secondary/30 space-y-4">

                        {/* Adım 1: Araç Ruhsatı */}
                        <details className="border rounded p-2" open>
                            <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary"/> Adım 1: Araç Ruhsatı
                            </summary>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                                <div className="space-y-1">
                                    <p><strong className="font-medium w-28 inline-block">Şube</strong>: {viewingDetailsEntry.branch || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Şasi No</strong>: {viewingDetailsEntry.chassisNumber || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Plaka</strong>: {viewingDetailsEntry.plateNumber || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Markası</strong>: {viewingDetailsEntry.brand || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p><strong className="font-medium w-28 inline-block">Tipi</strong>: {viewingDetailsEntry.type || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Ticari Adı</strong>: {viewingDetailsEntry.tradeName || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Adı Soyadı</strong>: {viewingDetailsEntry.owner || '-'}</p>
                                    <p><strong className="font-medium w-28 inline-block">Motor No</strong>: {viewingDetailsEntry.engineNumber || '-'}</p>
                                </div>
                                <div className="col-span-full pt-2 mt-2 border-t">
                                    <strong className="font-medium">Ruhsat Belgesi:</strong>
                                    {viewingDetailsEntry.registrationDocument ? (
                                        <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-primary hover:underline" onClick={() => openMediaPreview(viewingDetailsEntry.registrationDocument)}>
                                            <Eye className="inline h-4 w-4 mr-1" /> {getFileName(viewingDetailsEntry.registrationDocument)}
                                        </Button>
                                    ) : <span className="italic text-muted-foreground ml-2">Yok</span>}
                                </div>
                            </div>
                        </details>

                        {/* Adım 2: Etiket Bilgileri */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary"/> Adım 2: Etiket Bilgileri
                             </summary>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                                 <div className="space-y-1">
                                     <p><strong className="font-medium w-28 inline-block">Tip Onay No</strong>: {viewingDetailsEntry.typeApprovalNumber || '-'}</p>
                                     <p><strong className="font-medium w-28 inline-block">Varyant</strong>: {viewingDetailsEntry.typeAndVariant || '-'}</p>
                                 </div>
                                  <div className="space-y-1">
                                      <p><strong className="font-medium w-28 inline-block">Versiyon</strong>: {viewingDetailsEntry.versiyon || '-'}</p>
                                      {/* Add other Step 2 fields if any */}
                                  </div>
                                 <div className="col-span-full pt-2 mt-2 border-t">
                                     <strong className="font-medium">Etiket Belgesi:</strong>
                                     {viewingDetailsEntry.labelDocument ? (
                                         <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-primary hover:underline" onClick={() => openMediaPreview(viewingDetailsEntry.labelDocument)}>
                                             <Eye className="inline h-4 w-4 mr-1" /> {getFileName(viewingDetailsEntry.labelDocument)}
                                         </Button>
                                     ) : <span className="italic text-muted-foreground ml-2">Yok</span>}
                                 </div>
                             </div>
                         </details>


                        {/* Adım 3: Ek Dosya Yükleme */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <FilePlus className="h-5 w-5 text-primary"/> Adım 3: Ek Dosyalar
                             </summary>
                             <div className="pt-3 space-y-3 text-sm">
                                 <div>
                                     <strong className="font-medium block mb-1">Tip Onay Belgesi:</strong>
                                     {viewingDetailsEntry.typeApprovalDocument ? (
                                         <Button variant="link" size="sm" className="h-auto p-0 text-primary hover:underline" onClick={() => openMediaPreview(viewingDetailsEntry.typeApprovalDocument)}>
                                             <Eye className="inline h-4 w-4 mr-1" /> {getFileName(viewingDetailsEntry.typeApprovalDocument)}
                                         </Button>
                                     ) : <span className="italic text-muted-foreground">Yok</span>}
                                 </div>
                                 <div>
                                     <strong className="font-medium block mb-1">Ek Fotoğraflar ({viewingDetailsEntry.additionalPhotos?.length || 0}):</strong>
                                     {viewingDetailsEntry.additionalPhotos && viewingDetailsEntry.additionalPhotos.length > 0 ? (
                                         <ul className="list-none space-y-1">
                                             {viewingDetailsEntry.additionalPhotos.map((f, i) => (
                                                 <li key={i}>
                                                     <Button variant="link" size="sm" className="h-auto p-0 text-primary hover:underline" onClick={() => openMediaPreview(f)}>
                                                         <Camera className="inline h-4 w-4 mr-1 text-purple-600" /> {f.name}
                                                     </Button>
                                                 </li>
                                             ))}
                                         </ul>
                                     ) : <span className="italic text-muted-foreground">Yok</span>}
                                 </div>
                                 <div>
                                     <strong className="font-medium block mb-1">Ek Videolar ({viewingDetailsEntry.additionalVideos?.length || 0}):</strong>
                                     {viewingDetailsEntry.additionalVideos && viewingDetailsEntry.additionalVideos.length > 0 ? (
                                         <ul className="list-none space-y-1">
                                             {viewingDetailsEntry.additionalVideos.map((f, i) => (
                                                 <li key={i}>
                                                     <Button variant="link" size="sm" className="h-auto p-0 text-primary hover:underline" onClick={() => openMediaPreview(f)}>
                                                         <Video className="inline h-4 w-4 mr-1 text-orange-600" /> {f.name}
                                                     </Button>
                                                 </li>
                                             ))}
                                         </ul>
                                     ) : <span className="italic text-muted-foreground">Yok</span>}
                                 </div>
                             </div>
                         </details>

                        {/* Adım 4: Seri Tadilat Uygunluk Formu */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-primary"/> Adım 4: Seri Tadilat Uygunluk Formu
                             </summary>
                              <div className="space-y-4 pt-3 text-sm">
                                 {/* Top Section: Müşteri Adı, Tarih, Sıra */}
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <p><strong className="font-medium w-24 inline-block">Müşteri Adı</strong>: {viewingDetailsEntry.customerName || '-'}</p>
                                     <p><strong className="font-medium w-24 inline-block">Form Tarihi</strong>: {formatDateSafe(viewingDetailsEntry.formDate, 'dd.MM.yyyy')}</p>
                                     <p><strong className="font-medium w-24 inline-block">Sıra</strong>: {viewingDetailsEntry.sequenceNo || '-'}</p>
                                 </div>

                                 {/* Checklist Section */}
                                  <div className="border p-3 rounded-md space-y-2 bg-background/50">
                                     <div className="grid grid-cols-[1fr_120px] items-center font-medium mb-1">
                                         <span>Kontrol</span>
                                         <span className="text-center">Durum</span>
                                     </div>
                                     {checklistItemsStep4.map((item) => (
                                         <div key={item.id} className="grid grid-cols-[1fr_120px] items-center gap-x-2 border-t pt-2">
                                             <span className="text-xs">{item.label}</span>
                                             {renderReadonlyRadioGroup(viewingDetailsEntry[item.id as keyof ArchiveEntry] as 'olumlu' | 'olumsuz' | undefined)}
                                          </div>
                                     ))}
                                  </div>

                                 {/* Notes Section */}
                                 <div>
                                     <strong className="font-medium block mb-1">Not:</strong>
                                     <Textarea value={viewingDetailsEntry.notes || ''} readOnly className="h-24 bg-background/50 text-xs" />
                                 </div>

                                 {/* Approval Section */}
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                         <h4 className="font-medium text-center text-xs mb-1">KONTROL EDEN</h4>
                                         <p><strong className="font-medium w-20 inline-block">Adı-Soyadı</strong>: {viewingDetailsEntry.controllerName || '-'}</p>
                                         <div className="h-10 border rounded-md bg-background/50 flex items-center justify-center text-xs text-muted-foreground italic mt-1">(İmza Alanı)</div>
                                     </div>
                                     <div className="space-y-1">
                                         <h4 className="font-medium text-center text-xs mb-1">MERKEZ/ŞUBE YETKİLİSİ</h4>
                                         <p><strong className="font-medium w-20 inline-block">Adı-Soyadı</strong>: {viewingDetailsEntry.authorityName || '-'}</p>
                                         <div className="h-10 border rounded-md bg-background/50 flex items-center justify-center text-xs text-muted-foreground italic mt-1">(İmza Alanı)</div>
                                     </div>
                                 </div>
                              </div>
                         </details>

                         {/* Adım 5: Teklif Formu */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary"/> Adım 5: Teklif Formu
                             </summary>
                             <div className="space-y-4 pt-3 text-sm">
                                {/* Company Details */}
                                <div className="border p-3 rounded-md bg-background/50 space-y-1">
                                     <h4 className="font-medium mb-2 text-center">Firma Bilgileri</h4>
                                     <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                         <p><strong className="font-medium w-24 inline-block">Yetkili Adı</strong>: {viewingDetailsEntry.offerAuthorizedName || '-'}</p>
                                         <p><strong className="font-medium w-24 inline-block">Firma Adı</strong>: {viewingDetailsEntry.offerCompanyName || '-'}</p>
                                         <p className="col-span-2"><strong className="font-medium w-24 inline-block">Açık Adres</strong>: {viewingDetailsEntry.offerCompanyAddress || '-'}</p>
                                         <p><strong className="font-medium w-24 inline-block">Vergi D./No</strong>: {viewingDetailsEntry.offerTaxOfficeAndNumber || '-'}</p>
                                         <p><strong className="font-medium w-24 inline-block">Telefon</strong>: {viewingDetailsEntry.offerPhoneNumber || '-'}</p>
                                         <p><strong className="font-medium w-24 inline-block">E-posta</strong>: {viewingDetailsEntry.offerEmailAddress || '-'}</p>
                                         <p><strong className="font-medium w-24 inline-block">Teklif Tarihi</strong>: {formatDateSafe(viewingDetailsEntry.offerDate, 'dd.MM.yyyy')}</p>
                                     </div>
                                 </div>
                                 {/* İş Emri Details */}
                                 <div className="border p-3 rounded-md bg-background/50 space-y-1">
                                      <h4 className="font-medium mb-2 text-center">İş Emri Detayları</h4>
                                     <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                         <p><strong className="font-medium w-28 inline-block">Proje Adı</strong>: {viewingDetailsEntry.projectName || '-'}</p>
                                         <p><strong className="font-medium w-28 inline-block">Plaka (Teklif)</strong>: {viewingDetailsEntry.plate || '-'}</p>
                                         <p><strong className="font-medium w-28 inline-block">İş Emri Tarihi</strong>: {formatDateSafe(viewingDetailsEntry.workOrderDate, 'dd.MM.yyyy')}</p>
                                         <p><strong className="font-medium w-28 inline-block">İş Emri No</strong>: {viewingDetailsEntry.workOrderNumber || '-'}</p>
                                         <p><strong className="font-medium w-28 inline-block">İşin Bitiş Tarihi</strong>: {formatDateSafe(viewingDetailsEntry.completionDate, 'dd.MM.yyyy')}</p>
                                         <p><strong className="font-medium w-28 inline-block">Proje No</strong>: {viewingDetailsEntry.projectNo || '-'}</p>
                                      </div>
                                      <div className="pt-2 mt-2 border-t">
                                           <strong className="font-medium block mb-1">Yapılacak İşler:</strong>
                                           <Textarea value={viewingDetailsEntry.detailsOfWork || ''} readOnly className="h-20 bg-background/50 text-xs" />
                                       </div>
                                      <div className="pt-2">
                                          <strong className="font-medium block mb-1">Kullanılan Yedek Parçalar/Açık.:</strong>
                                          <Textarea value={viewingDetailsEntry.sparePartsUsed || ''} readOnly className="h-20 bg-background/50 text-xs" />
                                      </div>
                                      <div className="pt-2">
                                          <strong className="font-medium block mb-1">Ücretlendirme:</strong>
                                          <Textarea value={viewingDetailsEntry.pricing || ''} readOnly className="h-16 bg-background/50 text-xs" />
                                      </div>
                                       <div className="grid grid-cols-2 gap-4 pt-2 mt-2 border-t">
                                           <div className="space-y-1">
                                               <h4 className="font-medium text-center text-xs mb-1">ARAÇ KABUL</h4>
                                                <p><strong className="font-medium w-20 inline-block">Adı-Soyadı</strong>: {viewingDetailsEntry.vehicleAcceptanceSignature || '-'}</p>
                                               <div className="h-10 border rounded-md bg-background flex items-center justify-center text-xs text-muted-foreground italic mt-1">(İmza Alanı)</div>
                                           </div>
                                           <div className="space-y-1">
                                               <h4 className="font-medium text-center text-xs mb-1">MÜŞTERİ İMZASI</h4>
                                                <p><strong className="font-medium w-20 inline-block">Adı-Soyadı</strong>: {viewingDetailsEntry.customerSignature || '-'}</p>
                                               <div className="h-10 border rounded-md bg-background flex items-center justify-center text-xs text-muted-foreground italic mt-1">(İmza Alanı)</div>
                                           </div>
                                       </div>
                                 </div>
                                 {/* Offer Items Table */}
                                 {viewingDetailsEntry.offerItems && viewingDetailsEntry.offerItems.length > 0 && (
                                     <div className="mt-2 overflow-x-auto">
                                         <h4 className="font-medium mb-1">Teklif Kalemleri:</h4>
                                         <Table className="bg-background text-xs">
                                             <TableHeader>
                                                 <TableRow>
                                                     <TableHead className="py-1 px-2">Sıra No</TableHead>
                                                     <TableHead className="py-1 px-2">Mal ve Malzemenin Adı</TableHead>
                                                     <TableHead className="py-1 px-2">Miktar</TableHead>
                                                     <TableHead className="py-1 px-2">Birim Fiyatı</TableHead>
                                                     <TableHead className="py-1 px-2">Toplam (TL)</TableHead>
                                                 </TableRow>
                                             </TableHeader>
                                             <TableBody>
                                                 {viewingDetailsEntry.offerItems.map((item, index) => (
                                                     <TableRow key={item.id || index}>
                                                         <TableCell className="py-1 px-2">{index + 1}</TableCell>
                                                         <TableCell className="py-1 px-2">{item.itemName || '-'}</TableCell>
                                                         <TableCell className="py-1 px-2">{item.quantity || '-'}</TableCell>
                                                         <TableCell className="py-1 px-2">{formatCurrency(item.unitPrice)}</TableCell>
                                                         <TableCell className="py-1 px-2">{formatCurrency(item.totalPrice)}</TableCell>
                                                     </TableRow>
                                                 ))}
                                             </TableBody>
                                         </Table>
                                     </div>
                                 )}
                                 <div className="mt-2 pt-2 border-t">
                                     <p><strong className="font-medium">Teklif Durumu:</strong> {renderOfferAcceptanceStatus(viewingDetailsEntry.offerAcceptance)}</p>
                                 </div>
                             </div>
                         </details>

                        {/* Adım 6: Ara ve Son Kontrol Formu */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <FileCheck2 className="h-5 w-5 text-primary"/> Adım 6: Ara ve Son Kontrol Formu
                             </summary>
                              <div className="space-y-4 pt-3 text-sm">
                                  {/* Top Info */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <p><strong className="font-medium w-24 inline-block">Müşteri Adı</strong>: {viewingDetailsEntry.customerName || '-'}</p>
                                      <p><strong className="font-medium w-24 inline-block">Kontrol Tarihi</strong>: {formatDateSafe(viewingDetailsEntry.finalCheckDate, 'dd.MM.yyyy')}</p>
                                      <p><strong className="font-medium w-24 inline-block">Proje No</strong>: {viewingDetailsEntry.projectNo || '-'}</p>
                                      <p className="col-span-2"><strong className="font-medium w-24 inline-block">Plaka & Şasi</strong>: {`${viewingDetailsEntry.plateNumber || viewingDetailsEntry.plate || 'Plaka Yok'} / ${viewingDetailsEntry.chassisNumber || 'Şasi Yok'}`}</p>
                                      <p><strong className="font-medium w-24 inline-block">Şube Adı</strong>: {viewingDetailsEntry.branch || '-'}</p>
                                  </div>
                                   {/* Checklist */}
                                   <div className="border p-3 rounded-md space-y-2 bg-background/50">
                                     <div className="grid grid-cols-[1fr_80px_80px] items-center font-medium mb-1">
                                         <span className="font-semibold text-xs">Kontrol Edilecek Hususlar</span>
                                         <span className="text-center px-1 font-semibold text-xs">ARA (Olumlu)</span>
                                         <span className="text-center px-1 font-semibold text-xs">SON (Olumlu)</span>
                                     </div>
                                     {checklistItemsStep6.map((item) => (
                                         <div key={item.idBase} className="grid grid-cols-[1fr_80px_80px] items-center gap-x-2 py-2 border-t">
                                             <span className="text-xs">{item.label}</span>
                                             {/* ARA Checkbox Display */}
                                             {renderReadonlyCheckbox(viewingDetailsEntry[`${item.idBase}_ara` as keyof ArchiveEntry] as boolean | undefined)}
                                             {/* SON Checkbox Display */}
                                             {renderReadonlyCheckbox(viewingDetailsEntry[`${item.idBase}_son` as keyof ArchiveEntry] as boolean | undefined)}
                                         </div>
                                     ))}
                                  </div>
                                  {/* Approval */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                      <div className="md:col-start-2 space-y-1"> {/* Align to the right */}
                                          <h4 className="font-medium text-center text-xs mb-1">KONTROL EDEN</h4>
                                          <p><strong className="font-medium w-20 inline-block">Adı-Soyadı</strong>: {viewingDetailsEntry.finalControllerName || '-'}</p>
                                          <div className="h-10 border rounded-md bg-background flex items-center justify-center text-xs text-muted-foreground italic mt-1">(İmza Alanı)</div>
                                      </div>
                                  </div>
                              </div>
                         </details>

                        {/* Adım 7: Özet & Arşiv Bilgileri */}
                        <details className="border rounded p-2">
                            <summary className="cursor-pointer font-medium flex items-center gap-2">
                                <Archive className="h-5 w-5 text-primary"/> Adım 7: Özet Bilgileri
                            </summary>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                                 <div className="space-y-1">
                                    <p><strong className="font-medium w-36 inline-block">Sıra No</strong>: {viewingDetailsEntry.sequenceNo || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Şube Adı</strong>: {viewingDetailsEntry.branch || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Proje Adı</strong>: {viewingDetailsEntry.projectName || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Tip Onay</strong>: {viewingDetailsEntry.typeApprovalType || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Tip Onay Seviye</strong>: {viewingDetailsEntry.typeApprovalLevel || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Varyant</strong>: {viewingDetailsEntry.typeAndVariant || '-'}</p>
                                    <p><strong className="font-medium w-36 inline-block">Versiyon</strong>: {viewingDetailsEntry.typeApprovalVersion || viewingDetailsEntry.versiyon || '-'}</p>
                                 </div>
                                  <div className="space-y-1">
                                     <p><strong className="font-medium w-36 inline-block">Tip Onay No</strong>: {viewingDetailsEntry.typeApprovalNumber || '-'}</p>
                                     {/* Tip Onay Belgesi Link */}
                                     <div className="flex items-start">
                                        <strong className="font-medium w-36 inline-block shrink-0">Tip Onay Belgesi</strong>:
                                        {viewingDetailsEntry.typeApprovalDocument ? (
                                            <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-primary hover:underline text-left leading-tight" onClick={() => openMediaPreview(viewingDetailsEntry.typeApprovalDocument)}>
                                                <Eye className="inline h-4 w-4 mr-1"/> {getFileName(viewingDetailsEntry.typeApprovalDocument)}
                                            </Button>
                                        ) : <span className="italic text-muted-foreground ml-1">Yok</span>}
                                     </div>
                                     <p><strong className="font-medium w-36 inline-block">Tarih</strong>: {formatDateSafe(viewingDetailsEntry.formDate || viewingDetailsEntry.workOrderDate || viewingDetailsEntry.finalCheckDate, 'dd.MM.yyyy')}</p>
                                     <p><strong className="font-medium w-36 inline-block">Şasi No</strong>: {viewingDetailsEntry.chassisNumber || '-'}</p>
                                     <p><strong className="font-medium w-36 inline-block">Motor No</strong>: {viewingDetailsEntry.engineNumber || '-'}</p>
                                     <p><strong className="font-medium w-36 inline-block">Plaka</strong>: {viewingDetailsEntry.plateNumber || viewingDetailsEntry.plate || '-'}</p>
                                     <p><strong className="font-medium w-36 inline-block">Müşteri Adı</strong>: {viewingDetailsEntry.customerName || '-'}</p>
                                     <p><strong className="font-medium w-36 inline-block">Yapılacak İşler</strong>: {viewingDetailsEntry.detailsOfWork || '-'}</p>
                                     <p><strong className="font-medium w-36 inline-block">Proje No</strong>: {viewingDetailsEntry.projectNo || '-'}</p>
                                 </div>
                              </div>
                        </details>

                        {/* Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 border-t pt-3 mt-3 text-sm">
                           <p><strong className="font-medium">Arşivlenme Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.archivedAt)}</p>
                           <p><strong className="font-medium">Dosya Adı:</strong> {viewingDetailsEntry.fileName}</p>
                        </div>

                    </div>
                   <AlertDialogFooter className="mt-4">
                       <AlertDialogCancel onClick={() => setViewingDetailsEntry(null)}>Kapat</AlertDialogCancel>
                   </AlertDialogFooter>
               </AlertDialogContent>
           </AlertDialog>
       )}

        {/* Media Preview Dialog */}
        {previewMedia && (
             <Dialog open={!!previewMedia} onOpenChange={(open) => {
                 if (!open && previewMedia.url.startsWith('blob:')) {
                     // Revoke temporary blob URL when dialog closes
                     URL.revokeObjectURL(previewMedia.url);
                     console.log("Revoked preview URL:", previewMedia.url);
                 }
                 setPreviewMedia(null);
             }}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="truncate">{previewMedia.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black">
                        {previewMedia.type === 'image' ? (
                            <Image
                                src={previewMedia.url}
                                alt={`Önizleme - ${previewMedia.name}`}
                                width={1200} // Adjust width as needed
                                height={800} // Adjust height as needed
                                style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                                unoptimized // If using external/placeholder URLs or blob URLs
                                data-ai-hint="archived document image"
                                onError={(e) => { console.error("Error loading image preview:", previewMedia.url, e); toast({title: "Hata", description:"Resim yüklenemedi.", variant:"destructive"})}}
                            />
                        ) : (
                            <video controls className="max-w-full max-h-full" autoPlay>
                                <source src={previewMedia.url} type={previewMedia.name.endsWith('.mp4') ? 'video/mp4' : previewMedia.name.endsWith('.webm') ? 'video/webm' : 'video/ogg'} />
                                Tarayıcınız video etiketini desteklemiyor.
                            </video>
                        )}
                    </div>
                     <DialogClose asChild>
                        <Button type="button" variant="outline" className="mt-4">Kapat</Button>
                     </DialogClose>
                </DialogContent>
            </Dialog>
        )}

    </div>
  );
}
