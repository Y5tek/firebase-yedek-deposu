
'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    Row, // Import Row type
} from '@tanstack/react-table';
import * as XLSX from 'xlsx'; // Import xlsx library
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getTypeApprovalRecords, addMultipleTypeApprovalRecords, addTypeApprovalRecord, updateTypeApprovalRecord, deleteTypeApprovalRecord } from '@/services/firestore'; // Import update/delete
import type { TypeApprovalRecord } from '@/types'; // Import the type
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ListChecks, Upload, Loader2, ArrowUpDown, Download, PlusCircle, Pencil, Trash2 } from 'lucide-react'; // Added icons
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Schema for the manual entry/edit form (same schema)
const RecordSchema = z.object({
  sube_adi: z.string().optional(),
  proje_adi: z.string().optional(),
  tip_onay: z.string().optional(),
  tip_onay_seviye: z.string().optional(),
  varyant: z.string().optional(),
  versiyon: z.string().optional(),
  tip_onay_no: z.string().min(1, "Tip Onay No zorunludur."), // Required
});

type RecordFormData = z.infer<typeof RecordSchema>;


// Define the required headers for the template and mapping
const templateHeaders = ['ŞUBE ADI', 'PROJE ADI', 'TİP ONAY', 'tip onay seviye', 'VARYANT', 'VERSİYON', 'TİP ONAY NO'];
const excelHeaderMapping: { [key: string]: keyof Omit<TypeApprovalRecord, 'id'> } = {
    'şube adi': 'sube_adi',
    'proje adi': 'proje_adi',
    'tip onay': 'tip_onay',
    'tip onay seviye': 'tip_onay_seviye',
    'varyant': 'varyant',
    'versiyon': 'versiyon',
    'tip onay no': 'tip_onay_no',
};


// --- Edit Dialog Component ---
interface EditRecordDialogProps {
    record: TypeApprovalRecord;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (id: string, data: RecordFormData) => void; // Pass mutation function
    isUpdating: boolean; // Pass loading state
}

