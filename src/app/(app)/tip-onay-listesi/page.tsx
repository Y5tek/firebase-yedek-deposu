
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
} from '@tanstack/react-table';
import * as XLSX from 'xlsx'; // Import xlsx library

import { getTypeApprovalRecords, addMultipleTypeApprovalRecords } from '@/services/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { ListChecks, Upload, Loader2, ArrowUpDown, Download } from 'lucide-react'; // Added Download icon
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define columns for the React Table
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
        header: 'Tip Onay No',
    },
    // Removed belge_url column based on request
];

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

export default function TypeApprovalListPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Fetch data using React Query
    const { data: records = [], isLoading: isLoadingRecords, error: fetchError } = useQuery<TypeApprovalRecord[], Error>({
        queryKey: ['typeApprovalRecords'],
        queryFn: getTypeApprovalRecords,
    });

    // Mutation for adding records
    const mutation = useMutation<void, Error, Omit<TypeApprovalRecord, 'id'>[]>({
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
            console.error("Error uploading data:", error);
            toast({
                title: 'Hata!',
                description: `Veriler yüklenirken bir hata oluştu: ${error.message}`,
                variant: 'destructive',
            });
            setUploadError(`Veriler yüklenirken bir hata oluştu: ${error.message}`);
        },
        onSettled: () => {
            setUploading(false);
        },
    });

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
                console.log("Reading sheet:", sheetName); // Log sheet name
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays

                console.log("Parsed Excel data (raw):", json); // Log raw parsed data
                console.log("Number of rows found (including header):", json?.length);

                if (!json || json.length < 2) {
                     console.error("Validation failed: json array is null or has less than 2 rows.", json);
                    throw new Error("Excel dosyası boş veya sadece başlık satırı içeriyor (veya okunamadı).");
                }

                const headers = json[0].map(header => String(header).trim().toLowerCase());
                console.log("Found headers:", headers); // Log headers

                const recordsToUpload: Omit<TypeApprovalRecord, 'id'>[] = [];

                // Validate headers using the templateHeaders' lowercase versions
                const requiredLowerHeaders = templateHeaders.map(h => h.toLowerCase());
                const missingHeaders = requiredLowerHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                     // Try to find the original case headers for the error message
                    const originalMissing = templateHeaders.filter(th => !headers.includes(th.toLowerCase()));
                    console.error("Missing headers:", originalMissing);
                    throw new Error(`Eksik Excel sütun başlıkları: ${originalMissing.join(', ')}`);
                }

                console.log("Processing rows starting from index 1...");
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    console.log(`Processing row ${i + 1}:`, row);

                    // Skip completely empty rows more robustly
                    if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
                        console.log(`Skipping empty row ${i + 1}`);
                        continue;
                    }

                    const record: Partial<Omit<TypeApprovalRecord, 'id'>> = {};
                    let hasData = false; // Flag to check if row has any data in mapped columns
                    headers.forEach((header, index) => {
                        const firestoreField = excelHeaderMapping[header];
                        if (firestoreField && row[index] !== undefined && row[index] !== null) {
                             const cellValue = String(row[index]).trim(); // Trim whitespace
                            // Only assign if the trimmed value is not empty
                             if (cellValue !== '') {
                                record[firestoreField] = cellValue;
                                hasData = true; // Mark that this row has some data
                             }
                        }
                    });

                     // If the row only contained empty strings after trimming, skip it
                     if (!hasData) {
                          console.log(`Skipping row ${i + 1} as it only contains empty values after trimming.`);
                          continue;
                     }

                     // Basic validation: check if tip_onay_no exists and is not empty after trimming
                     if (!record.tip_onay_no) { // No need to check for empty string again due to above logic
                        console.warn(`Skipping row ${i + 1}: 'TİP ONAY NO' is missing or empty.`);
                        continue; // Skip rows without a type approval number
                     }

                    recordsToUpload.push(record as Omit<TypeApprovalRecord, 'id'>);
                    console.log(`Added record from row ${i + 1}:`, record);
                }

                console.log(`Total valid records found: ${recordsToUpload.length}`);
                if (recordsToUpload.length === 0) {
                     throw new Error("Excel dosyasında geçerli kayıt bulunamadı (Her satırda 'TİP ONAY NO' olduğundan emin olun ve boş satırları kontrol edin).");
                 }

                console.log("Records to upload to Firestore:", recordsToUpload);
                mutation.mutate(recordsToUpload);

            } catch (error: any) {
                console.error("Error processing Excel file:", error);
                const userFriendlyMessage = error.message.includes("Excel dosyası boş") || error.message.includes("geçerli kayıt bulunamadı") || error.message.includes("Eksik Excel sütun başlıkları")
                    ? error.message // Use specific error message if it's about content/headers
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

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="w-full shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <ListChecks className="text-primary" />
                        Tip Onay Listesi
                    </CardTitle>
                    <CardDescription>
                        Mevcut tip onay kayıtlarını görüntüleyin veya Excel'den yeni kayıtlar yükleyin. Şablonu indirip doldurduktan sonra yükleyebilirsiniz.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* File Upload & Download Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-secondary/30">
                         {/* Upload Button */}
                         <label htmlFor="excel-upload" className="w-full sm:w-auto">
                             <Button asChild variant="outline" disabled={uploading} className="w-full sm:w-auto cursor-pointer">
                                 <div>
                                     <Upload className="mr-2 h-4 w-4" />
                                     Excel Yükle (.xlsx)
                                 </div>
                             </Button>
                         </label>
                         <Input
                             id="excel-upload"
                             type="file"
                             accept=".xlsx, .csv" //.csv support can be tricky with encodings, .xlsx preferred
                             onChange={handleFileUpload}
                             className="hidden"
                             disabled={uploading}
                         />
                         {/* Download Template Button */}
                         <Button
                             variant="secondary"
                             onClick={handleDownloadTemplate}
                             disabled={uploading}
                             className="w-full sm:w-auto"
                         >
                             <Download className="mr-2 h-4 w-4" />
                             Şablon İndir
                         </Button>
                         {uploading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
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
                                            Yükleniyor...
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
                                            Kayıt bulunamadı. Excel'den yükleme yapabilirsiniz.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
