
'use client';

import * as React from 'react';
import Image from 'next/image'; // Import Image component
import { useAppState, OfferItem } from '@/hooks/use-app-state'; // Import OfferItem
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, Search, FolderOpen, Trash2, Pencil, FileText, Camera, Video, Check, X, Info } from 'lucide-react'; // Added Check, X, Info icons
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

// Update ArchiveEntry to include all fields from RecordData + metadata
interface ArchiveEntry {
  branch: string;
  // Step 1 & 2
  chassisNumber?: string;
  brand?: string;
  type?: string;
  tradeName?: string;
  owner?: string;
  typeApprovalNumber?: string;
  typeAndVariant?: string;
  plateNumber?: string; // Added plateNumber
  // Step 3 (File Info)
  registrationDocument?: { name: string; type?: string; size?: number };
  labelDocument?: { name: string; type?: string; size?: number };
  additionalPhotos?: { name: string; type?: string; size?: number }[];
  additionalVideos?: { name: string; type?: string; size?: number }[];
  // Step 4 Form (Seri Tadilat Uygunluk)
  customerName?: string;
  formDate?: string; // ISO String
  sequenceNo?: string;
  q1_suitable?: 'olumlu' | 'olumsuz';
  q2_typeApprovalMatch?: 'olumlu' | 'olumsuz';
  q3_scopeExpansion?: 'olumlu' | 'olumsuz';
  q4_unaffectedPartsDefect?: 'olumlu' | 'olumsuz';
  notes?: string; // Step 4 notes
  controllerName?: string;
  authorityName?: string;
  // Step 5 Form (İş Emri)
  projectName?: string;
  workOrderNumber?: string;
  plate?: string; // Duplicate plate?
  workOrderDate?: string; // ISO String
  completionDate?: string; // ISO String
  detailsOfWork?: string;
  sparePartsUsed?: string;
  pricing?: string;
  vehicleAcceptanceSignature?: string; // Signature placeholder/name
  customerSignature?: string; // Signature placeholder/name
  projectNo?: string; // Added from İş Emri

  // Step 6 Form (Teklif)
  offerAuthorizedName?: string;
  offerCompanyName?: string;
  offerCompanyAddress?: string;
  offerTaxOfficeAndNumber?: string;
  offerPhoneNumber?: string;
  offerEmailAddress?: string;
  offerDate?: string; // ISO String
  offerItems?: OfferItem[];
  offerAcceptance?: 'accepted' | 'rejected';
  // Metadata
  archivedAt: string; // ISO string format
  fileName: string;

   // Keep legacy fields if they exist in older archive data
   additionalNotes?: string;
   inspectionDate?: string;
   inspectorName?: string;
}

