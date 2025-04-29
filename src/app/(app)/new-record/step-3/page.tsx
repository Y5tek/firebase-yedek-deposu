
'use client';

import * as React from 'react';
import OcrService from '@/services/ocr';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, Video, Image as ImageIcon, Trash2, AlertCircle, Film, FileUp, Eye } from 'lucide-react'; // Added Eye icon
import { useAppState } from '@/hooks/use-app-state'; // RecordData type is implicitly used via useAppState
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";


// Define acceptable file types
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ACCEPTED_MEDIA_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export default function NewRecordStep3() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [progress] = React.useState(75); // Step 3 of 4
  const [mediaFiles, setMediaFiles] = React.useState<MediaFile[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewImage, setPreviewImage] = React.useState<MediaFile | null>(null); // State for image preview modal

  // Use a simple form instance, no schema needed here as we manage files directly
  const form = useForm();

  const mediaInputRef = React.useRef<HTMLInputElement>(null); // Single ref for combined input

  // Initialize mediaFiles state from global state on component mount
  React.useEffect(() => {
    const initialMedia: MediaFile[] = [];
    const existingMediaKeys = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

    const addFilesToMedia = (files: (File | { name: string })[] | undefined, type: 'image' | 'video') => {
      files?.forEach(fileData => {
        if (fileData instanceof File) {
          const fileKey = `${fileData.name}-${fileData.size}`;
          // Check if this file is already in the mediaFiles state by name and size
          if (!existingMediaKeys.has(fileKey)) {
            const previewUrl = URL.createObjectURL(fileData);
            initialMedia.push({ file: fileData, previewUrl, type });
            existingMediaKeys.add(fileKey); // Add to set to prevent duplicates within this init phase
          }
        }
        // Note: We cannot recreate previews for non-File objects (persisted info)
      });
    };

    // Retrieve files from global state and determine their type based on the array they are in
    addFilesToMedia(recordData.additionalPhotos as File[], 'image');
    addFilesToMedia(recordData.additionalVideos as File[], 'video');

    // If initialMedia has new files, update the state
    if (initialMedia.length > 0) {
       setMediaFiles(prev => {
         const existingKeys = new Set(prev.map(mf => `${mf.file.name}-${mf.file.size}`));
         const newFilesToAdd = initialMedia.filter(imf => !existingKeys.has(`${imf.file.name}-${imf.file.size}`));
         return [...prev, ...newFilesToAdd];
       });
    }

    // Cleanup object URLs on unmount
    return () => {
      // Use the state value at the time of cleanup
      setMediaFiles(currentMediaFiles => {
          currentMediaFiles.forEach(mf => URL.revokeObjectURL(mf.previewUrl));
          return currentMediaFiles; // Return the same array after cleanup
      });
    };
    // Run only on mount, state updates handled separately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only on mount


   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const files = event.target.files;
     setUploadError(null); // Clear previous errors


     if (files) {
       const newMediaFiles: MediaFile[] = [];
       let errorFound = false;
       const currentKeys = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

       Array.from(files).forEach(file => {
          // Prevent adding duplicates
          const fileKey = `${file.name}-${file.size}`;
          if (currentKeys.has(fileKey)) {
              console.log(`Skipping duplicate file: ${file.name}`);
              return;
          }

          let fileType: 'image' | 'video' | null = null;
          if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
              fileType = 'image';
          } else if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
              fileType = 'video';
          }

         if (!fileType) {
           setUploadError(`Desteklenmeyen dosya türü: ${file.name}. Sadece resim (${ACCEPTED_IMAGE_TYPES.join(', ')}) veya video (${ACCEPTED_VIDEO_TYPES.join(', ')}) dosyaları kabul edilir.`);
           errorFound = true;
           // Revoke URLs for files added in this batch before erroring out
           newMediaFiles.forEach(nmf => URL.revokeObjectURL(nmf.previewUrl));
           return; // Stop processing this batch
         }

         const previewUrl = URL.createObjectURL(file);
         newMediaFiles.push({ file, previewUrl, type: fileType });
         currentKeys.add(fileKey); // Add new key to prevent duplicates within the same batch
       });


       for (const image of newMediaFiles.filter(mf => mf.type === 'image')) {
            const { data } = await OcrService.execute(image.file);
            if(data.marka){
                form.setValue("marka", data.marka)
            }
       }


       if (errorFound) {
           // Optionally show a toast error as well
           toast({
               title: 'Yükleme Hatası',
               description: uploadError,
               variant: 'destructive',
           });
           // Reset file input
           if (event.target) event.target.value = '';
           return; // Exit if an error was found
       }

       if (newMediaFiles.length > 0) {
         setMediaFiles(prev => [...prev, ...newMediaFiles]);
         // Update global state immediately, separating into photos and videos
         // Ensure we only add File objects to the global state arrays
         const currentPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File) as File[];
         const currentVideos = (recordData.additionalVideos || []).filter(f => f instanceof File) as File[];

         const addedPhotos = newMediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file);
         const addedVideos = newMediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file);

         updateRecordData({
             additionalPhotos: [...currentPhotos, ...addedPhotos],
             additionalVideos: [...currentVideos, ...addedVideos]
          });
       }
     }

    // Reset file input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
   };

  const handleDeleteFile = (indexToDelete: number) => {
    let fileToDelete: MediaFile | null = null;

    setMediaFiles(prev => {
      fileToDelete = prev[indexToDelete]; // Capture the file to delete
      // Return the updated local state
      return prev.filter((_, index) => index !== indexToDelete);
    });

    if (fileToDelete) {
        URL.revokeObjectURL(fileToDelete.previewUrl); // Clean up object URL immediately

        // Update global state by filtering out the deleted file from the correct array
         const updateGlobalState = (type: 'image' | 'video') => {
             const key = type === 'image' ? 'additionalPhotos' : 'additionalVideos';
             const currentGlobalFiles = (recordData[key] || []).filter(f => f instanceof File) as File[];
             const updatedFiles = currentGlobalFiles.filter(file =>
                 !(file.name === (fileToDelete as MediaFile).file.name && file.size === (fileToDelete as MediaFile).file.size)
             );
             updateRecordData({ [key]: updatedFiles });
         };

         updateGlobalState(fileToDelete.type);

         toast({
            title: "Dosya Silindi",
            description: `'${fileToDelete.file.name}' başarıyla kaldırıldı.`,
            variant: "destructive"
        });
    }
  };


  const onSubmit = () => {
    console.log("Submitting Step 3 Data - Media Files:", mediaFiles.map(mf => mf.file.name));
    // Global state should already be up-to-date via handleFileChange/handleDeleteFile
    // Verify and finalize state before navigating
     const currentPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File) as File[];
     const currentVideos = (recordData.additionalVideos || []).filter(f => f instanceof File) as File[];
     const localPhotoFiles = mediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file);
     const localVideoFiles = mediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file);

     // Simple check if lengths match (could be more robust if needed)
     if (currentPhotos.length !== localPhotoFiles.length || currentVideos.length !== localVideoFiles.length) {
         console.warn("State mismatch detected before submitting step 3. Re-syncing global state.");
         updateRecordData({
           additionalPhotos: localPhotoFiles,
           additionalVideos: localVideoFiles,
         });
     }

    router.push('/new-record/step-4'); // Navigate to Step 4 (Final Form)
  };

  const goBack = () => {
     // Ensure state is saved before going back (though it should be already)
      const localPhotoFiles = mediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file);
      const localVideoFiles = mediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file);
      updateRecordData({
        additionalPhotos: localPhotoFiles,
        additionalVideos: localVideoFiles,
      });
    router.push('/new-record/step-2');
  };

  // Redirect if essential data is missing
  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
        toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
        router.push('/select-branch');
    }
    // Sync logic moved to initialization useEffect
  }, [branch, recordData.chassisNumber, router, toast]); // Removed dependency on file arrays to avoid loops

  if (!branch || !recordData.chassisNumber) {
    return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <Progress value={progress} className="w-full max-w-2xl mb-4" />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileUp className="text-primary" /> {/* Combined Icon */}
            Yeni Kayıt - Adım 3: Ek Dosya Yükleme (İsteğe Bağlı)
          </CardTitle>
          <CardDescription>
             Varsa araca ait ek fotoğraf veya videoları yükleyebilirsiniz. Bu adımı atlayabilirsiniz.
             (Şube: {branch}, Şase: {recordData.chassisNumber})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            {/* No actual form submission needed here, just managing files */}
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
              <FormItem>
                <FormLabel>Ek Dosyalar (Fotoğraf/Video)</FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                    <Input
                      type="file"
                      accept={ACCEPTED_MEDIA_TYPES.join(',')} // Accept both image and video
                      ref={mediaInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                      multiple // Allow multiple file selection
                    />
                     {/* Combined Buttons */}
                     <div className="flex flex-wrap justify-center gap-2">
                        <Button type="button" variant="outline" onClick={() => mediaInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Dosya Seç (Fotoğraf/Video)
                        </Button>
                        <Button type="button" variant="outline" onClick={() => toast({ title: 'Yakında', description: 'Kamera ile fotoğraf çekme özelliği eklenecektir.' })}>
                            <Camera className="mr-2 h-4 w-4" /> Kamera ile Fotoğraf Çek
                        </Button>
                         <Button type="button" variant="outline" onClick={() => toast({ title: 'Yakında', description: 'Kamera ile video kayıt özelliği eklenecektir.' })}>
                            <Video className="mr-2 h-4 w-4" /> Kamera ile Video Kaydet
                        </Button>
                    </div>
                  </div>
                </FormControl>
              </FormItem>

              {uploadError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Yükleme Hatası</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {/* Display uploaded files */}
              {mediaFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-medium">Yüklenen Dosyalar ({mediaFiles.length}):</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {mediaFiles.map((media, index) => (
                      <div key={`${media.file.name}-${media.file.lastModified}-${index}`} className="relative group border rounded-md overflow-hidden aspect-square">
                         {/* Image or Video Thumbnail */}
                         {media.type === 'image' ? (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="absolute inset-0 w-full h-full cursor-pointer" aria-label={`View ${media.file.name}`}>
                                        <Image
                                            src={media.previewUrl}
                                            alt={`Önizleme ${index + 1} - ${media.file.name}`}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-md transition-transform group-hover:scale-105"
                                            unoptimized
                                        />
                                        {/* View Icon Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye className="h-8 w-8 text-white" />
                                        </div>
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh]">
                                     <DialogHeader>
                                         <DialogTitle className="truncate">{media.file.name}</DialogTitle>
                                     </DialogHeader>
                                     <div className="relative aspect-video w-full h-auto mt-4">
                                         <Image
                                             src={media.previewUrl}
                                             alt={`Tam Boyutlu Önizleme - ${media.file.name}`}
                                             fill
                                             style={{ objectFit: 'contain' }}
                                             unoptimized
                                         />
                                     </div>
                                </DialogContent>
                            </Dialog>
                         ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2">
                                <Film className="w-1/2 h-1/2 mb-1" />
                                <span className="text-xs text-center break-all line-clamp-2">{media.file.name}</span>
                                <span className="text-xs mt-1">(Video - Önizleme Yok)</span>
                            </div>
                         )}

                         {/* Delete Button */}
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Sil"
                                    onClick={(e) => e.stopPropagation()} // Prevent triggering dialog when clicking delete
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu '{media.file.name}' dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteFile(index)} className="bg-destructive hover:bg-destructive/90">
                                    Sil
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                 <Button type="button" variant="outline" onClick={goBack}>
                     Geri
                </Button>
                <Button type="submit" className="w-full bg-green-500">
                  Devam Et
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

       {/* Image Preview Dialog (Re-using AlertDialog structure for simplicity) */}
       {/* {previewImage && (
           <AlertDialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
               <AlertDialogContent className="max-w-3xl">
                   <AlertDialogHeader>
                       <AlertDialogTitle className="truncate">{previewImage.file.name}</AlertDialogTitle>
                   </AlertDialogHeader>
                   <div className="relative aspect-video w-full h-auto mt-4">
                       <Image
                           src={previewImage.previewUrl}
                           alt={`Tam Boyutlu Önizleme - ${previewImage.file.name}`}
                           fill
                           style={{ objectFit: 'contain' }}
                           unoptimized
                       />
                   </div>
                   <AlertDialogFooter>
                       <AlertDialogCancel onClick={() => setPreviewImage(null)}>Kapat</AlertDialogCancel>
                   </AlertDialogFooter>
               </AlertDialogContent>
           </AlertDialog>
       )} */}
    </div>
  );
}
