
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
    DialogTrigger,
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

export default function NewRecordStep3() {
  const router = useRouter();
  const { toast } = useToast();
  const { branch, recordData, updateRecordData } = useAppState();
  const [progress] = React.useState(50); // Step 3 of 7 (approx 43%)
  const [mediaFiles, setMediaFiles] = React.useState<MediaFile[]>([]); // For additional photos/videos
  const [typeApprovalDoc, setTypeApprovalDoc] = React.useState<File | null>(null); // Separate state for type approval doc
  const [typeApprovalDocInfo, setTypeApprovalDocInfo] = React.useState<{ name: string; type?: string; size?: number } | null>(null); // For persisted info
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = React.useState<MediaFile | { url: string; type: 'image' | 'video', name: string } | null>(null); // State for media preview modal

  // Use a simple form instance, no schema needed here as we manage files directly
  const form = useForm();

  const typeApprovalInputRef = React.useRef<HTMLInputElement>(null);
  const additionalMediaInputRef = React.useRef<HTMLInputElement>(null);


  // Initialize state from global state on component mount
  React.useEffect(() => {
    // Initialize Type Approval Document
    const taDoc = recordData.typeApprovalDocument;
    if (taDoc instanceof File) {
        setTypeApprovalDoc(taDoc);
        setTypeApprovalDocInfo(null); // Clear info if File exists
    } else if (typeof taDoc === 'object' && taDoc?.name) {
        setTypeApprovalDoc(null); // Clear File if only info exists
        setTypeApprovalDocInfo(taDoc);
    } else {
         setTypeApprovalDoc(null);
         setTypeApprovalDocInfo(null);
    }


    // Initialize Additional Media Files
    const initialMedia: MediaFile[] = [];
    const existingMediaKeys = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

    const addFilesToMedia = (files: (File | { name: string })[] | undefined, type: 'image' | 'video') => {
      files?.forEach(fileData => {
        if (fileData instanceof File) {
          const fileKey = `${fileData.name}-${fileData.size}`;
          if (!existingMediaKeys.has(fileKey)) {
            try {
              const previewUrl = URL.createObjectURL(fileData);
              initialMedia.push({ file: fileData, previewUrl, type });
              existingMediaKeys.add(fileKey); // Add to set to prevent duplicates within this init phase
            } catch (error) {
                console.error("Error creating object URL for initial media:", fileData.name, error);
            }
          }
        }
        // Note: We cannot recreate previews for non-File objects (persisted info)
      });
    };

    // Retrieve files from global state and determine their type
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
          currentMediaFiles.forEach(mf => {
              try { URL.revokeObjectURL(mf.previewUrl) } catch {} // Ignore errors on revoke
            });
          return []; // Clear the array after cleanup
      });
    };
    // Run only on mount, state updates handled separately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only on mount

    // Revoke object URLs when files are removed from mediaFiles state
    React.useEffect(() => {
        return () => {
            mediaFiles.forEach(mf => {
                try { URL.revokeObjectURL(mf.previewUrl) } catch {}
            });
        };
    }, [mediaFiles]); // Dependency on mediaFiles


    // --- Handlers for Type Approval Document ---
    const handleTypeApprovalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setUploadError(null); // Clear previous errors

        if (file) {
            // Basic type check (optional, can rely on accept attribute)
            // if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            //     setUploadError(`Desteklenmeyen dosya türü: ${file.name}. Sadece resim dosyaları kabul edilir.`);
            //     toast({ title: 'Yükleme Hatası', description: 'Lütfen bir resim dosyası seçin.', variant: 'destructive' });
            //     setTypeApprovalDoc(null);
            //     updateRecordData({ typeApprovalDocument: undefined });
            //     return;
            // }
             setTypeApprovalDoc(file);
             setTypeApprovalDocInfo(null); // Clear info when new File is selected
             updateRecordData({ typeApprovalDocument: file });
             console.log("Type Approval Document selected:", file.name);
        } else {
             setTypeApprovalDoc(null);
             // Don't clear info if selection was cancelled, keep existing info
             // updateRecordData({ typeApprovalDocument: undefined }); // Only clear if explicitly removed
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
       const newMediaFiles: MediaFile[] = [];
       let errorFound = false;
       const currentKeys = new Set(mediaFiles.map(mf => `${mf.file.name}-${mf.file.size}`));

       Array.from(files).forEach(file => {
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
           newMediaFiles.forEach(nmf => { try { URL.revokeObjectURL(nmf.previewUrl) } catch {} });
           return; // Stop processing this batch
         }

         try {
             const previewUrl = URL.createObjectURL(file);
             newMediaFiles.push({ file, previewUrl, type: fileType });
             currentKeys.add(fileKey); // Add new key to prevent duplicates within the same batch
         } catch (error) {
              console.error("Error creating object URL for additional media:", file.name, error);
               setUploadError(`Dosya için önizleme oluşturulamadı: ${file.name}`);
               errorFound = true;
               newMediaFiles.forEach(nmf => { try { URL.revokeObjectURL(nmf.previewUrl) } catch {} });
               return;
         }
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

       if (newMediaFiles.length > 0) {
         setMediaFiles(prev => [...prev, ...newMediaFiles]);
         // Update global state immediately, separating into photos and videos
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

    // Reset file input
    if (event.target) event.target.value = '';
   };

  const handleDeleteAdditionalMedia = (indexToDelete: number) => {
    let fileToDelete: MediaFile | null = null;

    setMediaFiles(prev => {
      fileToDelete = prev[indexToDelete]; // Capture the file to delete
      if (fileToDelete) {
          try { URL.revokeObjectURL(fileToDelete.previewUrl); } catch {} // Clean up object URL immediately
      }
      // Return the updated local state
      return prev.filter((_, index) => index !== indexToDelete);
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

  // Open Preview Dialog
  const openPreview = (item: MediaFile | { name: string; type?: string; size?: number } | File | null) => {
       if (!item) return;

       if (item instanceof File) {
            try {
                const url = URL.createObjectURL(item);
                 const type = item.type.startsWith('video/') ? 'video' : 'image';
                 setPreviewMedia({ url: url, type: type, name: item.name });
                 // Revoke URL when dialog closes
                 const originalOnOpenChange = previewMedia?.onOpenChange; // Assuming Dialog has onOpenChange
                 // This part needs adjustment based on the Dialog component used
                 // Example:
                 // setPreviewMedia(prev => ({...prev, onOpenChange: (open) => {
                 //     if (!open) URL.revokeObjectURL(url);
                 //     originalOnOpenChange?.(open);
                 // }}));

             } catch (error) {
                 console.error("Error creating preview URL for File:", error);
                 toast({ title: "Önizleme Hatası", description: "Dosya önizlemesi oluşturulamadı.", variant: "destructive" });
             }
       } else if ('previewUrl' in item) { // It's a MediaFile from local state
           setPreviewMedia(item);
       } else if ('name' in item) { // It's persisted info
           // Try to construct a placeholder URL or indicate preview not available
           console.warn("Cannot generate preview for persisted file info:", item.name);
           // Example: Construct a potential Firebase URL (replace with your actual logic)
            const placeholderUrl = `https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/uploads%2F${encodeURIComponent(item.name)}?alt=media`;
            const type = item.type?.startsWith('video/') ? 'video' : 'image';
            setPreviewMedia({ url: placeholderUrl, type: type, name: item.name });
           // toast({ title: "Önizleme Yok", description: "Kaydedilmiş dosya için önizleme mevcut değil.", variant: "default" });
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

    // Get preview source for registration/label docs from global state
    const getDocPreviewSrc = (docData: File | { name: string; type?: string; size?: number } | undefined): string | null => {
        if (docData instanceof File) {
            try {
                 // IMPORTANT: Creating temporary URLs here. They need cleanup.
                 // Consider moving preview logic entirely to the component rendering the preview.
                 return URL.createObjectURL(docData);
            } catch (error) {
                console.error("Error creating object URL for doc preview:", error);
                return null;
            }
        }
        // Cannot generate preview for persisted info reliably here
        return null;
    };

    const registrationDocPreview = getDocPreviewSrc(recordData.registrationDocument);
    const labelDocPreview = getDocPreviewSrc(recordData.labelDocument);

    // Clean up temporary URLs created by getDocPreviewSrc
    React.useEffect(() => {
        return () => {
            if (registrationDocPreview) URL.revokeObjectURL(registrationDocPreview);
            if (labelDocPreview) URL.revokeObjectURL(labelDocPreview);
        };
    }, [registrationDocPreview, labelDocPreview]);


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

               {/* Display Uploaded Registration and Label Documents */}
                <div className="space-y-4 border p-4 rounded-md bg-secondary/30">
                    <h3 className="text-lg font-medium mb-4">Önceki Adımlarda Yüklenenler</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Registration Document */}
                        <div className="flex flex-col items-center gap-2 border p-3 rounded-md">
                            <FormLabel className="font-semibold">Ruhsat Belgesi (Adım 1)</FormLabel>
                             {registrationDocPreview ? (
                                <div className="relative w-32 h-32 cursor-pointer" onClick={() => openPreview(recordData.registrationDocument)}>
                                    <Image src={registrationDocPreview} alt="Ruhsat Önizleme" fill style={{ objectFit: 'cover' }} className="rounded-md" unoptimized data-ai-hint="vehicle registration document" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <Eye className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            ) : (getFileName(recordData.registrationDocument) !== 'Yok') ? (
                                <div className="w-32 h-32 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-center text-xs p-2">
                                    <FileText className="h-6 w-6 mr-1"/> Önizleme Yok ({getFileName(recordData.registrationDocument)})
                                </div>
                             ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-center text-xs p-2">Yüklenmedi</div>
                            )}
                            <span className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]" title={getFileName(recordData.registrationDocument)}>
                                {getFileName(recordData.registrationDocument)}
                            </span>
                        </div>

                        {/* Label Document */}
                         <div className="flex flex-col items-center gap-2 border p-3 rounded-md">
                            <FormLabel className="font-semibold">Etiket Belgesi (Adım 2)</FormLabel>
                            {labelDocPreview ? (
                                <div className="relative w-32 h-32 cursor-pointer" onClick={() => openPreview(recordData.labelDocument)}>
                                    <Image src={labelDocPreview} alt="Etiket Önizleme" fill style={{ objectFit: 'cover' }} className="rounded-md" unoptimized data-ai-hint="vehicle label document" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <Eye className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            ) : (getFileName(recordData.labelDocument) !== 'Yok') ? (
                                <div className="w-32 h-32 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-center text-xs p-2">
                                     <FileText className="h-6 w-6 mr-1"/> Önizleme Yok ({getFileName(recordData.labelDocument)})
                                </div>
                             ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-center text-xs p-2">Yüklenmedi</div>
                            )}
                             <span className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]" title={getFileName(recordData.labelDocument)}>
                                {getFileName(recordData.labelDocument)}
                             </span>
                        </div>
                    </div>
                </div>

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
                     // Revoke temporary object URL if it was created for previewing a File
                     if (previewMedia && 'previewUrl' in previewMedia && previewMedia.url?.startsWith('blob:')) {
                         try { URL.revokeObjectURL(previewMedia.url); } catch {}
                     }
                     setPreviewMedia(null);
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

    