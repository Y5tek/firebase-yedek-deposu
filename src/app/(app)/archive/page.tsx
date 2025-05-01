
'use client';

import * as React from 'react';
import Image from 'next/image'; // Import Image component
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAppState, OfferItem, RecordData, ArchiveEntry } from '@/hooks/use-app-state'; // Import OfferItem, RecordData, ArchiveEntry
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, Search, FolderOpen, Trash2, Pencil, FileText, Camera, Video, Check, X, Info, Download } from 'lucide-react'; // Added Check, X, Info, Download icons
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
import { useToast } from '@/hooks/use-toast';
import { getSerializableFileInfo } from '@/lib/utils'; // Import helper

// ArchiveEntry type is now imported from use-app-state

export default function ArchivePage() {
  const { recordData, updateRecordData } = useAppState();
  const { toast } = useToast();
  const router = useRouter(); // Initialize router
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewingDetailsEntry, setViewingDetailsEntry] = React.useState<ArchiveEntry | null>(null); // State for viewing details

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
         entry.offerCompanyName?.toLowerCase().includes(lowerSearchTerm) || // Search Step 6 company
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
     console.log("Getting file name for:", fileInfo); // Log file info retrieval
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
       if (status === 'olumlu') return <Check className="h-4 w-4 text-green-600" />;
       if (status === 'olumsuz') return <X className="h-4 w-4 text-red-600" />;
       return <span className="text-muted-foreground">-</span>;
   };

    // Helper to display boolean checklist status (from Step 6)
   const renderBooleanChecklistStatus = (status: boolean | undefined) => {
       if (status === true) return <Check className="h-4 w-4 text-green-600" />;
       if (status === false) return <X className="h-4 w-4 text-red-600" />; // Assuming false means olumsuz
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

    // Placeholder function to generate a "download link" (replace with actual logic)
    // In a real application, this would fetch the actual file from storage (e.g., Firebase)
    // For now, it returns a placeholder to indicate the file exists.
    const getDownloadLink = (fileInfo: { name: string; type?: string; size?: number } | undefined): string | null => {
        if (!fileInfo || !fileInfo.name) return null;
        // In a real app, this might fetch a temporary download URL from Firebase Storage
        console.warn("Placeholder: Cannot generate real download link for:", fileInfo.name, "from local state.");
        // Return a non-functional placeholder or null
        return `#${encodeURIComponent(fileInfo.name)}`; // Indicates presence but doesn't download
        // return null; // Or return null if you don't want a link at all
    };


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
                                        {/* Show customer from step 4 or company from step 6 */}
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
                                            <Info className="h-4 w-4" /> {/* Changed to Info icon */}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} title="Düzenle">
                                            <Pencil className="h-4 w-4 text-blue-600" /> {/* Edit Icon */}
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
                 ) : null // Render nothing if group is empty or doesn't exist
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
       {viewingDetailsEntry && (
           <AlertDialog open={!!viewingDetailsEntry} onOpenChange={() => setViewingDetailsEntry(null)}>
               <AlertDialogContent className="max-w-4xl"> {/* Increased width */}
                   <AlertDialogHeader>
                       <AlertDialogTitle>Kayıt Detayları: {viewingDetailsEntry.fileName}</AlertDialogTitle>
                       <AlertDialogDescription>
                           Bu kaydın arşivlenmiş tüm verilerini aşağıda görebilirsiniz.
                       </AlertDialogDescription>
                   </AlertDialogHeader>
                    {/* Display Archived Data - Using details for sections */}
                     <div className="mt-4 max-h-[70vh] overflow-auto rounded-md border p-4 bg-secondary/30 text-sm space-y-4">
                         {/* Basic Vehicle Info */}
                         <details className="border rounded p-2" open>
                            <summary className="cursor-pointer font-medium">Araç Temel Bilgileri (Adım 1-2)</summary>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                                <p><strong className="font-medium">Şube:</strong> {viewingDetailsEntry.branch || '-'}</p>
                                <p><strong className="font-medium">Şasi No:</strong> {viewingDetailsEntry.chassisNumber || '-'}</p>
                                <p><strong className="font-medium">Plaka (Ruhsat):</strong> {viewingDetailsEntry.plateNumber || '-'}</p>
                                <p><strong className="font-medium">Marka:</strong> {viewingDetailsEntry.brand || '-'}</p>
                                <p><strong className="font-medium">Tip:</strong> {viewingDetailsEntry.type || '-'}</p>
                                <p><strong className="font-medium">Ticari Adı:</strong> {viewingDetailsEntry.tradeName || '-'}</p>
                                <p><strong className="font-medium">Sahip (Adı Soyadı):</strong> {viewingDetailsEntry.owner || '-'}</p>
                                <p><strong className="font-medium">Tip Onay No:</strong> {viewingDetailsEntry.typeApprovalNumber || '-'}</p>
                                <p><strong className="font-medium">Varyant:</strong> {viewingDetailsEntry.typeAndVariant || '-'}</p>
                                <p><strong className="font-medium">Versiyon:</strong> {viewingDetailsEntry.versiyon || '-'}</p>
                                <p><strong className="font-medium">Motor No:</strong> {viewingDetailsEntry.engineNumber || '-'}</p>
                            </div>
                         </details>

                          {/* File Info */}
                        <details className="border rounded p-2">
                           <summary className="cursor-pointer font-medium">Yüklenen Dosyalar (Adım 3)</summary>
                           <ul className="list-none space-y-1 pt-2">
                                <li>
                                    <strong className="font-medium">Ruhsat:</strong>
                                    {viewingDetailsEntry.registrationDocument ? (
                                        <span className="ml-2 text-muted-foreground">
                                             {getFileName(viewingDetailsEntry.registrationDocument)}
                                             <Button variant="link" size="sm" className="h-auto p-0 ml-2" disabled>
                                                 <Download className="inline h-3 w-3 mr-1" /> İndir (Yakında)
                                             </Button>
                                        </span>
                                    ) : ' Yok'}
                                </li>
                                <li>
                                    <strong className="font-medium">Etiket:</strong>
                                    {viewingDetailsEntry.labelDocument ? (
                                         <span className="ml-2 text-muted-foreground">
                                             {getFileName(viewingDetailsEntry.labelDocument)}
                                             <Button variant="link" size="sm" className="h-auto p-0 ml-2" disabled>
                                                 <Download className="inline h-3 w-3 mr-1" /> İndir (Yakında)
                                             </Button>
                                        </span>
                                    ) : ' Yok'}
                                </li>
                                <li>
                                    <strong className="font-medium">Tip Onay Belgesi:</strong>
                                    {viewingDetailsEntry.typeApprovalDocument ? (
                                         <span className="ml-2 text-muted-foreground">
                                            {getFileName(viewingDetailsEntry.typeApprovalDocument)}
                                             <Button variant="link" size="sm" className="h-auto p-0 ml-2" disabled>
                                                 <Download className="inline h-3 w-3 mr-1" /> İndir (Yakında)
                                             </Button>
                                        </span>
                                    ) : ' Yok'}
                                </li>
                                <li>
                                    <strong className="font-medium">Ek Fotoğraflar ({viewingDetailsEntry.additionalPhotos?.length || 0}):</strong>
                                    {viewingDetailsEntry.additionalPhotos && viewingDetailsEntry.additionalPhotos.length > 0 ? (
                                        <ul className="list-disc list-inside ml-4">
                                            {viewingDetailsEntry.additionalPhotos.map((f, i) => (
                                                <li key={i}>
                                                    <span className="ml-1 text-muted-foreground">
                                                        {f.name}
                                                        <Button variant="link" size="sm" className="h-auto p-0 ml-2" disabled>
                                                            <Download className="inline h-3 w-3 mr-1" /> İndir (Yakında)
                                                        </Button>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : ' Yok'}
                                </li>
                                <li>
                                    <strong className="font-medium">Ek Videolar ({viewingDetailsEntry.additionalVideos?.length || 0}):</strong>
                                    {viewingDetailsEntry.additionalVideos && viewingDetailsEntry.additionalVideos.length > 0 ? (
                                        <ul className="list-disc list-inside ml-4">
                                            {viewingDetailsEntry.additionalVideos.map((f, i) => (
                                                <li key={i}>
                                                    <span className="ml-1 text-muted-foreground">
                                                        {f.name}
                                                         <Button variant="link" size="sm" className="h-auto p-0 ml-2" disabled>
                                                             <Download className="inline h-3 w-3 mr-1" /> İndir (Yakında)
                                                         </Button>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : ' Yok'}
                                </li>
                           </ul>
                        </details>


                         {/* Seri Tadilat Uygunluk Form Data */}
                         <details className="border rounded p-2">
                           <summary className="cursor-pointer font-medium">Seri Tadilat Uygunluk Formu (Adım 4)</summary>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                              <p><strong className="font-medium">Müşteri Adı:</strong> {viewingDetailsEntry.customerName || '-'}</p>
                              <p><strong className="font-medium">Form Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.formDate, 'dd.MM.yyyy')}</p>
                              <p><strong className="font-medium">Sıra No:</strong> {viewingDetailsEntry.sequenceNo || '-'}</p>
                              <p><strong className="font-medium">1. Tadilat Uygun mu?:</strong> {renderChecklistStatus(viewingDetailsEntry.q1_suitable)}</p>
                              <p><strong className="font-medium">2. Tip Onay Tutuyor mu?:</strong> {renderChecklistStatus(viewingDetailsEntry.q2_typeApprovalMatch)}</p>
                              <p><strong className="font-medium">3. Kapsam Gen. Uygun mu?:</strong> {renderChecklistStatus(viewingDetailsEntry.q3_scopeExpansion)}</p>
                              <p><strong className="font-medium">4. Diğer Kusur Var mı?:</strong> {renderChecklistStatus(viewingDetailsEntry.q4_unaffectedPartsDefect)}</p>
                              <p className="col-span-2"><strong className="font-medium">Kontrol Eden:</strong> {viewingDetailsEntry.controllerName || '-'}</p>
                              <p className="col-span-2"><strong className="font-medium">Yetkili:</strong> {viewingDetailsEntry.authorityName || '-'}</p>
                              <p className="col-span-2"><strong className="font-medium">Notlar:</strong> {viewingDetailsEntry.notes || '-'}</p>
                           </div>
                        </details>

                         {/* Teklif Formu Data */}
                         <details className="border rounded p-2">
                            <summary className="cursor-pointer font-medium">Teklif Formu (Adım 5)</summary>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                <p><strong className="font-medium">Yetkili Adı:</strong> {viewingDetailsEntry.offerAuthorizedName || '-'}</p>
                                <p><strong className="font-medium">Firma Adı:</strong> {viewingDetailsEntry.offerCompanyName || '-'}</p>
                                <p className="col-span-2"><strong className="font-medium">Açık Adres:</strong> {viewingDetailsEntry.offerCompanyAddress || '-'}</p>
                                <p><strong className="font-medium">Vergi D./No:</strong> {viewingDetailsEntry.offerTaxOfficeAndNumber || '-'}</p>
                                <p><strong className="font-medium">Telefon:</strong> {viewingDetailsEntry.offerPhoneNumber || '-'}</p>
                                <p><strong className="font-medium">E-posta:</strong> {viewingDetailsEntry.offerEmailAddress || '-'}</p>
                                <p><strong className="font-medium">Teklif Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.offerDate, 'dd.MM.yyyy')}</p>
                                <p><strong className="font-medium">İş Emri No:</strong> {viewingDetailsEntry.workOrderNumber || '-'}</p>
                                <p><strong className="font-medium">Proje No:</strong> {viewingDetailsEntry.projectNo || '-'}</p>
                                <p><strong className="font-medium">Plaka (Teklif):</strong> {viewingDetailsEntry.plate || '-'}</p>
                                <p><strong className="font-medium">İş Emri Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.workOrderDate, 'dd.MM.yyyy')}</p>
                                <p><strong className="font-medium">İşin Bitiş Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.completionDate, 'dd.MM.yyyy')}</p>
                                <p className="col-span-2"><strong className="font-medium">Yapılacak İşler:</strong> {viewingDetailsEntry.detailsOfWork || '-'}</p>
                                <p className="col-span-2"><strong className="font-medium">Yedek Parçalar:</strong> {viewingDetailsEntry.sparePartsUsed || '-'}</p>
                                <p className="col-span-2"><strong className="font-medium">Ücretlendirme:</strong> {viewingDetailsEntry.pricing || '-'}</p>
                                <p><strong className="font-medium">Araç Kabul (İmza):</strong> {viewingDetailsEntry.vehicleAcceptanceSignature || '-'}</p>
                                <p><strong className="font-medium">Müşteri (İmza):</strong> {viewingDetailsEntry.customerSignature || '-'}</p>
                                <p className="col-span-2"><strong className="font-medium">Teklif Durumu:</strong> {renderOfferAcceptanceStatus(viewingDetailsEntry.offerAcceptance)}</p>
                            </div>
                             {/* Offer Items Table */}
                              {viewingDetailsEntry.offerItems && viewingDetailsEntry.offerItems.length > 0 && (
                                <div className="mt-4 overflow-x-auto">
                                    <Table className="bg-background">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Sıra No</TableHead>
                                                <TableHead>Mal ve Malzemenin Adı</TableHead>
                                                <TableHead>Miktar</TableHead>
                                                <TableHead>Birim Fiyatı</TableHead>
                                                <TableHead>Toplam (TL)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingDetailsEntry.offerItems.map((item, index) => (
                                                <TableRow key={item.id || index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{item.itemName || '-'}</TableCell>
                                                    <TableCell>{item.quantity || '-'}</TableCell>
                                                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                                    <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                              )}
                         </details>

                        {/* Ara ve Son Kontrol Formu Data */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium">Ara ve Son Kontrol Formu (Adım 6)</summary>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                 <p><strong className="font-medium">Son Kontrol Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.finalCheckDate, 'dd.MM.yyyy')}</p>
                                 <p><strong className="font-medium">Kontrol Eden:</strong> {viewingDetailsEntry.finalControllerName || '-'}</p>
                                 <p><strong className="font-medium">1. Açıkta Aksam (Ara):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check1_exposedParts_ara)}</p>
                                 <p><strong className="font-medium">1. Açıkta Aksam (Son):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check1_exposedParts_son)}</p>
                                 <p><strong className="font-medium">2. Isofix/Koltuk Bağl. (Ara):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check2_isofixSeat_ara)}</p>
                                 <p><strong className="font-medium">2. Isofix/Koltuk Bağl. (Son):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check2_isofixSeat_son)}</p>
                                 <p><strong className="font-medium">3. Emniyet Kemeri (Ara):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check3_seatBelts_ara)}</p>
                                 <p><strong className="font-medium">3. Emniyet Kemeri (Son):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check3_seatBelts_son)}</p>
                                 <p><strong className="font-medium">4. Cam Onayları (Ara):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check4_windowApprovals_ara)}</p>
                                 <p><strong className="font-medium">4. Cam Onayları (Son):</strong> {renderBooleanChecklistStatus(viewingDetailsEntry.check4_windowApprovals_son)}</p>
                             </div>
                         </details>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2 mt-2">
                           <p><strong className="font-medium">Arşivlenme Tarihi:</strong> {formatDateSafe(viewingDetailsEntry.archivedAt)}</p>
                           <p><strong className="font-medium">Dosya Adı:</strong> {viewingDetailsEntry.fileName}</p>
                        </div>

                         {/* Optional: Display legacy fields if they exist */}
                          {(viewingDetailsEntry.additionalNotes || viewingDetailsEntry.inspectionDate || viewingDetailsEntry.inspectorName) && (
                             <details className="border rounded p-2">
                                <summary className="cursor-pointer font-medium text-muted-foreground">Eski Veriler (Opsiyonel)</summary>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                    {viewingDetailsEntry.inspectionDate && <p><strong className="font-medium">Muayene Tarihi (Eski):</strong> {formatDateSafe(viewingDetailsEntry.inspectionDate, 'dd.MM.yyyy')}</p>}
                                    {viewingDetailsEntry.inspectorName && <p><strong className="font-medium">Muayene Yapan (Eski):</strong> {viewingDetailsEntry.inspectorName}</p>}
                                    {viewingDetailsEntry.additionalNotes && <p className="col-span-2"><strong className="font-medium">Ek Notlar (Eski):</strong> {viewingDetailsEntry.additionalNotes}</p>}
                                </div>
                            </details>
                          )}

                    </div>
                   <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setViewingDetailsEntry(null)}>Kapat</AlertDialogCancel>
                       {/* <AlertDialogAction disabled>Değişiklikleri Kaydet (Yakında)</AlertDialogAction> */}
                   </AlertDialogFooter>
               </AlertDialogContent>
           </AlertDialog>
       )}
    </div>
  );
}
