
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';

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
import { ListChecks, Upload, Loader2, ArrowUpDown } from 'lucide-react';
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

// Mapping from Excel headers (case-insensitive) to Firestore field names
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
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays

                if (!json || json.length < 2) {
                    throw new Error("Excel dosyası boş veya sadece başlık satırı içeriyor.");
                }

                const headers = json[0].map(header => String(header).trim().toLowerCase());
                const recordsToUpload: Omit<TypeApprovalRecord, 'id'>[] = [];

                // Validate headers
                const requiredHeaders = Object.keys(excelHeaderMapping);
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Eksik Excel sütun başlıkları: ${missingHeaders.join(', ')}`);
                }

                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    const record: Partial<Omit<TypeApprovalRecord, 'id'>> = {};
                    headers.forEach((header, index) => {
                        const firestoreField = excelHeaderMapping[header];
                        if (firestoreField && row[index] !== undefined && row[index] !== null) {
                            record[firestoreField] = String(row[index]); // Convert all values to string for simplicity
                        }
                    });

                     // Basic validation: check if at least tip_onay_no exists
                     if (!record.tip_onay_no) {
                        console.warn(`Skipping row ${i + 1}: 'tip_onay_no' is missing.`);
                        continue; // Skip rows without a type approval number
                     }

                    recordsToUpload.push(record as Omit<TypeApprovalRecord, 'id'>);
                }

                if (recordsToUpload.length === 0) {
                     throw new Error("Excel dosyasında geçerli kayıt bulunamadı (Tip Onay No kontrol edin).");
                 }

                console.log("Records to upload:", recordsToUpload);
                mutation.mutate(recordsToUpload);

            } catch (error: any) {
                console.error("Error processing Excel file:", error);
                setUploadError(`Excel dosyası işlenirken hata: ${error.message}`);
                toast({
                    title: 'Excel İşleme Hatası',
                    description: `Dosya okunamadı veya formatı hatalı: ${error.message}`,
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

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="w-full shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <ListChecks className="text-primary" />
                        Tip Onay Listesi
                    </CardTitle>
                    <CardDescription>
                        Mevcut tip onay kayıtlarını görüntüleyin veya Excel'den yeni kayıtlar yükleyin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* File Upload Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-secondary/30">
                        <Input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                        <label htmlFor="excel-upload" className="w-full sm:w-auto">
                            <Button asChild variant="outline" disabled={uploading} className="w-full sm:w-auto cursor-pointer">
                                <div>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Excel Dosyası Seç (.xlsx, .csv)
                                </div>
                            </Button>
                        </label>
                        <Button
                            onClick={() => document.getElementById('excel-upload')?.click()} // Trigger hidden input
                            disabled={uploading}
                        >
                            {uploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            Excel Yükle
                        </Button>
                    </div>
                    {uploadError && (
                        <Alert variant="destructive">
                            <AlertTitle>Yükleme Hatası!</AlertTitle>
                            <AlertDescription>{uploadError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Data Table Section */}
                    <div className="rounded-md border">
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
                                            Kayıt bulunamadı.
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
