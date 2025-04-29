'use client';

import * as React from 'react';
import { useAppState } from '@/hooks/use-app-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Archive, Search, FolderOpen, Trash2, Pencil, FileText } from 'lucide-react';
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

interface ArchiveEntry {
  branch: string;
  chassisNumber?: string;
  brand?: string;
  type?: string;
  tradeName?: string;
  owner?: string;
  typeApprovalNumber?: string;
  typeAndVariant?: string;
  additionalNotes?: string;
  inspectionDate?: string;
  inspectorName?: string;
  registrationDocument?: File | { name: string }; // Can be File or just info
  labelDocument?: File | { name: string }; // Can be File or just info
  archivedAt: string; // ISO string format
  fileName: string;
}

export default function ArchivePage() {
  const { recordData, updateRecordData } = useAppState();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingEntry, setEditingEntry] = React.useState<ArchiveEntry | null>(null); // State for editing

  // Use recordData.archive or default to empty array
  const archive = recordData.archive || [];

  const filteredArchive = archive.filter((entry: ArchiveEntry) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      entry.fileName?.toLowerCase().includes(lowerSearchTerm) ||
      entry.chassisNumber?.toLowerCase().includes(lowerSearchTerm) ||
      entry.brand?.toLowerCase().includes(lowerSearchTerm) ||
      entry.owner?.toLowerCase().includes(lowerSearchTerm) ||
      entry.branch?.toLowerCase().includes(lowerSearchTerm)
    );
  });

  const groupedArchive = filteredArchive.reduce((acc, entry) => {
    try {
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
        acc[key].sort((a, b) => parseISO(b.archivedAt).getTime() - parseISO(a.archivedAt).getTime());

        return acc;
      } catch (error) {
         console.error("Error parsing date for entry:", entry, error);
         // Handle entries with invalid dates, e.g., group them under "Invalid Date"
         const invalidKey = "Geçersiz Tarih";
         if (!acc[invalidKey]) {
             acc[invalidKey] = [];
         }
         acc[invalidKey].push(entry);
         return acc;
     }
  }, {} as { [key: string]: ArchiveEntry[] });

   // Sort group keys (year-month) chronologically, newest first
  const sortedGroupKeys = Object.keys(groupedArchive).sort((a, b) => {
      if (a === "Geçersiz Tarih") return 1; // Put invalid date last
      if (b === "Geçersiz Tarih") return -1;

      const [yearA, monthNameA] = a.split('-');
      const [yearB, monthNameB] = b.split('-');

      if (yearA !== yearB) {
          return parseInt(yearB) - parseInt(yearA);
      }

      // Convert month names back to numbers for comparison (approximation needed)
       const monthOrder = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
       const monthIndexA = monthOrder.indexOf(monthNameA);
       const monthIndexB = monthOrder.indexOf(monthNameB);

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
       // For now, just log or navigate to an edit page (future enhancement)
       setEditingEntry(entry); // Set the entry to be edited
        toast({
            title: "Düzenleme Modu (Yakında)",
            description: `${entry.fileName} için düzenleme özelliği eklenecektir.`,
        });
       // In a real app, you might navigate to a form pre-filled with 'entry' data
       // router.push(`/edit-record/${encodeURIComponent(entry.fileName)}`);
   };

   const getFileName = (file: File | { name: string } | undefined): string => {
       if (!file) return 'Yok';
       if (file instanceof File) return file.name;
       return file.name || 'Bilinmeyen Dosya';
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
              placeholder="Şube, Şase No, Marka, Sahip ara..."
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
                            <TableHead>Marka</TableHead>
                            <TableHead>Sahip</TableHead>
                            <TableHead>Arşivlenme Tarihi</TableHead>
                             <TableHead>Ruhsat</TableHead>
                             <TableHead>Etiket</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedArchive[groupKey].map((entry) => (
                            <TableRow key={entry.fileName}>
                              <TableCell className="font-medium">{entry.fileName}</TableCell>
                              <TableCell>{entry.brand || '-'}</TableCell>
                              <TableCell>{entry.owner || '-'}</TableCell>
                              <TableCell>{format(parseISO(entry.archivedAt), 'dd MMMM yyyy HH:mm', { locale: tr })}</TableCell>
                              <TableCell>
                                {entry.registrationDocument ? <FileText className="h-5 w-5 text-green-600" title={getFileName(entry.registrationDocument)} /> : '-'}
                                </TableCell>
                              <TableCell>
                                 {entry.labelDocument ? <FileText className="h-5 w-5 text-blue-600" title={getFileName(entry.labelDocument)}/> : '-'}
                                </TableCell>
                              <TableCell className="text-right space-x-2">
                                 <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} title="Düzenle (Yakında)">
                                    <Pencil className="h-4 w-4" />
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
                                            Bu işlem geri alınamaz. '{entry.fileName}' kaydını kalıcı olarak silmek istediğinizden emin misiniz?
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
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Basic Edit Modal Placeholder (Future Enhancement) */}
       {editingEntry && (
           <AlertDialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
               <AlertDialogContent>
                   <AlertDialogHeader>
                       <AlertDialogTitle>Kaydı Düzenle (Yakında)</AlertDialogTitle>
                       <AlertDialogDescription>
                           '{editingEntry.fileName}' kaydının düzenlenmesi için form buraya eklenecektir.
                           Şimdilik sadece kapatabilirsiniz.
                       </AlertDialogDescription>
                   </AlertDialogHeader>
                    {/* TODO: Add form fields here pre-filled with editingEntry data */}
                     <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-auto max-h-60">
                        <code className="text-white">{JSON.stringify(editingEntry, null, 2)}</code>
                    </pre>
                   <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setEditingEntry(null)}>Kapat</AlertDialogCancel>
                       {/* <AlertDialogAction onClick={handleSaveChanges}>Değişiklikleri Kaydet</AlertDialogAction> */}
                   </AlertDialogFooter>
               </AlertDialogContent>
           </AlertDialog>
       )}
    </div>
  );
}
