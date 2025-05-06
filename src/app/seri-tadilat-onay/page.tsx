
'use client'; // Make this a client component

import type { SubmitHandler } from 'react-hook-form';
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx'; // Import xlsx library
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, X, Upload, Trash2, Loader2 } from 'lucide-react';
import { approvalSchema, type ApprovalFormData } from '@/data/approval-data'; // Import shared data
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox


export default function SeriTadilatOnayPage() {
  const [approvalData, setApprovalData] = useState<ApprovalFormData[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmittingViaExcel, setIsSubmittingViaExcel] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());


  // Load data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('approvalData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData) as ApprovalFormData[];
          // Validate parsedData against schema if necessary, or trust it if it was saved by this app
          setApprovalData(parsedData);
        } catch (error) {
          console.error("Error parsing approvalData from localStorage:", error);
          // Optionally, clear corrupted data or notify user
          localStorage.removeItem('approvalData');
        }
      }
    }
  }, []);


  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      marka: "",
      tipOnayNo: "",
      varyant: "",
      versiyon: "",
      seriTadilatTipOnayi: "",
    },
  });

  const onSubmit: SubmitHandler<ApprovalFormData> = (data) => {
    const exists = approvalData.some(
      (item) =>
        item.marka.toLowerCase() === data.marka.toLowerCase() &&
        item.tipOnayNo.toLowerCase() === data.tipOnayNo.toLowerCase() &&
        item.varyant.toLowerCase() === data.varyant.toLowerCase() &&
        item.versiyon.toLowerCase() === data.versiyon.toLowerCase() &&
        item.seriTadilatTipOnayi.toLowerCase() === data.seriTadilatTipOnayi.toLowerCase()
    );

    if (exists) {
       toast({
         title: "Tekrarlanan Veri",
         description: "Bu veri zaten listede mevcut.",
         variant: "destructive",
       });
       return;
    }

    setApprovalData((prevData) => {
      const updatedData = [...prevData, data];
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('approvalData', JSON.stringify(updatedData));
      }
      return updatedData;
    });
    form.reset();
    setIsFormVisible(false);
    toast({
      title: "Veri Eklendi ve Kaydedildi",
      description: "Yeni tip onay verisi başarıyla listeye eklendi ve kaydedildi.",
    });
  };

  const handleCancel = () => {
    form.reset();
    setIsFormVisible(false);
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsSubmittingViaExcel(true); // Set loading state for Excel processing
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Assuming headers are: Marka, Tip Onay No, Varyant, Versiyon, Seri Tadilat Tip Onayı
          // And data starts from the second row (index 1)
          if (jsonData.length < 2) {
            toast({
              title: "Dosya Formatı Hatalı",
              description: "Excel dosyasında başlık satırı veya veri bulunamadı.",
              variant: "destructive",
            });
            setIsSubmittingViaExcel(false);
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase());
          const expectedHeaders = ["marka", "tip onay no", "varyant", "versiyon", "seri tadilat tip onayı"];
          
          // Check if all expected headers are present
          const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));
          if (missingHeaders.length > 0) {
             toast({
              title: "Eksik Başlıklar",
              description: `Excel dosyasında şu başlıklar eksik: ${missingHeaders.join(', ')}. Lütfen şablonu kontrol edin.`,
              variant: "destructive",
            });
            setIsSubmittingViaExcel(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            return;
          }
          
          // Get indices of the headers
          const headerIndices: Record<string, number> = {};
          expectedHeaders.forEach(eh => {
            headerIndices[eh.replace(/\s+/g, '').toLowerCase()] = headers.indexOf(eh);
          });


          const newEntries: ApprovalFormData[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== "")) { // Check if row is not entirely empty
              const entry: ApprovalFormData = {
                marka: row[headerIndices["marka"]]?.toString().trim() || "",
                tipOnayNo: row[headerIndices["tiponayno"]]?.toString().trim() || "",
                varyant: row[headerIndices["varyant"]]?.toString().trim() || "",
                versiyon: row[headerIndices["versiyon"]]?.toString().trim() || "",
                seriTadilatTipOnayi: row[headerIndices["seritadilattiponayı"]]?.toString().trim() || "",
              };

              // Validate with Zod schema
              const validationResult = approvalSchema.safeParse(entry);
              if (validationResult.success) {
                newEntries.push(validationResult.data);
              } else {
                // Log or display specific validation errors for the row
                console.warn(`Satır ${i + 1} validasyon hatası:`, validationResult.error.flatten().fieldErrors);
                toast({
                  title: `Satır ${i+1} Hatalı`,
                  description: `Veri formatı geçersiz. Lütfen kontrol edin. ${Object.values(validationResult.error.flatten().fieldErrors).flat().join(' ')}`,
                  variant: "destructive",
                  duration: 7000,
                });
              }
            }
          }

          if (newEntries.length > 0) {
            const uniqueNewEntries = newEntries.filter(newEntry =>
              !approvalData.some(existingEntry =>
                existingEntry.marka.toLowerCase() === newEntry.marka.toLowerCase() &&
                existingEntry.tipOnayNo.toLowerCase() === newEntry.tipOnayNo.toLowerCase() &&
                existingEntry.varyant.toLowerCase() === newEntry.varyant.toLowerCase() &&
                existingEntry.versiyon.toLowerCase() === newEntry.versiyon.toLowerCase() &&
                existingEntry.seriTadilatTipOnayi.toLowerCase() === newEntry.seriTadilatTipOnayi.toLowerCase()
              )
            );

            if (uniqueNewEntries.length > 0) {
              setApprovalData(prevData => {
                const updatedData = [...prevData, ...uniqueNewEntries];
                if (typeof window !== 'undefined') {
                  localStorage.setItem('approvalData', JSON.stringify(updatedData));
                }
                return updatedData;
              });
              toast({
                title: "Veriler Yüklendi ve Kaydedildi",
                description: `${uniqueNewEntries.length} yeni veri başarıyla eklendi ve kaydedildi.`,
              });
            } else {
              toast({
                title: "Veri Yüklenmedi",
                description: "Yüklenen dosyadaki tüm veriler zaten mevcut veya hatalı.",
                variant: "default",
              });
            }
          } else {
            toast({
              title: "Veri Bulunamadı",
              description: "Yüklenen dosyada geçerli veri bulunamadı, dosya boş veya tüm satırlar hatalı.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error processing Excel file:", error);
          toast({
            title: "Dosya İşleme Hatası",
            description: "Excel dosyası işlenirken bir hata oluştu. Lütfen dosya formatını ve içeriğini kontrol edin.",
            variant: "destructive",
          });
        } finally {
          setIsSubmittingViaExcel(false); // Reset loading state
        }
      };
      reader.readAsBinaryString(file);
    }
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  // Function to delete selected rows
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      toast({
        title: "Satır Seçilmedi",
        description: "Silmek için lütfen en az bir satır seçin.",
        variant: "destructive",
      });
      return;
    }

    setApprovalData(prevData => {
      const updatedData = prevData.filter((_, index) => !selectedRows.has(index));
       // Save to localStorage
       if (typeof window !== 'undefined') {
        localStorage.setItem('approvalData', JSON.stringify(updatedData));
      }
      return updatedData;
    });
    setSelectedRows(new Set()); // Clear selection
    toast({
      title: "Seçilen Veriler Silindi",
      description: `${selectedRows.size} veri başarıyla silindi ve değişiklikler kaydedildi.`,
    });
  };

  // Function to handle row selection
  const handleRowSelection = (index: number) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      if (newSelectedRows.has(index)) {
        newSelectedRows.delete(index);
      } else {
        newSelectedRows.add(index);
      }
      return newSelectedRows;
    });
  };

  // Function to handle "select all" checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRowIndexes = new Set(approvalData.map((_, index) => index));
      setSelectedRows(allRowIndexes);
    } else {
      setSelectedRows(new Set());
    }
  };

  // Check if all rows are selected
  const areAllRowsSelected = approvalData.length > 0 && selectedRows.size === approvalData.length;


  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-background to-muted/60 p-4 sm:p-8">
       <Card className="w-full max-w-7xl shadow-xl bg-card/80 backdrop-blur-sm"> {/* Increased max-width for more space */}
         <CardHeader>
           <div className="flex items-center justify-between mb-4">
             <Link href="/" passHref>
               <Button variant="outline" size="icon" aria-label="Geri">
                 <ArrowLeft className="h-4 w-4" />
               </Button>
             </Link>
             <div className="flex-1 text-center">
               <CardTitle className="text-2xl font-bold text-primary">
                 Seri Tadilat Tip Onay Verileri
               </CardTitle>
               <CardDescription className="text-muted-foreground">
                 Onaylanmış seri tadilat tip verilerini yönetin: görüntüleyin, ekleyin, yükleyin veya silin.
               </CardDescription>
             </div>
             <div className="w-10"></div> {/* Placeholder for balance */}
           </div>
         </CardHeader>
         <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            {!isFormVisible && (
              <Button onClick={() => setIsFormVisible(true)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Veri Ekle
              </Button>
            )}
            <Button onClick={triggerFileInput} variant="outline" className="w-full sm:w-auto" disabled={isSubmittingViaExcel}>
              {isSubmittingViaExcel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isSubmittingViaExcel ? "Yükleniyor..." : "Şablonla Yükle"}
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
              id="excel-upload"
            />
             {selectedRows.size > 0 && (
                <Button onClick={handleDeleteSelected} variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Seçilenleri Sil ({selectedRows.size})
                </Button>
              )}
          </div>


           {isFormVisible && (
             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-6 rounded-lg shadow-sm bg-card relative mb-6">
                 <div className="flex justify-between items-center mb-3 border-b pb-3">
                   <h3 className="text-xl font-semibold text-foreground">Yeni Veri Ekle</h3>
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={handleCancel}
                     className="text-muted-foreground hover:text-destructive"
                     aria-label="Formu Kapat"
                   >
                     <X className="h-5 w-5" />
                   </Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="marka"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Marka</FormLabel>
                         <FormControl>
                           <Input placeholder="Örn: Marka A" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="tipOnayNo"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Tip Onay No</FormLabel>
                         <FormControl>
                           <Input placeholder="Örn: A123" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="varyant"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Varyant</FormLabel>
                         <FormControl>
                           <Input placeholder="Örn: Varyant X" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="versiyon"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Versiyon</FormLabel>
                         <FormControl>
                           <Input placeholder="Örn: 1.0" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="seriTadilatTipOnayi"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Seri Tadilat Tip Onayı</FormLabel>
                         <FormControl>
                           <Input placeholder="Örn: STTO-123" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
                 <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      İptal
                    </Button>
                   <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[120px]">
                     {form.formState.isSubmitting ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : null}
                     Kaydet
                   </Button>
                 </div>
               </form>
             </Form>
           )}

           <Separator className="my-8" />

           <div>
             <h3 className="text-xl font-semibold text-foreground mb-4 text-center">Mevcut Veri Listesi</h3>
              <Table>
                <TableCaption>
                  {approvalData.length > 0
                    ? `Toplam ${approvalData.length} onaylanmış tip verisi bulunmaktadır.`
                    : "Henüz veri eklenmemiş. Eklemek için 'Yeni Veri Ekle' veya 'Şablonla Yükle' butonlarını kullanın."}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                       <Checkbox
                        checked={areAllRowsSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Tümünü seç"
                        disabled={approvalData.length === 0}
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px]">Marka</TableHead>
                    <TableHead className="min-w-[150px]">Tip Onay No</TableHead>
                    <TableHead className="min-w-[150px]">Varyant</TableHead>
                    <TableHead className="min-w-[100px]">Versiyon</TableHead>
                    <TableHead className="min-w-[200px]">Seri Tadilat Tip Onayı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalData.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                         Listede gösterilecek veri bulunmamaktadır.
                       </TableCell>
                     </TableRow>
                   ) : (
                      [...approvalData]
                        .sort((a, b) => {
                            const markaComparison = a.marka.toLowerCase().localeCompare(b.marka.toLowerCase());
                            if (markaComparison !== 0) return markaComparison;
                            return a.tipOnayNo.toLowerCase().localeCompare(b.tipOnayNo.toLowerCase());
                        })
                        .map((data, index) => (
                        <TableRow key={`${data.marka}-${data.tipOnayNo}-${data.varyant}-${data.versiyon}-${data.seriTadilatTipOnayi}-${index}`} data-state={selectedRows.has(index) ? "selected" : ""}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedRows.has(index)}
                              onCheckedChange={() => handleRowSelection(index)}
                              aria-label={`Satır ${index + 1} seç`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{data.marka}</TableCell>
                          <TableCell>{data.tipOnayNo}</TableCell>
                          <TableCell>{data.varyant}</TableCell>
                          <TableCell>{data.versiyon}</TableCell>
                          <TableCell>{data.seriTadilatTipOnayi}</TableCell>
                        </TableRow>
                      ))
                   )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}

    