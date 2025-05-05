
'use client'; // Make this a client component

import type { SubmitHandler } from 'react-hook-form';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
// import { Label } from "@/components/ui/label"; // Keep Label import if needed elsewhere, otherwise remove
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Separator } from '@/components/ui/separator'; // Import Separator
import Link from 'next/link'; // Import Link
import { ArrowLeft, PlusCircle, X } from 'lucide-react'; // Import ArrowLeft, PlusCircle, X icons
import { initialApprovalData, approvalSchema, type ApprovalFormData } from '@/data/approval-data'; // Import shared data

export default function SeriTadilatOnayPage() {
  // Use initialApprovalData from the shared file
  const [approvalData, setApprovalData] = useState<ApprovalFormData[]>(initialApprovalData);
  const [isFormVisible, setIsFormVisible] = useState(false); // State for form visibility
  const { toast } = useToast(); // Initialize toast

  // Use approvalSchema from the shared file
  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      marka: "",
      tipOnayNo: "",
      varyant: "",
      versiyon: "",
      seriTadilatTipOnayi: "", // Added default value for new field
    },
  });

  const onSubmit: SubmitHandler<ApprovalFormData> = (data) => {
    // Basic check for duplicates before adding
    const exists = approvalData.some(
      (item) =>
        item.marka.toLowerCase() === data.marka.toLowerCase() &&
        item.tipOnayNo.toLowerCase() === data.tipOnayNo.toLowerCase() &&
        item.varyant.toLowerCase() === data.varyant.toLowerCase() &&
        item.versiyon.toLowerCase() === data.versiyon.toLowerCase() &&
        item.seriTadilatTipOnayi.toLowerCase() === data.seriTadilatTipOnayi.toLowerCase() // Added check for new field
    );

    if (exists) {
       toast({
         title: "Tekrarlanan Veri",
         description: "Bu veri zaten listede mevcut.",
         variant: "destructive",
       });
       return; // Prevent adding duplicate
    }


    setApprovalData((prevData) => [...prevData, data]);
    // TODO: Persist this data (e.g., to a database or local storage)
    // initialApprovalData in src/data/approval-data.ts won't be updated by this.
    // If you need the main page to see newly added data, you'll need a more
    // robust state management solution (like Context API, Zustand, or fetch from backend).
    form.reset(); // Clear the form fields
    setIsFormVisible(false); // Hide form after successful submission
    toast({
      title: "Veri Eklendi",
      description: "Yeni tip onay verisi başarıyla listeye eklendi.",
    });
  };

  const handleCancel = () => {
    form.reset(); // Reset form fields if needed
    setIsFormVisible(false); // Hide the form
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-background to-muted/60 p-4 sm:p-8">
       <Card className="w-full max-w-6xl shadow-xl bg-card/80 backdrop-blur-sm"> {/* Increased max-width */}
         <CardHeader>
           {/* Add flex layout for header items */}
           <div className="flex items-center justify-between mb-4">
             {/* Back Button */}
             <Link href="/" passHref>
               <Button variant="outline" size="icon">
                 <ArrowLeft className="h-4 w-4" />
                 <span className="sr-only">Geri</span> {/* Screen reader text */}
               </Button>
             </Link>
             {/* Centered Title and Description */}
             <div className="flex-1 text-center">
               <CardTitle className="text-2xl font-bold text-primary">
                 Seri Tadilat Tip Onay Verileri
               </CardTitle>
               <CardDescription className="text-muted-foreground">
                 Onaylanmış seri tadilat tip verilerini görüntüleyin ve yenilerini ekleyin.
               </CardDescription>
             </div>
             {/* Placeholder div to balance the layout, ensures title is centered */}
             <div className="w-10"></div>
           </div>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Button to show the add data form */}
           {!isFormVisible && (
             <div className="flex justify-center">
               <Button onClick={() => setIsFormVisible(true)}>
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Yeni Veri Ekle
               </Button>
             </div>
           )}

           {/* Form for adding new data (conditionally rendered) */}
           {isFormVisible && (
             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-4 rounded-lg shadow-sm bg-card relative">
                 <div className="flex justify-between items-center mb-3 border-b pb-2">
                   <h3 className="text-lg font-semibold text-foreground">Yeni Veri Ekle</h3>
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
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Adjusted grid columns */}
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
                   <FormField /* Added form field for the new column */
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
                 <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      İptal
                    </Button>
                   <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[100px]">
                     {form.formState.isSubmitting ? (
                       <div className="flex items-center justify-center">
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Ekleniyor...
                        </div>
                     ) : 'Kaydet'}
                   </Button>
                 </div>
               </form>
             </Form>
           )}

           <Separator className="my-6" />

           {/* Existing Data Table */}
           <div>
             <h3 className="text-lg font-semibold text-foreground mb-3 text-center">Mevcut Veri Listesi</h3>
              <Table>
                <TableCaption>Onaylanmış tip verileri listesi.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Marka</TableHead> {/* Adjusted width */}
                    <TableHead className="w-[20%]">Tip Onay No</TableHead> {/* Adjusted width */}
                    <TableHead className="w-[20%]">Varyant</TableHead> {/* Adjusted width */}
                    <TableHead className="w-[20%]">Versiyon</TableHead> {/* Adjusted width */}
                    <TableHead className="w-[20%]">Seri Tadilat Tip Onayı</TableHead> {/* Added new column header */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalData.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={5} className="h-24 text-center text-muted-foreground"> {/* Updated colSpan */}
                         Henüz veri eklenmemiş.
                       </TableCell>
                     </TableRow>
                   ) : (
                      // Sort data alphabetically by Marka, then TipOnayNo for consistency
                      [...approvalData]
                        .sort((a, b) => {
                            if (a.marka < b.marka) return -1;
                            if (a.marka > b.marka) return 1;
                            if (a.tipOnayNo < b.tipOnayNo) return -1;
                            if (a.tipOnayNo > b.tipOnayNo) return 1;
                            // Optional: Add sorting by other fields if needed
                            return 0;
                        })
                        .map((data, index) => (
                        <TableRow key={`${data.tipOnayNo}-${data.seriTadilatTipOnayi}-${index}`}> {/* More robust key */}
                          <TableCell className="font-medium">{data.marka}</TableCell>
                          <TableCell>{data.tipOnayNo}</TableCell>
                          <TableCell>{data.varyant}</TableCell>
                          <TableCell>{data.versiyon}</TableCell>
                          <TableCell>{data.seriTadilatTipOnayi}</TableCell> {/* Added cell for new column */}
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
