
'use client';

import type { ChangeEvent } from 'react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { Camera, CheckCircle, XCircle, Loader2, ScanLine, Search } from 'lucide-react';
import {
  extractDataFromVehicleLicense,
  type ExtractDataFromVehicleLicenseOutput,
} from '@/ai/flows/extract-data-from-vehicle-license';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator'; // Import Separator

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

type ComparisonResult = 'uygun' | 'uygun değil' | 'bekleniyor' | 'eksik veri';

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isScanning1, setIsScanning1] = useState(false);
  const [isScanning2, setIsScanning2] = useState(false);
  const [scannedImage1, setScannedImage1] = useState<string | null>(null);
  const [scannedImage2, setScannedImage2] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult>('bekleniyor');
  const { toast } = useToast();
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Check if data exists for a given scan
  const hasScanData = (scan: ScanData): boolean => {
      return Object.values(scan).some(val => val && String(val).trim() !== '');
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
    setIsScanning(false);
    setScannedImage(null);
    setFormData(prevData => ({
        ...prevData,
        [`scan${scanIndex}`]: { ...initialScanData }
    }));
    setComparisonResult('bekleniyor'); // Reset comparison when a new image is uploaded

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result as string;
      setScannedImage(base64Image);
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
      setScannedImage(null);
      setFormData(prevData => ({
        ...prevData,
        [`scan${scanIndex}`]: { ...initialScanData }
      }));
      setComparisonResult('bekleniyor');
    };

    // Clear the file input value
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
    setFormData(prevData => ({
        ...prevData,
        [`scan${scanIndex}`]: { ...initialScanData } // Reset form data for this scan
    }));
    setComparisonResult('bekleniyor'); // Reset comparison during scan

    try {
      const result = await extractDataFromVehicleLicense({
        licenseImageDataUri: scannedImage,
      });
      setFormData(prevData => ({
        ...prevData,
        [`scan${scanIndex}`]: {
          saseNo: result.saseNo || '',
          marka: result.marka || '',
          tipOnayNo: result.tipOnayNo || '',
          varyant: result.varyant || '',
          versiyon: result.versiyon || '',
        },
      }));
      toast({
        title: `Tarama ${scanIndex} Başarılı`,
        description: `Araç verileri ${scanIndex}. görselden başarıyla okundu.`,
      });
    } catch (error) {
      console.error(`Error extracting data for scan ${scanIndex}:`, error);
      toast({
        title: `Tarama ${scanIndex} Hatası`,
        description: `Araç verileri ${scanIndex}. görselden okunurken bir hata oluştu.`,
        variant: 'destructive',
      });
       setFormData(prevData => ({
        ...prevData,
        [`scan${scanIndex}`]: { ...initialScanData } // Clear form on error
      }));
    } finally {
      setIsScanning(false);
    }
  };

  const triggerFileInput = (scanIndex: 1 | 2) => {
    const fileInputRef = scanIndex === 1 ? fileInputRef1 : fileInputRef2;
    fileInputRef.current?.click();
  };

  const compareData = useCallback(() => {
    const scan1Data = formData.scan1;
    const scan2Data = formData.scan2;
    const isScanning = isScanning1 || isScanning2;

    const scan1Complete = hasScanData(scan1Data);
    const scan2Complete = hasScanData(scan2Data);

    if (isScanning) {
        setComparisonResult('bekleniyor'); // Or a specific 'scanning' state if needed
        return;
    }

    if (!scan1Complete || !scan2Complete) {
        setComparisonResult('eksik veri');
        return;
    }

    // Compare all fields between scan1 and scan2
    const isMatch =
      scan1Data.saseNo === scan2Data.saseNo &&
      scan1Data.marka === scan2Data.marka &&
      scan1Data.tipOnayNo === scan2Data.tipOnayNo &&
      scan1Data.varyant === scan2Data.varyant &&
      scan1Data.versiyon === scan2Data.versiyon;

    setComparisonResult(isMatch ? 'uygun' : 'uygun değil');
  }, [formData, isScanning1, isScanning2]);

  useEffect(() => {
    // Compare data whenever formData changes and scanning is not in progress
     if (!isScanning1 && !isScanning2) {
      compareData();
    }
  }, [formData, isScanning1, isScanning2, compareData]);


  const getResultIcon = () => {
    const isScanning = isScanning1 || isScanning2;
     if (isScanning) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

    switch (comparisonResult) {
      case 'uygun':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'uygun değil':
        return <XCircle className="h-6 w-6 text-red-500" />;
       case 'eksik veri':
         return <ScanLine className="h-6 w-6 text-yellow-500" />; // Or another icon for missing data
      default: // bekleniyor
        return <ScanLine className="h-6 w-6 text-muted-foreground opacity-50" />;
    }
  };

  const getResultText = () => {
     const isScanning = isScanning1 || isScanning2;
     if (isScanning) return 'Karşılaştırılıyor...';

    switch (comparisonResult) {
      case 'uygun':
        return 'Veriler Eşleşiyor';
      case 'uygun değil':
        return 'Veriler Eşleşmiyor';
      case 'eksik veri':
         return 'Eksik Veri';
      default: // bekleniyor
        return 'Karşılaştırma Bekleniyor';
    }
  };

  const getResultColor = () => {
     const isScanning = isScanning1 || isScanning2;
     if (isScanning) return 'text-muted-foreground';

    switch (comparisonResult) {
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

    switch (comparisonResult) {
      case 'uygun':
        return 'border-green-200 bg-green-50';
      case 'uygun değil':
        return 'border-red-200 bg-red-50';
       case 'eksik veri':
         return 'border-yellow-200 bg-yellow-50';
      default: // bekleniyor
        return 'border-muted bg-muted/50';
    }
  };

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
    <div className="space-y-4 border p-4 rounded-lg shadow-sm">
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
      <div className="space-y-3 mt-4">
        <div>
          <Label htmlFor={`saseNo-${scanIndex}`} className="text-sm font-medium text-foreground">Şase Numarası</Label>
          <Input
            id={`saseNo-${scanIndex}`}
            value={formDataScan.saseNo || ''}
            onChange={(e) => handleInputChange(e, scanIndex)}
            placeholder="-"
            readOnly={isScanning}
            className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
          />
        </div>
        <div>
          <Label htmlFor={`marka-${scanIndex}`} className="text-sm font-medium text-foreground">Marka</Label>
          <Input
            id={`marka-${scanIndex}`}
            value={formDataScan.marka || ''}
            onChange={(e) => handleInputChange(e, scanIndex)}
            placeholder="-"
            readOnly={isScanning}
            className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
          />
        </div>
        <div>
          <Label htmlFor={`tipOnayNo-${scanIndex}`} className="text-sm font-medium text-foreground">Tip Onay No</Label>
          <Input
            id={`tipOnayNo-${scanIndex}`}
            value={formDataScan.tipOnayNo || ''}
            onChange={(e) => handleInputChange(e, scanIndex)}
            placeholder="-"
            readOnly={isScanning}
            className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
          />
        </div>
        <div>
          <Label htmlFor={`varyant-${scanIndex}`} className="text-sm font-medium text-foreground">Varyant</Label>
          <Input
            id={`varyant-${scanIndex}`}
            value={formDataScan.varyant || ''}
            onChange={(e) => handleInputChange(e, scanIndex)}
            placeholder="-"
            readOnly={isScanning}
            className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
          />
        </div>
        <div>
          <Label htmlFor={`versiyon-${scanIndex}`} className="text-sm font-medium text-foreground">Versiyon</Label>
          <Input
            id={`versiyon-${scanIndex}`}
            value={formDataScan.versiyon || ''}
            onChange={(e) => handleInputChange(e, scanIndex)}
            placeholder="-"
            readOnly={isScanning}
            className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );


  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-background to-secondary p-4 sm:p-8">
      <Card className="w-full max-w-6xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Araç Ruhsat/Etiket Karşılaştırıcı
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            İki farklı araç ruhsatı veya etiketinin fotoğrafını yükleyerek bilgileri
            otomatik doldurun ve birbiriyle karşılaştırın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {/* Grid for Scan Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <ScanArea
                scanIndex={1}
                title="Tarama Alanı 1"
                scannedImage={scannedImage1}
                isScanning={isScanning1}
                formDataScan={formData.scan1}
                fileInputRef={fileInputRef1}
             />
              <ScanArea
                scanIndex={2}
                title="Tarama Alanı 2"
                scannedImage={scannedImage2}
                isScanning={isScanning2}
                formDataScan={formData.scan2}
                fileInputRef={fileInputRef2}
             />
          </div>

           <Separator />

          {/* Comparison Result Section */}
           <div className="mt-6 pt-4">
              <h3 className="text-xl font-semibold text-foreground mb-3 text-center">Karşılaştırma Sonucu</h3>
               <div className={`flex items-center justify-center gap-3 p-4 rounded-md border ${getResultBgColor()}`}>
                  {getResultIcon()}
                  <span className={`text-lg font-medium ${getResultColor()}`}>{getResultText()}</span>
              </div>
               <p className="text-xs text-muted-foreground mt-2 text-center">
                  {comparisonResult === 'eksik veri' && !isScanning1 && !isScanning2 && "Karşılaştırma için her iki alanı da tarayın."}
                   {comparisonResult === 'bekleniyor' && !isScanning1 && !isScanning2 && !hasScanData(formData.scan1) && !hasScanData(formData.scan2) && "Başlamak için görselleri yükleyip tarayın."}
                   {(isScanning1 || isScanning2) && "Taranan veriler karşılaştırılıyor..."}
                   {comparisonResult === 'uygun' && !isScanning1 && !isScanning2 && "Taranan iki görseldeki bilgiler eşleşiyor."}
                   {comparisonResult === 'uygun değil' && !isScanning1 && !isScanning2 && "Taranan iki görseldeki bilgiler farklı."}
               </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
