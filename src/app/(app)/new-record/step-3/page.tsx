
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
import { Upload, Camera, Video, Image as ImageIcon, Trash2, AlertCircle, Film, FileUp, Eye, FileText } from 'lucide-react'; // Added Eye icon
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
    DialogClose,
} from "@/components/ui/dialog";
import { getSerializableFileInfo } from '@/lib/utils';


// Define acceptable file types
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ACCEPTED_MEDIA_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

// Helper function to generate preview URL safely
const generatePreviewUrl = (file: File): string | null => {
    try {
        return URL.createObjectURL(file);
    } catch (error) {
        console.error("Error creating object URL:", error);
        return null;
    }
};

// Helper function to revoke preview URL safely
const revokePreviewUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
        try {
            console.log("Revoking object URL:", url); // Add log
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error revoking object URL:", error);
        }
    }
};

export default function NewRecordStep3() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState(); // RecordData type is implicitly used via useAppState
  const [progress] = React.useState(43); // Step 3 of 7 (approx 43%) - Adjusted progress
  const [mediaFiles, setMediaFiles] = React.useState<MediaFile[]>([]); // For additional photos/videos
  const [typeApprovalDoc, setTypeApprovalDoc] = React.useState<File | null>(null); // Separate state for type approval doc
  const [typeApprovalDocInfo, setTypeApprovalDocInfo] = React.useState<{ name: string; type?: string; size?: number } | null>(null); // For persisted info
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = React.useState<{ url: string; type: 'image' | 'video', name: string, wasTemporaryUrlGenerated?: boolean } | null>(null); // State for media preview modal


  // Use a simple form instance, no schema needed here as we manage files directly
  const form = useForm();

  const typeApprovalInputRef = React.useRef<HTMLInputElement>(null);
  const additionalMediaInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize state from global state on component mount AND when relevant recordData changes
   React.useEffect(() => {
        console.log("Step 3 Effect - Initializing/Updating state from recordData:", recordData);

        // Initialize Type Approval Document
        const taDoc = recordData.typeApprovalDocument;
        let currentTypeApprovalDocIsFile = typeApprovalDoc instanceof File;
        let currentTypeApprovalDocInfoIsSet = !!typeApprovalDocInfo;

        if (taDoc instanceof File) {
            // Only update if the file is different or if the current state is not a file
            if (!currentTypeApprovalDocIsFile || typeApprovalDoc?.name !== taDoc.name || typeApprovalDoc?.size !== taDoc.size) {
                setTypeApprovalDoc(taDoc);
            }
            if (currentTypeApprovalDocInfoIsSet) {
                setTypeApprovalDocInfo(null); // Clear info if we now have a file
            }
        } else if (typeof taDoc === 'object' && taDoc?.name) {
            // Only update if the info is different or if the current state is a file
            if (currentTypeApprovalDocIsFile || typeApprovalDocInfo?.name !== taDoc.name) {
                setTypeApprovalDocInfo(taDoc);
            }
            if (currentTypeApprovalDocIsFile) {
                setTypeApprovalDoc(null); // Clear file if we now have info
            }
        } else {
            // Clear both if taDoc is null/undefined
            if (currentTypeApprovalDocIsFile) {
                setTypeApprovalDoc(null);
            }
            if (currentTypeApprovalDocInfoIsSet) {
                setTypeApprovalDocInfo(null);
            }
        }

       // Initialize Additional Media Files from global state (only if they are File objects)
       // Create preview URLs for any File objects in the global state
       const initialMediaFiles: MediaFile[] = [];
       const processFiles = (files: (File | { name: string; type?: string; size?: number })[] | undefined, type: 'image' | 'video') => {
           (files || []).forEach(fileData => {
               if (fileData instanceof File) {
                   const previewUrl = generatePreviewUrl(fileData);
                   if (previewUrl) {
                       initialMediaFiles.push({ file: fileData, previewUrl, type });
                   }
               }
               // Ignore persisted info objects here, as we only need preview URLs for File objects
           });
       };
       processFiles(recordData.additionalPhotos, 'image');
       processFiles(recordData.additionalVideos, 'video');

       // Update local state only if it's different from the processed global state
        // This comparison is basic and might need refinement if order matters or objects are complex
       const currentMediaFileNames = mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`).sort();
       const initialMediaFileNames = initialMediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`).sort();

        if (JSON.stringify(currentMediaFileNames) !== JSON.stringify(initialMediaFileNames)) {
             // Revoke old URLs before setting new ones
             mediaFiles.forEach(mf => revokePreviewUrl(mf.previewUrl));
             setMediaFiles(initialMediaFiles);
             console.log("Step 3 Effect - Updated mediaFiles state with initial previews.");
        }

        // REMOVED `mediaFiles` from dependency array to prevent infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [recordData.typeApprovalDocument, recordData.additionalPhotos, recordData.additionalVideos]);


    // Cleanup function for mediaFiles URLs on unmount or when mediaFiles state changes drastically
    React.useEffect(() => {
        const urlsToRevoke = mediaFiles.map(mf => mf.previewUrl);
        return () => {
            console.log("Step 3 mediaFiles Effect Cleanup: Revoking URLs for unmounted media.");
            urlsToRevoke.forEach(revokePreviewUrl);
        };
    }, [mediaFiles]);


    // --- Handlers for Type Approval Document ---
    const handleTypeApprovalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setUploadError(null); // Clear previous errors

        if (file) {
             setTypeApprovalDoc(file);
             setTypeApprovalDocInfo(null); // Clear info when new File is selected
             updateRecordData({ typeApprovalDocument: file });
             console.log("Type Approval Document selected:", file.name);
        } else {
             // If selection is cancelled, don't change the state unless explicitly removed
             console.log("Type Approval Document selection cancelled.");
        }
         // Reset file input
        if (event.target) event.target.value = '';
    };

    const handleDeleteTypeApprovalDoc = () => {
        setTypeApprovalDoc(null);
        setTypeApprovalDocInfo(null);
        updateRecordData({ typeApprovalDocument: undefined }); // Explicitly remove from global state
        toast({ title: "Dosya Kaldırıldı", description: "Tip Onay Belgesi kaldırıldı.", variant: "destructive" });
    };

   // --- Handlers for Additional Media Files ---
   const handleAdditionalMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const files = event.target.files;
     setUploadError(null); // Clear previous errors

     if (files) {
       const newMediaFilesToAdd: MediaFile[] = [];
       let errorFound = false;
       const currentKeys = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

       Array.from(files).forEach(file => {
          const fileKey = `${file.name}-${file.size}`;
          if (currentKeys.has(fileKey)) {
              console.log(`Skipping duplicate file: ${file.name}`);
              return; // Skip duplicates already in the local state
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
           newMediaFilesToAdd.forEach(nmf => revokePreviewUrl(nmf.previewUrl));
           return; // Stop processing this batch
         }

         const previewUrl = generatePreviewUrl(file);
         if (!previewUrl) {
            console.error("Error creating object URL for additional media:", file.name);
            setUploadError(`Dosya için önizleme oluşturulamadı: ${file.name}`);
            errorFound = true;
            newMediaFilesToAdd.forEach(nmf => revokePreviewUrl(nmf.previewUrl));
            return;
         }
         newMediaFilesToAdd.push({ file, previewUrl, type: fileType });
         currentKeys.add(fileKey); // Add new key to prevent duplicates within the same batch
       });


       if (errorFound) {
           toast({
               title: 'Yükleme Hatası',
               description: uploadError || "Desteklenmeyen dosya türü veya önizleme hatası.",
               variant: 'destructive',
           });
           // Reset file input
           if (event.target) event.target.value = '';
           return; // Exit if an error was found
       }

       if (newMediaFilesToAdd.length > 0) {
         setMediaFiles(prev => [...prev, ...newMediaFilesToAdd]);
         // Update global state immediately, separating into photos and videos
         const addedPhotos = newMediaFilesToAdd.filter(mf => mf.type === 'image').map(mf => mf.file);
         const addedVideos = newMediaFilesToAdd.filter(mf => mf.type === 'video').map(mf => mf.file);

         // Get current File objects from global state to append to
         const currentGlobalPhotos = (recordData.additionalPhotos || []).filter(f => f instanceof File) as File[];
         const currentGlobalVideos = (recordData.additionalVideos || []).filter(f => f instanceof File) as File[];

         updateRecordData({
             additionalPhotos: [...currentGlobalPhotos, ...addedPhotos],
             additionalVideos: [...currentGlobalVideos, ...addedVideos]
          });
       }
     }

    // Reset file input
    if (event.target) event.target.value = '';
   };

  const handleDeleteAdditionalMedia = (indexToDelete: number) => {
    let fileToDelete: MediaFile | null = null;

    setMediaFiles(prev => {
        const newState = prev.filter((_, index) => index !== indexToDelete);
        fileToDelete = prev[indexToDelete]; // Capture the file to delete from the *old* state
        if (fileToDelete) {
            revokePreviewUrl(fileToDelete.previewUrl); // Clean up object URL immediately
        }
        return newState; // Return the updated local state
    });

    if (fileToDelete) {
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
    console.log("Submitting Step 3 Data");
    // Global state is already updated via handlers, just navigate
    router.push('/new-record/step-4');
  };

  const goBack = () => {
    // State should be saved already
    router.push('/new-record/step-2');
  };

 // Open Preview Dialog - Refactored to avoid direct state setting from interaction
const openPreview = (item: MediaFile | { name: string; type?: string; size?: number } | File | string | null) => {
    if (!item) return;

    let urlToUse: string | null = null;
    let nameToUse: string = 'Dosya';
    let typeToUse: 'image' | 'video' = 'image'; // Default to image
    let wasTemporaryUrlGenerated = false;

    // Determine URL, name, and type based on the item type
    if (typeof item === 'string') {
        urlToUse = item;
        // Basic type/name guessing from URL
        if (urlToUse.includes('.mp4') || urlToUse.includes('.webm') || urlToUse.includes('.ogg') || urlToUse.includes('.mov')) typeToUse = 'video';
        try { nameToUse = new URL(urlToUse).pathname.split('/').pop() || 'Önizleme'; } catch { /* ignore */ }
    } else if (item instanceof File) {
        urlToUse = generatePreviewUrl(item);
        wasTemporaryUrlGenerated = !!urlToUse; // True if URL generation succeeded
        nameToUse = item.name;
        typeToUse = item.type.startsWith('video/') ? 'video' : 'image';
    } else if ('previewUrl' in item && typeof item.previewUrl === 'string') { // MediaFile from local state
        urlToUse = item.previewUrl;
        nameToUse = item.file.name;
        typeToUse = item.type;
    } else if ('name' in item && item.name) { // Persisted info or other object
        nameToUse = item.name;
        typeToUse = item.type?.startsWith('video/') ? 'video' : 'image';
        // No preview possible for persisted info without backend integration
        toast({ title: "Önizleme Yok", description: "Kaydedilmiş dosya için direkt önizleme mevcut değil.", variant: "default" });
        return;
    }

    // Check if a valid URL was determined
    if (!urlToUse) {
        toast({ title: "Önizleme Hatası", description: "Dosya önizlemesi oluşturulamadı veya URL bulunamadı.", variant: "destructive" });
        return;
    }

    // Set the preview state
    setPreviewMedia({ url: urlToUse, type: typeToUse, name: nameToUse, wasTemporaryUrlGenerated });

    if (wasTemporaryUrlGenerated) {
        console.log("Preview opened with temporary blob URL. Will revoke on close.");
    }
};


   // Get display name for files (File or Info object)
   const getFileName = (fileData: File | { name: string; type?: string; size?: number } | undefined | null): string => {
       if (fileData instanceof File) {
           return fileData.name;
       } else if (typeof fileData === 'object' && fileData?.name) {
           return fileData.name;
       }
       return 'Yok';
   };

  // Redirect if essential data is missing
  React.useEffect(() => {
    if (!branch || !recordData.chassisNumber) {
        toast({ title: "Eksik Bilgi", description: "Şube veya Şase numarası bulunamadı. Başlangıca yönlendiriliyor...", variant: "destructive" });
        router.push('/select-branch');
    }
  }, [branch, recordData.chassisNumber, router, toast]);

  if (!branch || !recordData.chassisNumber) {
    return <div className="flex min-h-screen items-center justify-center p-4">Gerekli bilgiler eksik, yönlendiriliyorsunuz...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-8">
       <Progress value={progress} className="w-full max-w-4xl mb-4" />
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileUp className="text-primary" />
            Yeni Kayıt - Adım 3: Ek Dosya Yükleme (İsteğe Bağlı)
          </CardTitle>
          <CardDescription>
             Varsa Tip Onay Belgesi, araca ait ek fotoğraf veya videoları yükleyebilirsiniz. Bu adımı atlayabilirsiniz.
             (Şube: {branch}, Şase: {recordData.chassisNumber})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">
               {/* Type Approval Document Upload */}
               <FormItem>
                   <FormLabel className="text-lg font-medium">Tip Onay Belgesi</FormLabel>
                   <FormControl>
                       <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                           {/* Display selected file name or placeholder */}
                           {(typeApprovalDoc || typeApprovalDocInfo) ? (
                               <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-2 bg-background">
                                    <FileText className="h-4 w-4 text-green-600"/>
                                    <span className="truncate max-w-xs">{getFileName(typeApprovalDoc || typeApprovalDocInfo)}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleDeleteTypeApprovalDoc} title="Tip Onay Belgesini Kaldır">
                                         <Trash2 className="h-4 w-4"/>
                                     </Button>
                                </div>
                           ) : (
                               <p className="text-sm text-muted-foreground">Tip Onay Belgesi yüklemek için tıklayın.</p>
                           )}
                           <Input
                               type="file"
                               // Consider restricting to specific types if needed (e.g., PDF, images)
                               // accept="application/pdf,image/*"
                               ref={typeApprovalInputRef}
                               onChange={handleTypeApprovalFileChange}
                               className="hidden"
                               id="type-approval-upload"
                           />
                           <Button type="button" variant="outline" onClick={() => typeApprovalInputRef.current?.click()}>
                               <Upload className="mr-2 h-4 w-4" /> {(typeApprovalDoc || typeApprovalDocInfo) ? 'Değiştir' : 'Dosya Seç'}
                           </Button>
                       </div>
                   </FormControl>
               </FormItem>

              {/* Additional Media Upload */}
              <FormItem>
                <FormLabel className="text-lg font-medium">Ek Dosyalar (Fotoğraf/Video)</FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-6">
                    <Input
                      type="file"
                      accept={ACCEPTED_MEDIA_TYPES.join(',')}
                      ref={additionalMediaInputRef}
                      onChange={handleAdditionalMediaChange}
                      className="hidden"
                      id="media-upload"
                      multiple
                    />
                     <div className="flex flex-wrap justify-center gap-2">
                        <Button type="button" variant="outline" onClick={() => additionalMediaInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Dosya Seç (Fotoğraf/Video)
                        </Button>
                        <Button type="button" variant="outline" onClick={() => toast({ title: 'Yakında', description: 'Kamera ile fotoğraf çekme özelliği eklenecektir.' })}>
                            <Camera className="mr-2 h-4 w-4" /> Kamera ile Fotoğraf Çek
                        </Button>
                         <Button type="button" variant="outline" onClick={() => toast({ title: 'Yakında', description: 'Kamera ile video kayıt özelliği eklenecektir.' })}>
                            <Video className="mr-2 h-4 w-4" /> Kamera ile Video Kaydet
                        </Button>
                    </div>
                     {uploadError && (
                         <Alert variant="destructive" className="mt-4 w-full">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Yükleme Hatası!</AlertTitle>
                             <AlertDescription>{uploadError}</AlertDescription>
                         </Alert>
                     )}
                  </div>
                </FormControl>
              </FormItem>


              {/* Display uploaded additional files */}
              {mediaFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-medium">Yüklenen Ek Dosyalar ({mediaFiles.length}):</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {mediaFiles.map((media, index) => (
                      <div key={`${media.file.name}-${media.file.lastModified}-${index}`} className="relative group border rounded-md overflow-hidden aspect-square flex flex-col items-center justify-center">
                         {/* Image or Video Thumbnail/Icon */}
                         {media.type === 'image' ? (
                             <div className="relative w-full h-full cursor-pointer" onClick={() => openPreview(media)}>
                                 <Image
                                     src={media.previewUrl}
                                     alt={`Önizleme ${index + 1} - ${media.file.name}`}
                                     fill
                                     style={{ objectFit: 'cover' }}
                                     className="transition-transform group-hover:scale-105"
                                     unoptimized
                                     data-ai-hint="uploaded vehicle photo"
                                     onError={(e) => console.error("Error loading image:", e)} // Add onError
                                 />
                                 {/* View Icon Overlay */}
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Eye className="h-8 w-8 text-white" />
                                 </div>
                            </div>
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2 cursor-pointer" onClick={() => openPreview(media)}>
                                <Film className="w-1/2 h-1/2 mb-1 text-primary" />
                                <span className="text-xs text-center break-all line-clamp-2">{media.file.name}</span>
                                <span className="text-xs mt-1">(Video)</span>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="h-8 w-8 text-white" />
                                </div>
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
                                <AlertDialogAction onClick={() => handleDeleteAdditionalMedia(index)} className="bg-destructive hover:bg-destructive/90">
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

              <div className="flex justify-between pt-8">
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

       {/* Media Preview Dialog */}
        {previewMedia && (
            <Dialog open={!!previewMedia} onOpenChange={(open) => {
                if (!open) {
                     // Revoke temporary blob URL if it was generated *for this preview instance*
                     if (previewMedia.wasTemporaryUrlGenerated && previewMedia.url?.startsWith('blob:')) {
                        console.log("Closing preview dialog, revoking temporary URL:", previewMedia.url);
                         revokePreviewUrl(previewMedia.url);
                     }
                     setPreviewMedia(null); // Clear the preview state
                }
            }}>
               <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                   <DialogHeader>
                       <DialogTitle className="truncate">{previewMedia.name}</DialogTitle>
                   </DialogHeader>
                   <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black">
                       {previewMedia.type === 'image' ? (
                           <Image
                               src={previewMedia.url || ''} // Handle potential undefined URL gracefully
                               alt={`Önizleme - ${previewMedia.name}`}
                               width={1200} // Adjust width as needed
                               height={800} // Adjust height as needed
                               style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                               unoptimized // Important for blob URLs and potentially external URLs
                               data-ai-hint="media preview image"
                               onError={(e) => { console.error("Error loading image preview:", previewMedia.url, e); toast({title: "Hata", description:"Resim yüklenemedi.", variant:"destructive"})}}
                           />
                       ) : (
                           <video controls className="max-w-full max-h-full" autoPlay>
                               <source src={previewMedia.url} type={previewMedia.name?.endsWith('.mp4') ? 'video/mp4' : previewMedia.name?.endsWith('.webm') ? 'video/webm' : previewMedia.name?.endsWith('.mov') ? 'video/quicktime' : 'video/ogg'} />
                               Tarayıcınız video etiketini desteklemiyor.
                           </video>
                       )}
                   </div>
                    <DialogClose asChild>
                       <Button type="button" variant="outline" className="mt-4">Kapat</Button>
                    </DialogClose>
               </DialogContent>
           </Dialog>
        )}
    </div>
  );
}
