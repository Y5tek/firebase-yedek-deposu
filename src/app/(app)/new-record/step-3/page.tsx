'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, Loader2 } from 'lucide-react'; // Using FileSpreadsheet icon for form
import { useAppState } from '@/hooks/use-app-state';
import { format } from 'date-fns'; // For formatting date

// Schema for step 3 fields
const FormSchema = z.object({
  additionalNotes: z.string().optional(),
  inspectionDate: z.string().optional(), // Example additional field
  inspectorName: z.string().optional(), // Example additional field
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep3() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false); // Add loading state if needed for async operations
  const [progress] = React.useState(75); // Step 3 of 4

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      additionalNotes: recordData.additionalNotes || '',
      inspectionDate: recordData.inspectionDate || '',
      inspectorName: recordData.inspectorName || '',
    },
  });

  const onSubmit = async (data: FormData) => {
     setIsLoading(true);
     // Simulate saving data or performing an action
     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

     // Update app state with the latest form data before navigating
    updateRecordData({
        additionalNotes: data.additionalNotes,
        inspectionDate: data.inspectionDate,
        inspectorName: data.inspectorName,
    });

    // Create the final archive entry
    const archiveEntry = {
        ...recordData, // Include all previously collected data
        ...data, // Include data from this step
        branch: branch, // Add branch information
        archivedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"), // Timestamp
        fileName: `${branch}/${recordData.chassisNumber || 'NO-CHASSIS'}` // Generate filename
    };

    // TODO: Implement actual saving logic here (e.g., save to database/localStorage)
    // For now, we store it in the app state's archive list (replace with actual storage)
    updateRecordData({ archive: [...(recordData.archive || []), archiveEntry] });


     setIsLoading(false);
     toast({
      title: 'Kayıt Tamamlandı',
      description: 'Form bilgileri başarıyla kaydedildi ve kayıt arşivlendi.',
    });
    // Reset record data after successful archiving
    updateRecordData({}, true); // Pass true to reset
    router.push('/archive'); // Navigate to archive page after completion
  };

   const goBack = () => {
    // Save current data before going back
     updateRecordData({
        additionalNotes: form.getValues('additionalNotes'),
        inspectionDate: form.getValues('inspectionDate'),
        inspectorName: form.getValues('inspectorName'),
    });
    router.push('/new-record/step-2');
  };

   // Redirect if no branch is selected
  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) { // Also check if essential data like chassis number exists
      router.push('/select-branch'); // Redirect to start if essential data is missing
    }
  }, [branch, recordData.chassisNumber, router]);


  if (!branch || !recordData.chassisNumber) {
      // Optionally show a loading or redirecting message
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileSpreadsheet className="text-primary" />
            Yeni Kayıt - Adım 3: Ek Form Bilgileri
          </CardTitle>
          <CardDescription>
            Lütfen ek form bilgilerini doldurun. Bu son adımdır.
            (Şube: {branch}, Şase: {recordData.chassisNumber})
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Additional Form Fields */}
                <FormField
                    control={form.control}
                    name="inspectionDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Muayene Tarihi</FormLabel>
                        <FormControl>
                             <Input type="date" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                 <FormField
                    control={form.control}
                    name="inspectorName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Muayene Yapan Kişi</FormLabel>
                        <FormControl>
                            <Input placeholder="Muayeneyi yapan kişinin adı..." {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ek Notlar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Varsa ek notlarınızı buraya yazın..."
                        className="resize-none"
                        {...field}
                         disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex justify-between">
                 <Button type="button" variant="outline" onClick={goBack} disabled={isLoading}>
                     Geri
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Kaydı Tamamla ve Arşivle
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