export default function ArchivePage() {
  const { recordData, updateRecordData } = useAppState();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingEntry, setEditingEntry] = React.useState<ArchiveEntry | null>(null); // State for editing

  // Use recordData.archive or default to empty array
  const archive: ArchiveEntry[] = recordData.archive || [];

  const filteredArchive = archive.filter((entry: ArchiveEntry) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      entry.fileName?.toLowerCase().includes(lowerSearchTerm) ||
      entry.chassisNumber?.toLowerCase().includes(lowerSearchTerm) ||
      entry.brand?.toLowerCase().includes(lowerSearchTerm) ||
      entry.owner?.toLowerCase().includes(lowerSearchTerm) ||
      entry.branch?.toLowerCase().includes(lowerSearchTerm) ||
      entry.customerName?.toLowerCase().includes(lowerSearchTerm) || // Search Step 4 customer
      entry.offerCompanyName?.toLowerCase().includes(lowerSearchTerm) || // Search Step 6 company
      entry.plateNumber?.toLowerCase().includes(lowerSearchTerm) || // Search plateNumber (more common)
      entry.plate?.toLowerCase().includes(lowerSearchTerm) // Search plate (from iş emri)
    );
  });

  const groupedArchive = filteredArchive.reduce((acc, entry) => {
    try {
        // Ensure archivedAt exists and is a valid string before parsing
         if (!entry.archivedAt || typeof entry.archivedAt !== 'string') {
            console.warn("Skipping entry due to invalid or missing archivedAt date:", entry);
            return acc; // Skip this entry if the date is invalid
         }
        const date = parseISO(entry.archivedAt);
        const year = getYear(date);
        const month = getMonth(date); // 0-indexed month
        const monthName = format(date, 'LLLL', { locale: tr }); // Full month name in Turkish
        const key = `${year}-${monthName}`;

        if (!acc[key]) {
        acc[key] = [];
        }
        acc[key].push(entry);
        // Sort entries within the month by date, newest first
        acc[key].sort((a, b) => {
             // Handle potentially missing archivedAt during sorting
             const timeA = a.archivedAt ? parseISO(a.archivedAt).getTime() : 0;
             const timeB = b.archivedAt ? parseISO(b.archivedAt).getTime() : 0;
             return timeB - timeA;
         });

        return acc;
      } catch (error) {
         console.error("Error processing date for entry:", entry, error);
         // Group entries with errors under "Hatalı Kayıtlar" or similar
         const errorKey = "Hatalı Kayıtlar";
         if (!acc[errorKey]) {
             acc[errorKey] = [];
         }
         acc[errorKey].push(entry);
         return acc;
     }
  }, {} as { [key: string]: ArchiveEntry[] });

   // Sort group keys (year-month) chronologically, newest first
  const sortedGroupKeys = Object.keys(groupedArchive).sort((a, b) => {
      if (a === "Hatalı Kayıtlar") return 1; // Put errors last
      if (b === "Hatalı Kayıtlar") return -1;

      // Assuming format YYYY-MonthName (Turkish)
      const [yearAStr, monthNameA] = a.split('-');
      const [yearBStr, monthNameB] = b.split('-');

      const yearA = parseInt(yearAStr);
      const yearB = parseInt(yearBStr);

      if (yearA !== yearB) {
          return yearB - yearA; // Sort years descending
      }

      // Convert month names back to numbers for comparison
       const monthOrder = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
       const monthIndexA = monthOrder.indexOf(monthNameA);
       const monthIndexB = monthOrder.indexOf(monthNameB);

       // Handle cases where month name might be invalid (shouldn't happen often with current logic)
        if (monthIndexA === -1) return 1;
        if (monthIndexB === -1) return -1;

       return monthIndexB - monthIndexA; // Sort months descending within the year
  });

  const handleDelete = (fileNameToDelete: string) => {
     const updatedArchive = archive.filter((entry: ArchiveEntry) => entry.fileName !== fileNameToDelete);
     updateRecordData({ archive: updatedArchive });
     toast({
        title: "Kayıt Silindi",
        description: `${fileNameToDelete} başarıyla silindi.`,
        variant: "destructive"
     });
  };

   const handleEdit = (entry: ArchiveEntry) => {
       setEditingEntry(entry); // Set the entry to be edited
        toast({
            title: "Detay Görüntüleme", // Changed title
            description: `${entry.fileName} için detaylar gösteriliyor. Düzenleme özelliği henüz aktif değil.`,
            variant: "default" // Use default variant
        });
       // Future: Navigate to a pre-filled form
       // router.push(`/edit-record/${encodeURIComponent(entry.fileName)}`);
   };

   // Helper to get file name (since we store info)
   const getFileName = (fileInfo: { name: string } | undefined): string => {
     return fileInfo?.name || 'Yok';
   };

   // Helper to format date safely
   const formatDateSafe = (dateString: string | undefined, formatStr: string = 'dd MMMM yyyy HH:mm'): string => {
       if (!dateString) return '-';
       try {
           return format(parseISO(dateString), formatStr, { locale: tr });
       } catch (error) {
           return 'Geçersiz Tarih';
       }
   };

   // Helper to display checklist status
   const renderChecklistStatus = (status: 'olumlu' | 'olumsuz' | undefined) => {
       if (status === 'olumlu') return <Check className="h-4 w-4 text-green-600" />;
       if (status === 'olumsuz') return <X className="h-4 w-4 text-red-600" />;
       return <span className="text-muted-foreground">-</span>;
   };

   // Helper to display Offer Acceptance status
    const renderOfferAcceptanceStatus = (status: 'accepted' | 'rejected' | undefined) => {
        if (status === 'accepted') return <span className="text-green-600 font-medium">Kabul Edildi</span>;
        if (status === 'rejected') return <span className="text-red-600 font-medium">Reddedildi</span>;
        return <span className="text-muted-foreground">-</span>;
    };

   // Helper to format currency
    const formatCurrency = (value: number | undefined): string => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
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
                                <TableHead>Müşteri/Firma</TableHead> {/* Combined customer/company */}
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
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} title="Detayları Gör">
                                        <Info className="h-4 w-4" /> {/* Changed to Info icon */}
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
       {editingEntry && (
           <AlertDialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
               <AlertDialogContent className="max-w-4xl"> {/* Increased width further */}
                   <AlertDialogHeader>
                       <AlertDialogTitle>Kayıt Detayları: {editingEntry.fileName}</AlertDialogTitle>
                       <AlertDialogDescription>
                           Bu kaydın arşivlenmiş tüm verilerini aşağıda görebilirsiniz. Düzenleme özelliği henüz aktif değildir.
                       </AlertDialogDescription>
                   </AlertDialogHeader>
                    {/* Display Archived Data - Using details for sections */}
                     <div className="mt-4 max-h-[70vh] overflow-auto rounded-md border p-4 bg-secondary/30 text-sm space-y-4">
                         {/* Basic Vehicle Info */}
                         <details className="border rounded p-2" open>
                            <summary className="cursor-pointer font-medium">Araç Temel Bilgileri (Adım 1-2)</summary>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                                <p><strong className="font-medium">Şube:</strong> {editingEntry.branch}</p>
                                <p><strong className="font-medium">Şasi No:</strong> {editingEntry.chassisNumber || '-'}</p>
                                <p><strong className="font-medium">Plaka:</strong> {editingEntry.plateNumber || editingEntry.plate || '-'}</p>
                                <p><strong className="font-medium">Marka:</strong> {editingEntry.brand || '-'}</p>
                                <p><strong className="font-medium">Tip:</strong> {editingEntry.type || '-'}</p>
                                <p><strong className="font-medium">Ticari Adı:</strong> {editingEntry.tradeName || '-'}</p>
                                <p><strong className="font-medium">Sahip:</strong> {editingEntry.owner || '-'}</p>
                                <p><strong className="font-medium">Tip Onay No:</strong> {editingEntry.typeApprovalNumber || '-'}</p>
                                <p><strong className="font-medium">Tip/Varyant:</strong> {editingEntry.typeAndVariant || '-'}</p>
                            </div>
                         </details>

                          {/* File Info */}
                        <details className="border rounded p-2">
                           <summary className="cursor-pointer font-medium">Yüklenen Dosyalar (Adım 3)</summary>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                               <p><strong className="font-medium">Ruhsat:</strong> {getFileName(editingEntry.registrationDocument)}</p>
                               <p><strong className="font-medium">Etiket:</strong> {getFileName(editingEntry.labelDocument)}</p>
                               <p><strong className="font-medium">Ek Fotoğraflar ({editingEntry.additionalPhotos?.length || 0}):</strong> {editingEntry.additionalPhotos?.map(f => f.name).join(', ') || 'Yok'}</p>
                               <p><strong className="font-medium">Ek Videolar ({editingEntry.additionalVideos?.length || 0}):</strong> {editingEntry.additionalVideos?.map(f => f.name).join(', ') || 'Yok'}</p>
                           </div>
                        </details>

                         {/* Seri Tadilat Uygunluk Form Data */}
                         <details className="border rounded p-2">
                           <summary className="cursor-pointer font-medium">Seri Tadilat Uygunluk Formu (Adım 4)</summary>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                              <p><strong className="font-medium">Müşteri Adı:</strong> {editingEntry.customerName || '-'}</p>
                              <p><strong className="font-medium">Form Tarihi:</strong> {formatDateSafe(editingEntry.formDate, 'dd.MM.yyyy')}</p>
                              <p><strong className="font-medium">Sıra No:</strong> {editingEntry.sequenceNo || '-'}</p>
                              <p><strong className="font-medium">Tadilat Uygun mu?:</strong> {renderChecklistStatus(editingEntry.q1_suitable)}</p>
                              <p><strong className="font-medium">Tip Onay Uygun mu?:</strong> {renderChecklistStatus(editingEntry.q2_typeApprovalMatch)}</p>
                              <p><strong className="font-medium">Kapsam Gen. Uygun mu?:</strong> {renderChecklistStatus(editingEntry.q3_scopeExpansion)}</p>
                              <p><strong className="font-medium">Diğer Kusur Var mı?:</strong> {renderChecklistStatus(editingEntry.q4_unaffectedPartsDefect)}</p>
                              <p className="col-span-2"><strong className="font-medium">Kontrol Eden:</strong> {editingEntry.controllerName || '-'}</p>
                              <p className="col-span-2"><strong className="font-medium">Yetkili:</strong> {editingEntry.authorityName || '-'}</p>
                              <p className="col-span-2"><strong className="font-medium">Notlar:</strong> {editingEntry.notes || '-'}</p>
                           </div>
                        </details>

                         {/* İş Emri Formu Data */}
                         <details className="border rounded p-2">
                             <summary className="cursor-pointer font-medium">İş Emri Formu (Adım 5)</summary>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                 <p><strong className="font-medium">Proje Adı:</strong> {editingEntry.projectName || '-'}</p>
                                 <p><strong className="font-medium">İş Emri No:</strong> {editingEntry.workOrderNumber || '-'}</p>
                                 <p><strong className="font-medium">İş Emri Tarihi:</strong> {formatDateSafe(editingEntry.workOrderDate, 'dd.MM.yyyy')}</p>
                                 <p><strong className="font-medium">İşin Bitiş Tarihi:</strong> {formatDateSafe(editingEntry.completionDate, 'dd.MM.yyyy')}</p>
                                 <p className="col-span-2"><strong className="font-medium">Yapılacak İşler:</strong> {editingEntry.detailsOfWork || '-'}</p>
                                 <p className="col-span-2"><strong className="font-medium">Kullanılan Yedek Parçalar:</strong> {editingEntry.sparePartsUsed || '-'}</p>
                                 <p className="col-span-2"><strong className="font-medium">Ücretlendirme:</strong> {editingEntry.pricing || '-'}</p>
                                 <p><strong className="font-medium">Araç Kabul (İmza):</strong> {editingEntry.vehicleAcceptanceSignature || '-'}</p>
                                 <p><strong className="font-medium">Müşteri (İmza):</strong> {editingEntry.customerSignature || '-'}</p>
                             </div>
                         </details>

                         {/* Teklif Formu Data */}
                         <details className="border rounded p-2">
                            <summary className="cursor-pointer font-medium">Teklif Formu (Adım 6)</summary>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                <p><strong className="font-medium">Yetkili Adı:</strong> {editingEntry.offerAuthorizedName || '-'}</p>
                                <p><strong className="font-medium">Firma Adı:</strong> {editingEntry.offerCompanyName || '-'}</p>
                                <p className="col-span-2"><strong className="font-medium">Açık Adres:</strong> {editingEntry.offerCompanyAddress || '-'}</p>
                                <p><strong className="font-medium">Vergi D./No:</strong> {editingEntry.offerTaxOfficeAndNumber || '-'}</p>
                                <p><strong className="font-medium">Telefon:</strong> {editingEntry.offerPhoneNumber || '-'}</p>
                                <p><strong className="font-medium">E-posta:</strong> {editingEntry.offerEmailAddress || '-'}</p>
                                <p><strong className="font-medium">Teklif Tarihi:</strong> {formatDateSafe(editingEntry.offerDate, 'dd.MM.yyyy')}</p>
                                <p className="col-span-2"><strong className="font-medium">Teklif Durumu:</strong> {renderOfferAcceptanceStatus(editingEntry.offerAcceptance)}</p>
                            </div>
                             {/* Offer Items Table */}
                              {editingEntry.offerItems && editingEntry.offerItems.length > 0 && (
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
                                            {editingEntry.offerItems.map((item, index) => (
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


                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2 mt-2">
                           <p><strong className="font-medium">Arşivlenme Tarihi:</strong> {formatDateSafe(editingEntry.archivedAt)}</p>
                           <p><strong className="font-medium">Dosya Adı:</strong> {editingEntry.fileName}</p>
                        </div>

                         {/* Optional: Display legacy fields if they exist */}
                          {(editingEntry.additionalNotes || editingEntry.inspectionDate || editingEntry.inspectorName) && (
                             <details className="border rounded p-2">
                                <summary className="cursor-pointer font-medium text-muted-foreground">Eski Veriler (Opsiyonel)</summary>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                    {editingEntry.inspectionDate && <p><strong className="font-medium">Muayene Tarihi (Eski):</strong> {formatDateSafe(editingEntry.inspectionDate, 'dd.MM.yyyy')}</p>}
                                    {editingEntry.inspectorName && <p><strong className="font-medium">Muayene Yapan (Eski):</strong> {editingEntry.inspectorName}</p>}
                                    {editingEntry.additionalNotes && <p className="col-span-2"><strong className="font-medium">Ek Notlar (Eski):</strong> {editingEntry.additionalNotes}</p>}
                                </div>
                            </details>
                          )}

                    </div>
                   <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setEditingEntry(null)}>Kapat</AlertDialogCancel>
                       {/* <AlertDialogAction disabled>Değişiklikleri Kaydet (Yakında)</AlertDialogAction> */}
                   </AlertDialogFooter>
               </AlertDialogContent>
           </AlertDialog>
       )}
    </div>
  );
}