function EditRecordDialog({ record, isOpen, onOpenChange, onUpdate, isUpdating }: EditRecordDialogProps) {
    const form = useForm<RecordFormData>({
        resolver: zodResolver(RecordSchema),
        // Use defaultValues prop and update it when the record prop changes
        defaultValues: {
            sube_adi: record.sube_adi || '',
            proje_adi: record.proje_adi || '',
            tip_onay: record.tip_onay || '',
            tip_onay_seviye: record.tip_onay_seviye || '',
            varyant: record.varyant || '',
            versiyon: record.versiyon || '',
            tip_onay_no: record.tip_onay_no || '',
        },
    });

    // Sync form with record when it changes
    React.useEffect(() => {
         form.reset({
            sube_adi: record.sube_adi || '',
            proje_adi: record.proje_adi || '',
            tip_onay: record.tip_onay || '',
            tip_onay_seviye: record.tip_onay_seviye || '',
            varyant: record.varyant || '',
            versiyon: record.versiyon || '',
            tip_onay_no: record.tip_onay_no || '',
        });
    }, [record, form]);

    const onSubmit = (data: RecordFormData) => {
        console.log("Updating record:", record.id, data);
        onUpdate(record.id, data); // Call the passed mutation function
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Kaydı Düzenle</DialogTitle>
                    <DialogDescription>
                        Tip onay kaydı bilgilerini düzenleyin. Tip Onay No alanı zorunludur.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="editRecordForm" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {(Object.keys(RecordSchema.shape) as Array<keyof RecordFormData>).map((fieldName) => (
                            <FormField
                                key={fieldName}
                                control={form.control}
                                name={fieldName}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {templateHeaders.find(h => excelHeaderMapping[h.toLowerCase()] === fieldName) || fieldName}
                                            {fieldName === 'tip_onay_no' && <span className="text-destructive">*</span>}
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder={`${templateHeaders.find(h => excelHeaderMapping[h.toLowerCase()] === fieldName) || fieldName}...`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">İptal</Button>
                    </DialogClose>
                    <Button type="submit" form="editRecordForm" disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Page Component ---
export default function TypeApprovalListPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TypeApprovalRecord | null>(null); // State for editing

    // Fetch data using React Query
    const { data: records = [], isLoading: isLoadingRecords, error: fetchError } = useQuery<TypeApprovalRecord[], Error>({
        queryKey: ['typeApprovalRecords'],
        queryFn: getTypeApprovalRecords,
    });

    // Form for manual entry
    const manualEntryForm = useForm<RecordFormData>({
        resolver: zodResolver(RecordSchema),
        defaultValues: {
          sube_adi: '',
          proje_adi: '',
          tip_onay: '',
          tip_onay_seviye: '',
          varyant: '',
          versiyon: '',
          tip_onay_no: '',
        },
    });

    // Mutation for adding multiple records from Excel
    const excelUploadMutation = useMutation<void, Error, Omit<TypeApprovalRecord, 'id'>[]>({
        mutationFn: addMultipleTypeApprovalRecords,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['typeApprovalRecords'] });
            toast({
                title: 'Başarılı!',
                description: 'Excel verileri başarıyla Firestore\'a yüklendi.',
            });
            setUploadError(null);
        },
        onError: (error) => {
            console.error("Error uploading Excel data:", error);
            toast({
                title: 'Excel Yükleme Hatası!',
                description: `Veriler yüklenirken bir hata oluştu: ${error.message}`,
                variant: 'destructive',
            });
            setUploadError(`Excel verileri yüklenirken bir hata oluştu: ${error.message}`);
        },
        onSettled: () => {
            setUploading(false);
        },
    });

     // Mutation for adding a single manual record
     const manualEntryMutation = useMutation<void, Error, Omit<TypeApprovalRecord, 'id'>>({
        mutationFn: addTypeApprovalRecord, // Use the single add function
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['typeApprovalRecords'] });
            toast({
                title: 'Başarılı!',
                description: 'Yeni kayıt başarıyla eklendi.',
            });
            setIsManualEntryDialogOpen(false); // Close dialog on success
            manualEntryForm.reset(); // Reset form fields
        },
        onError: (error) => {
            console.error("Error adding manual record:", error);
            toast({
                title: 'Kayıt Ekleme Hatası!',
                description: `Kayıt eklenirken bir hata oluştu: ${error.message}`,
                variant: 'destructive',
            });
            // Keep dialog open on error for correction
        },
    });

     // Mutation for deleting a record
     const deleteMutation = useMutation<void, Error, string>({
        mutationFn: deleteTypeApprovalRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['typeApprovalRecords'] });
            toast({
                title: "Kayıt Silindi",
                description: "Kayıt başarıyla silindi.",
                variant: "destructive"
            });
        },
        onError: (error) => {
            console.error("Error deleting record:", error);
            toast({
                title: 'Silme Hatası!',
                description: `Kayıt silinirken bir hata oluştu: ${error.message}`,
                variant: 'destructive',
            });
        },
    });

    // Mutation for updating a record (defined in the parent)
    const updateMutation = useMutation<void, Error, { id: string; data: RecordFormData }>({
        mutationFn: ({ id, data }) => updateTypeApprovalRecord(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['typeApprovalRecords'] });
            toast({
                title: 'Başarılı!',
                description: 'Kayıt başarıyla güncellendi.',
            });
            setEditingRecord(null); // Close dialog on success
        },
        onError: (error) => {
            console.error("Error updating record:", error);
            toast({
                title: 'Güncelleme Hatası!',
                description: `Kayıt güncellenirken bir hata oluştu: ${error.message}`,
                variant: 'destructive',
            });
             // Optionally keep the dialog open on error by not calling setEditingRecord(null) here
        },
    });


     // Define columns for the React Table, adding the Actions column
    const columns: ColumnDef<TypeApprovalRecord>[] = [
        {
            accessorKey: 'sube_adi',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Şube Adı
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
        },
        {
            accessorKey: 'proje_adi',
            header: 'Proje Adı',
        },
        {
            accessorKey: 'tip_onay',
            header: 'Tip Onay',
        },
        {
            accessorKey: 'tip_onay_seviye',
            header: 'Onay Seviye',
        },
        {
            accessorKey: 'varyant',
            header: 'Varyant',
        },
        {
            accessorKey: 'versiyon',
            header: 'Versiyon',
        },
        {
            accessorKey: 'tip_onay_no',
            header: ({ column }) => (
                 <Button
                     variant="ghost"
                     onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                 >
                     Tip Onay No
                     <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
             ),
        },
        // Removed belge_url column based on request
         // Add Actions column
        {
            id: 'actions',
            header: 'İşlemler',
            cell: ({ row }) => (
                <div className="flex space-x-1">
                    {/* Edit Button */}
                     <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRecord(row.original)} // Set the record to edit
                        title="Düzenle"
                        disabled={updateMutation.isPending || deleteMutation.isPending} // Disable while other actions are pending
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    {/* Delete Button */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/90"
                                title="Sil"
                                disabled={updateMutation.isPending || deleteMutation.isPending} // Disable while other actions are pending
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu işlem geri alınamaz. '{row.original.tip_onay_no}' numaralı kaydı kalıcı olarak silmek istediğinizden emin misiniz?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDelete(row.original.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sil
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ),
        },
    ];

    // Configure React Table
    const table = useReactTable({
        data: records,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploading(true);
        setUploadError(null);
        const file = event.target.files?.[0];

        if (!file) {
            setUploading(false);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                console.log("Reading sheet:", sheetName);
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }); // Read as array of arrays, default empty cells to ""

                console.log("Parsed Excel data (raw):", json);
                console.log("Number of rows found (including header):", json?.length);

                 // Check if the file is empty or just headers
                if (!json || json.length <= 1) {
                    console.error("Validation failed: Excel file is empty or only contains a header row.");
                    throw new Error("Excel dosyası boş veya sadece başlık satırı içeriyor.");
                }

                const headers = json[0]?.map(header => String(header).trim().toLowerCase());
                console.log("Found headers:", headers);

                if (!headers || headers.length === 0) {
                    throw new Error("Excel dosyasında başlık satırı bulunamadı.");
                }

                const recordsToUpload: Omit<TypeApprovalRecord, 'id'>[] = [];

                // Validate headers using the templateHeaders' lowercase versions
                const requiredLowerHeaders = templateHeaders.map(h => h.toLowerCase());
                const missingHeaders = requiredLowerHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    const originalMissing = templateHeaders.filter(th => !headers.includes(th.toLowerCase()));
                    console.error("Missing headers:", originalMissing);
                    throw new Error(`Eksik Excel sütun başlıkları: ${originalMissing.join(', ')}`);
                }

                console.log("Processing rows starting from index 1...");
                // Start from index 1 to skip header row
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    console.log(`Processing row ${i + 1}:`, row);

                    // Ensure row is an array, even if empty
                    const currentRow = Array.isArray(row) ? row : [];

                    // Skip completely empty rows more robustly
                    if (currentRow.length === 0 || currentRow.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
                        console.log(`Skipping empty row ${i + 1}`);
                        continue;
                    }

                    const record: Partial<Omit<TypeApprovalRecord, 'id'>> = {};
                    let hasRequiredData = false; // Flag for the required field
                    headers.forEach((header, index) => {
                        const firestoreField = excelHeaderMapping[header];
                        const cellValue = currentRow[index] !== undefined && currentRow[index] !== null ? String(currentRow[index]).trim() : ''; // Trim whitespace, handle null/undefined

                        if (firestoreField) {
                            record[firestoreField] = cellValue; // Store trimmed value (even if empty for optional fields)
                            // Check if the required field has data
                            if (firestoreField === 'tip_onay_no' && cellValue !== '') {
                                hasRequiredData = true;
                            }
                        }
                    });

                     // Basic validation: check if tip_onay_no exists and is not empty
                     if (!hasRequiredData) {
                        console.warn(`Skipping row ${i + 1}: 'TİP ONAY NO' is missing or empty.`);
                        // Optionally inform the user about skipped rows later
                        continue; // Skip rows without a type approval number
                     }

                    recordsToUpload.push(record as Omit<TypeApprovalRecord, 'id'>);
                    console.log(`Added record from row ${i + 1}:`, record);
                }

                console.log(`Total valid records found: ${recordsToUpload.length}`);
                if (recordsToUpload.length === 0 && json.length > 1) { // Error only if rows existed but were invalid
                     throw new Error("Excel dosyasında geçerli kayıt bulunamadı (Her satırda 'TİP ONAY NO' olduğundan emin olun ve boş satırları kontrol edin).");
                 } else if (recordsToUpload.length === 0 && json.length <= 1) { // This check is now redundant due to the check at the beginning
                      // throw new Error("Excel dosyasında yüklenecek veri bulunamadı (sadece başlık satırı var veya dosya boş)."); // Removed redundant check
                      console.warn("No valid data rows found to upload after processing.");
                 }

                console.log("Records to upload to Firestore:", recordsToUpload);
                if(recordsToUpload.length > 0) {
                    excelUploadMutation.mutate(recordsToUpload);
                } else {
                     // If no valid records found after processing, inform the user
                     throw new Error("Excel dosyasında yüklenecek geçerli veri bulunamadı.");
                }


            } catch (error: any) {
                console.error("Error processing Excel file:", error);
                const userFriendlyMessage = error.message.includes("Excel dosyası boş") || error.message.includes("geçerli kayıt bulunamadı") || error.message.includes("Eksik Excel sütun başlıkları") || error.message.includes("başlık satırı bulunamadı") || error.message.includes("yüklenecek veri bulunamadı") || error.message.includes("yüklenecek geçerli veri bulunamadı")
                    ? error.message // Use specific error message if it's about content/headers/validity
                    : `Dosya okunamadı veya formatı hatalı: ${error.message}`; // Generic message otherwise

                setUploadError(`Excel dosyası işlenirken hata: ${userFriendlyMessage}`);
                toast({
                    title: 'Excel İşleme Hatası',
                    description: userFriendlyMessage,
                    variant: 'destructive',
                });
                setUploading(false);
            }
        };
        reader.onerror = (error) => {
            console.error("File reading error:", error);
            setUploadError("Dosya okunurken bir hata oluştu.");
            toast({
                title: 'Dosya Okuma Hatası',
                description: 'Seçilen dosya okunamadı.',
                variant: 'destructive',
            });
            setUploading(false);
        };
        reader.readAsBinaryString(file); // Read as binary string for xlsx library

        // Reset file input to allow uploading the same file again
         if (event.target) {
             event.target.value = '';
         }
    };

     // Function to handle template download
     const handleDownloadTemplate = () => {
         try {
            const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "TipOnaySablonu");
            XLSX.writeFile(wb, "Tip_Onay_Kayit_Sablonu.xlsx");
            toast({
                title: "Şablon İndirildi",
                description: "Excel şablonu başarıyla indirildi.",
            })
         } catch (error) {
              console.error("Error generating Excel template:", error);
              toast({
                  title: "Şablon Oluşturma Hatası",
                  description: "Excel şablonu oluşturulurken bir hata oluştu.",
                  variant: "destructive",
              });
         }
     };

     // Handle manual entry form submission
     const onManualSubmit = (data: RecordFormData) => {
         console.log("Submitting manual entry:", data);
         manualEntryMutation.mutate(data); // Pass data to the mutation
     };

     // Handle delete action
     const handleDelete = (id: string) => {
         console.log("Deleting record with ID:", id);
         deleteMutation.mutate(id);
     };

     // Handle update action (passed to the dialog)
    const handleUpdate = (id: string, data: RecordFormData) => {
        updateMutation.mutate({ id, data });
    };


    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="w-full shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <ListChecks className="text-primary" />
                        Tip Onay Listesi
                    </CardTitle>
                    <CardDescription>
                        Mevcut tip onay kayıtlarını görüntüleyin, Excel'den toplu yükleyin veya manuel olarak yeni kayıt ekleyin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* File Upload, Download & Manual Entry Section */}
                    <div className="flex flex-col sm:flex-row items-center flex-wrap gap-4 p-4 border rounded-md bg-secondary/30">
                         {/* Upload Button */}
                         <label htmlFor="excel-upload" className="w-full sm:w-auto">
                             <Button asChild variant="outline" disabled={uploading || manualEntryMutation.isPending || updateMutation.isPending || deleteMutation.isPending} className="w-full sm:w-auto cursor-pointer">
                                 <div>
                                     {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                     Excel Yükle
                                 </div>
                             </Button>
                         </label>
                         <Input
                             id="excel-upload"
                             type="file"
                             accept=".xlsx, .csv"
                             onChange={handleFileUpload}
                             className="hidden"
                             disabled={uploading || manualEntryMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                         />
                         {/* Download Template Button */}
                         <Button
                             variant="secondary"
                             onClick={handleDownloadTemplate}
                             disabled={uploading || manualEntryMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                             className="w-full sm:w-auto"
                         >
                             <Download className="mr-2 h-4 w-4" />
                             Şablon İndir
                         </Button>
                         {/* Manual Entry Button */}
                          <Dialog open={isManualEntryDialogOpen} onOpenChange={setIsManualEntryDialogOpen}>
                             <DialogTrigger asChild>
                                 <Button variant="default" className="w-full sm:w-auto" disabled={uploading || manualEntryMutation.isPending || updateMutation.isPending || deleteMutation.isPending}>
                                     <PlusCircle className="mr-2 h-4 w-4" />
                                     Manuel Kayıt Ekle
                                 </Button>
                             </DialogTrigger>
                             <DialogContent className="sm:max-w-[600px]">
                                 <DialogHeader>
                                     <DialogTitle>Manuel Tip Onay Kaydı Ekle</DialogTitle>
                                     <DialogDescription>
                                         Yeni tip onay kaydı bilgilerini girin. Tip Onay No alanı zorunludur.
                                     </DialogDescription>
                                 </DialogHeader>
                                  <Form {...manualEntryForm}>
                                     <form id="manualEntryForm" onSubmit={manualEntryForm.handleSubmit(onManualSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                         {/* Map through fields for cleaner code */}
                                         {(Object.keys(RecordSchema.shape) as Array<keyof RecordFormData>).map((fieldName) => (
                                            <FormField
                                                key={fieldName}
                                                control={manualEntryForm.control}
                                                name={fieldName}
                                                render={({ field }) => (
                                                    <FormItem>
                                                         {/* Find original case header for label */}
                                                         <FormLabel>
                                                             {templateHeaders.find(h => excelHeaderMapping[h.toLowerCase()] === fieldName) || fieldName}
                                                              {fieldName === 'tip_onay_no' && <span className="text-destructive">*</span>}
                                                         </FormLabel>
                                                        <FormControl>
                                                            <Input placeholder={`${templateHeaders.find(h => excelHeaderMapping[h.toLowerCase()] === fieldName) || fieldName}...`} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                         ))}
                                     </form>
                                 </Form>
                                 <DialogFooter>
                                     <DialogClose asChild>
                                        <Button type="button" variant="outline">İptal</Button>
                                    </DialogClose>
                                     <Button type="submit" form="manualEntryForm" disabled={manualEntryMutation.isPending} >
                                         {manualEntryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                         Kaydet
                                     </Button>
                                 </DialogFooter>
                             </DialogContent>
                         </Dialog>

                         {/* Loading indicator can be shared or specific */}
                          {uploading && <span className="text-sm text-muted-foreground">Yükleniyor...</span>}
                          {(manualEntryMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && <span className="text-sm text-muted-foreground">İşlem yapılıyor...</span>}
                    </div>
                    {uploadError && (
                        <Alert variant="destructive">
                            <AlertTitle>Yükleme Hatası!</AlertTitle>
                            <AlertDescription>{uploadError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Data Table Section */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoadingRecords ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary"/>
                                        </TableCell>
                                    </TableRow>
                                ) : fetchError ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                                            Kayıtlar yüklenirken hata oluştu: {fetchError.message}
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && 'selected'}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            Kayıt bulunamadı. Excel'den yükleme yapabilir veya manuel kayıt ekleyebilirsiniz.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             {/* Edit Dialog Instance */}
             {editingRecord && (
                <EditRecordDialog
                    record={editingRecord}
                    isOpen={!!editingRecord}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingRecord(null); // Clear editing state when dialog closes
                        }
                    }}
                    onUpdate={handleUpdate} // Pass the mutation handler
                    isUpdating={updateMutation.isPending} // Pass the loading state
                />
            )}
        </div>
    );
}
