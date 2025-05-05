
'use client';

import type { ChangeEvent } from 'react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link'; // Import Link
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, CheckCircle, XCircle, Loader2, ScanLine, Search, FileCheck, ArrowLeft } from 'lucide-react'; // Import FileCheck and ArrowLeft icons
import {
  extractDataFromVehicleLicense,
  type ExtractDataFromVehicleLicenseOutput,
} from '@/ai/flows/extract-data-from-vehicle-license';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { initialApprovalData, type ApprovalFormData } from '@/data/approval-data'; // Import shared data

// Interface for data from a single scan
interface ScanData extends ExtractDataFromVehicleLicenseOutput {
  [key: string]: string | undefined;
}

// Updated FormData interface to hold data for two scans
interface FormData {
  scan1: ScanData;
  scan2: ScanData;
}

// Initial state for a single scan
const initialScanData: ScanData = {
  saseNo: '',
  marka: '',
  tipOnayNo: '',
  varyant: '',
  versiyon: '',
};

// Updated initial form data for two scans
const initialFormData: FormData = {
  scan1: { ...initialScanData },
  scan2: { ...initialScanData },
};

type ComparisonResultStatus = 'uygun' | 'uygun değil' | 'bekleniyor' | 'eksik veri';

// Updated comparison result state to include matching tip onay no
interface ComparisonResult {
    status: ComparisonResultStatus;
    matchingTipOnayNo?: string | null;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isScanning1, setIsScanning1] = useState(false);
  const [isScanning2, setIsScanning2] = useState(false);
  const [scannedImage1, setScannedImage1] = useState<string | null>(null);
  const [scannedImage2, setScannedImage2] = useState<string | null>(null);
  // Updated comparison result state initialization
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult>({ status: 'bekleniyor', matchingTipOnayNo: null });
  const { toast } = useToast();
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Check if *any* data exists for a given scan
  const hasAnyScanData = (scan: ScanData): boolean => {
      return Object.values(scan).some(value => !!value);
  }

  // Check if all required fields for comparison are present across both scans
  const hasRequiredComparisonData = (data: FormData): boolean => {
      const marka = data.scan1.marka || data.scan2.marka;
      const tipOnayNo = data.scan2.tipOnayNo || data.scan1.tipOnayNo;
      const varyant = data.scan2.varyant || data.scan1.varyant;
      const versiyon = data.scan2.versiyon || data.scan1.versiyon;
      return !!marka && !!tipOnayNo && !!varyant && !!versiyon;
  }


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, scanIndex: 1 | 2) => {
    const { id, value } = e.target;
    const fieldName = id.replace(`-${scanIndex}`, ''); // Remove '-1' or '-2' suffix
    setFormData(prevData => ({
      ...prevData,
      [`scan${scanIndex}`]: {
        ...prevData[`scan${scanIndex}`],
        [fieldName]: value,
      },
    }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, scanIndex: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setIsScanning = scanIndex === 1 ? setIsScanning1 : setIsScanning2;
    const setScannedImage = scanIndex === 1 ? setScannedImage1 : setScannedImage2;
    const fileInputRef = scanIndex === 1 ? fileInputRef1 : fileInputRef2;

    // Reset relevant states for the specific scan area
    setIsScanning(false); // Ensure scanning state is reset
    // Keep existing manually entered data, only overwrite with scanned data later if scan succeeds
    // setFormData(prevData => ({
    //     ...prevData,
    //     [`scan${scanIndex}`]: { ...initialScanData } // Don't clear on upload
    // }));
    setComparisonResult({ status: 'bekleniyor', matchingTipOnayNo: null }); // Reset comparison when a new image is selected

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result as string;
      setScannedImage(base64Image); // Set image preview *after* successful read
      toast({
        title: `Görsel ${scanIndex} Yüklendi`,
        description: `Görsel taramaya hazır. "Görsel ${scanIndex} Tara" butonuna tıklayın.`,
      });
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        title: 'Dosya Okuma Hatası',
        description: `Görsel ${scanIndex} dosyası okunurken bir hata oluştu.`,
        variant: 'destructive',
      });
      setScannedImage(null); // Clear preview on error
      // Don't clear form data on image read error
      // setFormData(prevData => ({
      //   ...prevData,
      //   [`scan${scanIndex}`]: { ...initialScanData }
      // }));
      // Comparison state is already reset at the start of the function
    };

    // Clear the file input value *after* processing
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleManualScan = async (scanIndex: 1 | 2) => {
    const scannedImage = scanIndex === 1 ? scannedImage1 : scannedImage2;
    const setIsScanning = scanIndex === 1 ? setIsScanning1 : setIsScanning2;
    const isScanning = scanIndex === 1 ? isScanning1 : isScanning2; // Get current scanning state

    if (isScanning) return; // Prevent triggering scan if already scanning

    if (!scannedImage) {
      toast({
        title: `Görsel ${scanIndex} Yok`,
        description: `Lütfen önce taramak için ${scanIndex}. görseli yükleyin.`,
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    // Don't reset form data before scanning, merge results instead
    // setFormData(prevData => ({
    //     ...prevData,
    //     [`scan${scanIndex}`]: { ...initialScanData } // Reset form data for this scan
    // }));
    setComparisonResult({ status: 'bekleniyor', matchingTipOnayNo: null }); // Reset comparison during scan

    try {
      const result = await extractDataFromVehicleLicense({
        licenseImageDataUri: scannedImage,
      });

      // Merge scanned data with existing data based on scanIndex constraints
      setFormData(prevData => {
        const currentScanData = prevData[`scan${scanIndex}`];
        const updatedScanData = { ...currentScanData }; // Start with current data

        if (scanIndex === 1) { // Ruhsat Tarama - Only SaseNo and Marka
          if (result.saseNo) updatedScanData.saseNo = result.saseNo;
          if (result.marka) updatedScanData.marka = result.marka;
          // Explicitly do not update tipOnayNo, varyant, versiyon from scan 1
        } else { // scanIndex === 2 (Etiket Tarama) - Only TipOnayNo, Varyant, Versiyon
          if (result.tipOnayNo) updatedScanData.tipOnayNo = result.tipOnayNo;
          if (result.varyant) updatedScanData.varyant = result.varyant;
          if (result.versiyon) updatedScanData.versiyon = result.versiyon;
           // Explicitly do not update saseNo, marka from scan 2
        }

        return {
          ...prevData,
          [`scan${scanIndex}`]: updatedScanData,
        };
      });


      toast({
        title: `Tarama ${scanIndex} Başarılı`,
        description: `Araç verileri ${scanIndex}. görselden başarıyla okundu ve ilgili alanlar güncellendi.`,
      });
    } catch (error) {
      console.error(`Error extracting data for scan ${scanIndex}:`, error);
      toast({
        title: `Tarama ${scanIndex} Hatası`,
        description: `Araç verileri ${scanIndex}. görselden okunurken bir hata oluştu. Lütfen manuel kontrol edin.`,
        variant: 'destructive',
      });
       // Don't clear form on error
       // setFormData(prevData => ({
       //  ...prevData,
       //  [`scan${scanIndex}`]: { ...initialScanData } // Clear form on error
       // }));
    } finally {
      setIsScanning(false);
    }
  };

  const triggerFileInput = (scanIndex: 1 | 2) => {
    const fileInputRef = scanIndex === 1 ? fileInputRef1 : fileInputRef2;
    fileInputRef.current?.click();
  };

  // Updated comparison logic
  const compareData = useCallback(() => {
    const scan1Data = formData.scan1;
    const scan2Data = formData.scan2;
    const isScanning = isScanning1 || isScanning2;

    // Combine data from both scans, preferring non-empty values
    // Marka优先从 scan1 获取, 其他优先从 scan2 获取
    const combinedData: Partial<ApprovalFormData> = {
        marka: scan1Data.marka || scan2Data.marka || '',
        tipOnayNo: scan2Data.tipOnayNo || scan1Data.tipOnayNo || '',
        varyant: scan2Data.varyant || scan1Data.varyant || '',
        versiyon: scan2Data.versiyon || scan1Data.versiyon || '',
    };

    // Wait if scanning is in progress
    if (isScanning) {
        setComparisonResult({ status: 'bekleniyor', matchingTipOnayNo: null });
        return;
    }

    // Check if we have the *minimum required* data for comparison (Marka + TipOnayNo + Varyant + Versiyon)
    if (!hasRequiredComparisonData(formData)) {
        // If scans are done but still missing required data across *both*, mark as eksik veri
        // Only show 'eksik veri' if at least one scan attempt was made (indicated by an image or some data)
        if (scannedImage1 || scannedImage2 || hasAnyScanData(scan1Data) || hasAnyScanData(scan2Data)) {
             setComparisonResult({ status: 'eksik veri', matchingTipOnayNo: null });
        } else {
            // If no data scanned yet and no images loaded, stay in bekleniyor state
            setComparisonResult({ status: 'bekleniyor', matchingTipOnayNo: null });
        }
        return;
    }

    // Find a match in the approved data list
    const matchingApproval = initialApprovalData.find(approval =>
        approval.marka === combinedData.marka &&
        approval.tipOnayNo === combinedData.tipOnayNo &&
        approval.varyant === combinedData.varyant &&
        approval.versiyon === combinedData.versiyon
    );

    if (matchingApproval) {
        setComparisonResult({ status: 'uygun', matchingTipOnayNo: matchingApproval.tipOnayNo });
    } else {
        setComparisonResult({ status: 'uygun değil', matchingTipOnayNo: null });
    }

  }, [formData, isScanning1, isScanning2, scannedImage1, scannedImage2]); // Added image states as dependencies


  useEffect(() => {
    // Compare data whenever formData, scanning state, or image presence changes
    compareData();
  }, [formData, isScanning1, isScanning2, scannedImage1, scannedImage2, compareData]);


  const getResultIcon = () => {
    const isScanning = isScanning1 || isScanning2;
     if (isScanning) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

    switch (comparisonResult.status) {
      case 'uygun':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'uygun değil':
        return <XCircle className="h-6 w-6 text-red-500" />;
       case 'eksik veri':
         return <ScanLine className="h-6 w-6 text-yellow-500" />; // Or another icon for missing data
      default: // bekleniyor
        // Only show ScanLine if there's potential for comparison (image loaded or data entered)
        if (scannedImage1 || scannedImage2 || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
            return <ScanLine className="h-6 w-6 text-muted-foreground opacity-50" />;
        }
        // Otherwise, show nothing or a placeholder if desired
        return null; // Or return a default icon like Info or HelpCircle if needed when idle
    }
  };

  // Updated function to include matching tip onay no
  const getResultText = () => {
     const isScanning = isScanning1 || isScanning2;
     if (isScanning) return 'Karşılaştırılıyor...';

    switch (comparisonResult.status) {
      case 'uygun':
        return `Uygun (${comparisonResult.matchingTipOnayNo || 'N/A'})`;
      case 'uygun değil':
        return 'Uygun Değil';
      case 'eksik veri':
         return 'Eksik Veri';
      default: // bekleniyor
         // Show 'bekleniyor' only if there's potential for comparison
        if (scannedImage1 || scannedImage2 || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
           return 'Karşılaştırma Bekleniyor';
        }
        // Otherwise, show a prompt to start
        return 'Başlamak için Veri Girin/Tarayın';
    }
  };


  const getResultColor = () => {
     const isScanning = isScanning1 || isScanning2;
     if (isScanning) return 'text-muted-foreground';

    switch (comparisonResult.status) {
      case 'uygun':
        return 'text-green-600';
      case 'uygun değil':
        return 'text-red-600';
       case 'eksik veri':
         return 'text-yellow-600';
      default: // bekleniyor
        return 'text-muted-foreground';
    }
  };

   const getResultBgColor = () => {
    const isScanning = isScanning1 || isScanning2;
     if (isScanning) return 'border-muted bg-muted/50';

    switch (comparisonResult.status) {
      case 'uygun':
        return 'border-green-200 bg-green-50';
      case 'uygun değil':
        return 'border-red-200 bg-red-50';
       case 'eksik veri':
         return 'border-yellow-200 bg-yellow-50';
      default: // bekleniyor
        // Use default muted style if comparison is pending but possible
        if (scannedImage1 || scannedImage2 || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
            return 'border-muted bg-muted/50';
        }
        // Use a slightly different style or hide if completely idle
        return 'border-transparent bg-transparent'; // Example: hide border/bg when idle
    }
  };

   // Helper function to get placeholder text based on scan area
   const getPlaceholder = (fieldName: keyof ScanData, scanIndex: 1 | 2) => {
       const defaultPlaceholders: Record<keyof ScanData, string> = {
           saseNo: "Şase Numarası Girin",
           marka: "Marka Girin",
           tipOnayNo: "Tip Onay No Girin",
           varyant: "Varyant Girin",
           versiyon: "Versiyon Girin",
       };

       if (scanIndex === 1 && (fieldName === 'tipOnayNo' || fieldName === 'varyant' || fieldName === 'versiyon')) {
           return `${defaultPlaceholders[fieldName]} (Etiketten beklenir)`;
       }
       if (scanIndex === 2 && (fieldName === 'saseNo' || fieldName === 'marka')) {
           return `${defaultPlaceholders[fieldName]} (Ruhsattan beklenir)`;
       }
       return defaultPlaceholders[fieldName];
   }

  // Reusable Scan Area Component
  const ScanArea = ({
    scanIndex,
    title,
    scannedImage,
    isScanning,
    formDataScan,
    fileInputRef,
  }: {
    scanIndex: 1 | 2;
    title: string;
    scannedImage: string | null;
    isScanning: boolean;
    formDataScan: ScanData;
    fileInputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="space-y-4 border p-4 rounded-lg shadow-sm bg-card">
      <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">{title}</h3>
      <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border border-dashed flex items-center justify-center">
        {isScanning ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-2" />
            <p>Taranıyor...</p>
          </div>
        ) : scannedImage ? (
          <Image
            src={scannedImage}
            alt={`Taranan Görsel ${scanIndex}`}
            layout="fill"
            objectFit="contain"
            data-ai-hint="vehicle identification plate license"
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
            <ScanLine className="h-12 w-12 mb-2" />
            <p>Görsel {scanIndex} yükleyin.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => triggerFileInput(scanIndex)}
          disabled={isScanning}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Camera className="mr-2 h-4 w-4" />
          Görsel {scanIndex} Seç/Değiştir
        </Button>
        <Button
          onClick={() => handleManualScan(scanIndex)}
          disabled={isScanning || !scannedImage}
          variant="secondary"
          className="flex-1"
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {isScanning ? 'Taranıyor...' : `Görsel ${scanIndex} Tara`}
        </Button>
      </div>
       <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, scanIndex)}
        className="hidden"
        id={`license-scan-${scanIndex}`}
      />
      {/* Data Fields for this scan area */}
      {/* Always show all fields for manual input, but guide with placeholders */}
      <div className="space-y-3 mt-4">
          <div>
            <Label htmlFor={`saseNo-${scanIndex}`} className="text-sm font-medium text-foreground">Şase Numarası</Label>
            <Input
              id={`saseNo-${scanIndex}`}
              value={formDataScan.saseNo || ''}
              onChange={(e) => handleInputChange(e, scanIndex)}
              placeholder={getPlaceholder('saseNo', scanIndex)}
              className="mt-1"
              // Readonly status depends on whether AI is expected to fill it
              // readOnly={scanIndex === 2} // Sase No expected from scan 1
              // bg-muted={scanIndex === 2} // Visually indicate it's not primary for scan 2
            />
          </div>
          <div>
            <Label htmlFor={`marka-${scanIndex}`} className="text-sm font-medium text-foreground">Marka</Label>
            <Input
              id={`marka-${scanIndex}`}
              value={formDataScan.marka || ''}
              onChange={(e) => handleInputChange(e, scanIndex)}
              placeholder={getPlaceholder('marka', scanIndex)}
              className="mt-1"
              // readOnly={scanIndex === 2} // Marka expected from scan 1
              // bg-muted={scanIndex === 2}
            />
          </div>
           <div>
            <Label htmlFor={`tipOnayNo-${scanIndex}`} className="text-sm font-medium text-foreground">Tip Onay No</Label>
            <Input
              id={`tipOnayNo-${scanIndex}`}
              value={formDataScan.tipOnayNo || ''}
              onChange={(e) => handleInputChange(e, scanIndex)}
              placeholder={getPlaceholder('tipOnayNo', scanIndex)}
               className="mt-1"
              // readOnly={scanIndex === 1} // Tip Onay expected from scan 2
              // bg-muted={scanIndex === 1}
            />
          </div>
          <div>
            <Label htmlFor={`varyant-${scanIndex}`} className="text-sm font-medium text-foreground">Varyant</Label>
            <Input
              id={`varyant-${scanIndex}`}
              value={formDataScan.varyant || ''}
              onChange={(e) => handleInputChange(e, scanIndex)}
              placeholder={getPlaceholder('varyant', scanIndex)}
              className="mt-1"
              // readOnly={scanIndex === 1} // Varyant expected from scan 2
              // bg-muted={scanIndex === 1}
            />
          </div>
          <div>
            <Label htmlFor={`versiyon-${scanIndex}`} className="text-sm font-medium text-foreground">Versiyon</Label>
            <Input
              id={`versiyon-${scanIndex}`}
              value={formDataScan.versiyon || ''}
              onChange={(e) => handleInputChange(e, scanIndex)}
              placeholder={getPlaceholder('versiyon', scanIndex)}
              className="mt-1"
              // readOnly={scanIndex === 1} // Versiyon expected from scan 2
              // bg-muted={scanIndex === 1}
            />
          </div>
      </div>
    </div>
  );


  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-background to-muted/60 p-4 sm:p-8">
      <Card className="w-full max-w-6xl shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Araç Ruhsat/Etiket Karşılaştırıcı
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Ruhsat ve etiket fotoğraflarını yükleyerek bilgileri otomatik doldurun veya manuel girin ve onaylı tip verileriyle eşleşip eşleşmediğini kontrol edin.
          </CardDescription>
          {/* Add button linking to the Seri Tadilat Onay page */}
          <div className="flex justify-center mt-4">
             <Link href="/seri-tadilat-onay" passHref>
               <Button variant="outline">
                 <FileCheck className="mr-2 h-4 w-4" />
                 Seri Tadilat Tip Onay Veri Yönetimi
               </Button>
             </Link>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           {/* Grid for Scan Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <ScanArea
                scanIndex={1}
                title="Ruhsat Tarama" // Updated title
                scannedImage={scannedImage1}
                isScanning={isScanning1}
                formDataScan={formData.scan1}
                fileInputRef={fileInputRef1}
             />
              <ScanArea
                scanIndex={2}
                title="Etiket Tarama" // Updated title
                scannedImage={scannedImage2}
                isScanning={isScanning2}
                formDataScan={formData.scan2}
                fileInputRef={fileInputRef2}
             />
          </div>

           <Separator className="my-6" />

          {/* Comparison Result Section */}
           <div className="mt-6 pt-4">
              <h3 className="text-xl font-semibold text-foreground mb-3 text-center">Karşılaştırma Sonucu</h3>
               <div className={`flex items-center justify-center gap-3 p-4 rounded-md border ${getResultBgColor()} transition-colors duration-300 min-h-[68px]`}> {/* Added min-height */}
                  {getResultIcon()}
                  <span className={`text-lg font-medium ${getResultColor()} transition-colors duration-300`}>{getResultText()}</span>
              </div>
               <p className="text-xs text-muted-foreground mt-2 text-center h-8"> {/* Increased fixed height for longer messages */}
                   {comparisonResult.status === 'eksik veri' && !isScanning1 && !isScanning2 && "Karşılaştırma için Marka, Tip Onay No, Varyant ve Versiyon bilgileri gereklidir."}
                   {comparisonResult.status === 'bekleniyor' && !isScanning1 && !isScanning2 && !(scannedImage1 || scannedImage2 || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) && "Başlamak için görselleri yükleyip tarayın veya bilgileri manuel girin."}
                   {(isScanning1 || isScanning2) && "Taranan veriler karşılaştırılıyor..."}
                   {comparisonResult.status === 'uygun' && !isScanning1 && !isScanning2 && `Veriler onaylı tip (${comparisonResult.matchingTipOnayNo || 'N/A'}) ile eşleşiyor.`}
                   {comparisonResult.status === 'uygun değil' && !isScanning1 && !isScanning2 && "Girilen/Taranan veriler herhangi bir onaylı tip ile eşleşmiyor!"}
               </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

