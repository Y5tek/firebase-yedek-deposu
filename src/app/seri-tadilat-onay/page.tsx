
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

// Define the schema for a single approval entry using Zod
const approvalSchema = z.object({
  marka: z.string().min(1, { message: "Marka alanı boş olamaz." }),
  tipOnayNo: z.string().min(1, { message: "Tip Onay No alanı boş olamaz." }),
  varyant: z.string().min(1, { message: "Varyant alanı boş olamaz." }),
  versiyon: z.string().min(1, { message: "Versiyon alanı boş olamaz." }),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

// Placeholder data - initial state
const initialApprovalData: ApprovalFormData[] = [
  { marka: "Marka A", tipOnayNo: "A123", varyant: "Varyant X", versiyon: "1.0" },
  { marka: "Marka B", tipOnayNo: "B456", varyant: "Varyant Y", versiyon: "2.1" },
  { marka: "Marka C", tipOnayNo: "C789", varyant: "Varyant Z", versiyon: "3.0" },
  { marka: "Marka A", tipOnayNo: "A124", varyant: "Varyant X", versiyon: "1.1" },
];

export default function SeriTadilatOnayPage() {
  const [approvalData, setApprovalData] = useState<ApprovalFormData[]>(initialApprovalData);
  const [isFormVisible, setIsFormVisible] = useState(false); // State for form visibility
  const { toast } = useToast(); // Initialize toast

  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      marka: "",
      tipOnayNo: "",
      varyant: "",
      versiyon: "",
    },
  });

  const onSubmit: SubmitHandler<ApprovalFormData> = (data) => {
    setApprovalData((prevData) => [...prevData, data]);
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
       <Card className="w-full max-w-4xl shadow-xl bg-card/80 backdrop-blur-sm">
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <TableHead className="w-[25%]">Marka</TableHead>
                    <TableHead className="w-[25%]">Tip Onay No</TableHead>
                    <TableHead className="w-[25%]">Varyant</TableHead>
                    <TableHead className="w-[25%]">Versiyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalData.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                         Henüz veri eklenmemiş.
                       </TableCell>
                     </TableRow>
                   ) : (
                      approvalData.map((data, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{data.marka}</TableCell>
                          <TableCell>{data.tipOnayNo}</TableCell>
                          <TableCell>{data.varyant}</TableCell>
                          <TableCell>{data.versiyon}</TableCell>
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
