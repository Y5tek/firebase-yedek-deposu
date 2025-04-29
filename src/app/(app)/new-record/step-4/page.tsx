
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
import { useAppState, RecordData } from '@/hooks/use-app-state'; // Ensure RecordData is imported
import { format } from 'date-fns'; // For formatting date
import { getSerializableFileInfo } from '@/lib/utils'; // Import the helper

// Schema for step 4 fields
const FormSchema = z.object({
  additionalNotes: z.string().optional(),
  inspectionDate: z.string().optional(), // Example additional field
  inspectorName: z.string().optional(), // Example additional field
});

type FormData = z.infer<typeof FormSchema>;

export default function NewRecordStep4() { // Renamed component
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [isLoading, setIsLoading] = React.useState(false); // Add loading state if needed for async operations
  const [progress] = React.useState(100); // Step 4 of 4 (final step)

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

    // Refresh recordData from state AFTER updateRecordData finishes merging
     const finalRecordData = getAppState().recordData;


    // Create the final archive entry using the refreshed state data
    const archiveEntry = {
        branch: branch,
        chassisNumber: finalRecordData.chassisNumber,
        brand: finalRecordData.brand,
        type: finalRecordData.type,
        tradeName: finalRecordData.tradeName,
        owner: finalRecordData.owner,
        typeApprovalNumber: finalRecordData.typeApprovalNumber,
        typeAndVariant: finalRecordData.typeAndVariant,
        additionalNotes: data.additionalNotes, // Use current form data for this step
        inspectionDate: data.inspectionDate,
        inspectorName: data.inspectorName,
        // Get serializable info for files before archiving
        registrationDocument: getSerializableFileInfo(finalRecordData.registrationDocument),
        labelDocument: getSerializableFileInfo(finalRecordData.labelDocument),
        additionalPhotos: finalRecordData.additionalPhotos?.map(getSerializableFileInfo),
        additionalVideos: finalRecordData.additionalVideos?.map(getSerializableFileInfo),
        archivedAt: new Date().toISOString(), // Timestamp in ISO format
        fileName: `${branch}/${finalRecordData.chassisNumber || 'NO-CHASSIS'}` // Generate filename
    };

     console.log("Archiving entry:", archiveEntry);


    // Store the prepared entry in the app state's archive list
    const currentArchive = finalRecordData.archive || [];
    updateRecordData({ archive: [...currentArchive, archiveEntry] });


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
    router.push('/new-record/step-3'); // Go back to the new Step 3 (photos/videos)
  };

   // Redirect if no branch is selected or essential data is missing
  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) { // Also check if essential data like chassis number exists
      router.push('/select-branch'); // Redirect to start if essential data is missing
    }
     // Sync form with persisted data on load
     form.reset({
       additionalNotes: recordData.additionalNotes || '',
       inspectionDate: recordData.inspectionDate || '',
       inspectorName: recordData.inspectorName || '',
     });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData.chassisNumber, recordData.additionalNotes, recordData.inspectionDate, recordData.inspectorName, router]);


  if (!branch || !recordData.chassisNumber) {
      // Optionally show a loading or redirecting message
      return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  // Helper function to get the current state synchronously (use carefully)
  const getAppState = useAppState.getState;


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileSpreadsheet className="text-primary" />
            Yeni Kayıt - Adım 4: Ek Form Bilgileri
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
                             <Input type="date" {...field} value={field.value || ''} disabled={isLoading} />
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
                            <Input placeholder="Muayeneyi yapan kişinin adı..." {...field} value={field.value || ''} disabled={isLoading} />
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
                         value={field.value || ''}
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
