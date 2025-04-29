
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, Video, Image as ImageIcon, Trash2, AlertCircle, Film, FileUp } from 'lucide-react'; // Added Film and FileUp icons
import { useAppState, RecordData } from '@/hooks/use-app-state';
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

  // Use a simple form instance, no schema needed here as we manage files directly
  const form = useForm();

  const mediaInputRef = React.useRef<HTMLInputElement>(null); // Single ref for combined input

  // Initialize mediaFiles state from global state on component mount
  React.useEffect(() => {
    const initialMedia: MediaFile[] = [];
    const addFilesToMedia = (files: (File | { name: string })[] | undefined, type: 'image' | 'video') => {
      files?.forEach(fileData => {
        if (fileData instanceof File) {
           // Check if this file is already in the mediaFiles state by name and size
           if (!mediaFiles.some(mf => mf.file.name === fileData.name && mf.file.size === fileData.size)) {
             const previewUrl = URL.createObjectURL(fileData);
             initialMedia.push({ file: fileData, previewUrl, type });
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
        setMediaFiles(prev => [...prev, ...initialMedia]);
     }

    // Cleanup object URLs on unmount
    return () => {
      mediaFiles.forEach(mf => URL.revokeObjectURL(mf.previewUrl));
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

       Array.from(files).forEach(file => {
          let fileType: 'image' | 'video' | null = null;
          if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
              fileType = 'image';
          } else if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
              fileType = 'video';
          }

         if (!fileType) {
           setUploadError(`Desteklenmeyen dosya türü: ${file.name}. Sadece resim veya video dosyaları kabul edilir.`);
           errorFound = true;
           return; // Skip this file
         }

         const previewUrl = URL.createObjectURL(file);
         newMediaFiles.push({ file, previewUrl, type: fileType });
       });

       if (!errorFound) {
         setMediaFiles(prev => [...prev, ...newMediaFiles]);
         // Update global state immediately, separating into photos and videos
         const currentPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File);
         const currentVideos = (recordData.additionalVideos || []).filter(f => f instanceof File);

         const addedPhotos = newMediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file);
         const addedVideos = newMediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file);

         updateRecordData({
             additionalPhotos: [...currentPhotos, ...addedPhotos] as File[],
             additionalVideos: [...currentVideos, ...addedVideos] as File[]
          });
       }
     }
       // Reset file input to allow selecting the same file again
       if (event.target) {
         event.target.value = '';
       }
   };

  const handleDeleteFile = (indexToDelete: number) => {
    setMediaFiles(prev => {
      const fileToDelete = prev[indexToDelete];
      if (fileToDelete) {
        URL.revokeObjectURL(fileToDelete.previewUrl); // Clean up object URL

        // Update global state by filtering out the deleted file from the correct array
        if (fileToDelete.type === 'image') {
            const updatedPhotos = (recordData.additionalPhotos || [])
                .filter(f => f instanceof File) // Work only with File objects
                .filter(file => !(file.name === fileToDelete.file.name && file.size === fileToDelete.file.size));
             updateRecordData({ additionalPhotos: updatedPhotos });
        } else {
             const updatedVideos = (recordData.additionalVideos || [])
                 .filter(f => f instanceof File) // Work only with File objects
                 .filter(file => !(file.name === fileToDelete.file.name && file.size === fileToDelete.file.size));
             updateRecordData({ additionalVideos: updatedVideos });
        }
      }
      // Return the updated local state
      return prev.filter((_, index) => index !== indexToDelete);
    });
    toast({
        title: "Dosya Silindi",
        description: "Seçili dosya başarıyla kaldırıldı.",
        variant: "destructive"
    });
  };


  const onSubmit = () => {
    console.log("Submitting Step 3 Data - Media Files:", mediaFiles.map(mf => mf.file.name));
    // Global state is already updated in handleFileChange/handleDeleteFile
    // Just need to ensure it's finalized before navigating
     updateRecordData({
       additionalPhotos: mediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file),
       additionalVideos: mediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file),
     });
    router.push('/new-record/step-4'); // Navigate to Step 4 (Final Form)
  };

  const goBack = () => {
     // Save current media state before going back
      updateRecordData({
        additionalPhotos: mediaFiles.filter(mf => mf.type === 'image').map(mf => mf.file),
        additionalVideos: mediaFiles.filter(mf => mf.type === 'video').map(mf => mf.file),
      });
    router.push('/new-record/step-2');
  };

  // Redirect if essential data is missing
  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
      router.push('/select-branch');
    }
    // Sync local mediaFiles state if global state changes externally (e.g., browser back/forward)
    const globalPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File) as File[];
    const globalVideos = (recordData.additionalVideos || []).filter(f => f instanceof File) as File[];
    const currentLocalFiles = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

    const newMediaToAdd: MediaFile[] = [];

     globalPhotos.forEach(file => {
        if (!currentLocalFiles.has(`${file.name}-${file.size}`)) {
            const previewUrl = URL.createObjectURL(file);
            newMediaToAdd.push({ file, previewUrl, type: 'image' });
        }
    });
     globalVideos.forEach(file => {
         if (!currentLocalFiles.has(`${file.name}-${file.size}`)) {
            const previewUrl = URL.createObjectURL(file);
            newMediaToAdd.push({ file, previewUrl, type: 'video' });
         }
     });

     if (newMediaToAdd.length > 0) {
         setMediaFiles(prev => [...prev, ...newMediaToAdd]);
     }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, recordData.chassisNumber, recordData.additionalPhotos, recordData.additionalVideos, router]);

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
            Yeni Kayıt - Adım 3: Ek Dosya Yükleme
          </CardTitle>
          <CardDescription>
             Varsa araca ait ek fotoğraf veya videoları yükleyebilirsiniz.
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
                      <div key={index} className="relative group border rounded-md overflow-hidden aspect-square">
                        {media.type === 'image' ? (
                          <Image
                            src={media.previewUrl}
                            alt={`Önizleme ${index + 1}`}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="rounded-md"
                            unoptimized
                          />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2">
                              <Film className="w-1/2 h-1/2 mb-1" /> {/* Using Film icon for video */}
                              <span className="text-xs text-center break-all line-clamp-2">{media.file.name}</span>
                           </div>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Sil"
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
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Devam Et
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
