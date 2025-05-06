<<<<<<< HEAD

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
import { type ApprovalFormData } from '@/data/approval-data'; // Import shared data type only

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
  tipOnayNo: '', // This will be from Ruhsat Tarama
  tip: '',       // This will be from Etiket Tarama (derived)
  varyant: '',   // This will be from Etiket Tarama
  versiyon: '',  // This will be from Etiket Tarama
};

// Updated initial form data for two scans
const initialFormData: FormData = {
  scan1: { ...initialScanData },
  scan2: { ...initialScanData },
};

type ComparisonResultStatus = 'uygun' | 'uygun değil' | 'bekleniyor' | 'eksik veri';

interface ComparisonResult {
    status: ComparisonResultStatus;
    matchingSeriTadilatTipOnayi?: string | null;
}

// Helper function to get placeholder text
const getPlaceholder = (fieldName: keyof ScanData, scanAreaType: 'ruhsat' | 'etiket') => {
    const placeholders: Record<keyof ScanData, string> = {
        saseNo: "Şase Numarası Girin",
        marka: "Marka Girin",
        tipOnayNo: "Tip Onay No Girin (örn: e1*xxxx/xx*xxxx*xx)", // Placeholder for Ruhsat's Tip Onay No
        tip: "Tip Girin (örn: 225)", // Placeholder for Etiket's Tip
        varyant: "Varyant Girin (örn: CXE1A)", // Placeholder for Etiket's Varyant
        versiyon: "Versiyon Girin (örn: TFB7R)", // Placeholder for Etiket's Versiyon
    };

    if (scanAreaType === 'ruhsat') {
        if (fieldName === 'saseNo' || fieldName === 'marka' || fieldName === 'tipOnayNo') {
            return placeholders[fieldName];
        }
        return `${placeholders[fieldName]} (Etiketten beklenir)`;
    } else { // etiket
        if (fieldName === 'tip' || fieldName === 'varyant' || fieldName === 'versiyon') {
            return placeholders[fieldName];
        }
         return `${placeholders[fieldName]} (Ruhsattan beklenir)`;
    }
};


// Reusable Scan Area Component
const ScanArea = ({
    scanAreaType, // 'ruhsat' or 'etiket'
    title,
    scannedImage,
    isScanning,
    formDataScan,
    fileInputRef,
    triggerFileInput,
    handleImageUpload,
    handleManualScan,
    handleInputChange,
  }: {
    scanAreaType: 'ruhsat' | 'etiket';
    title: string;
    scannedImage: string | null;
    isScanning: boolean;
    formDataScan: ScanData;
    fileInputRef: React.RefObject<HTMLInputElement>;
    triggerFileInput: (scanAreaType: 'ruhsat' | 'etiket') => void;
    handleImageUpload: (e: ChangeEvent<HTMLInputElement>, scanAreaType: 'ruhsat' | 'etiket') => void;
    handleManualScan: (scanAreaType: 'ruhsat' | 'etiket') => void;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>, scanAreaType: 'ruhsat' | 'etiket', fieldName: keyof ScanData) => void;
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
            alt={`Taranan Görsel - ${title}`}
            layout="fill"
            objectFit="contain"
            data-ai-hint={scanAreaType === 'ruhsat' ? "vehicle registration license" : "vehicle identification plate"}
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
            <ScanLine className="h-12 w-12 mb-2" />
            <p>{title} için görsel yükleyin.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => triggerFileInput(scanAreaType)}
          disabled={isScanning}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Camera className="mr-2 h-4 w-4" />
          Görsel Seç/Değiştir
        </Button>
        <Button
          onClick={() => handleManualScan(scanAreaType)}
          disabled={isScanning || !scannedImage}
          variant="secondary"
          className="flex-1"
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {isScanning ? 'Taranıyor...' : `${title} Tara`}
        </Button>
      </div>
       <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e, scanAreaType)}
        className="hidden"
        id={`file-scan-${scanAreaType}`}
      />
      <div className="space-y-3 mt-4">
          {scanAreaType === 'ruhsat' && (
            <>
              <div>
                <Label htmlFor={`saseNo-ruhsat`} className="text-sm font-medium text-foreground">Şase Numarası</Label>
                <Input
                  id={`saseNo-ruhsat`}
                  name="saseNo"
                  value={formDataScan.saseNo || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'saseNo')}
                  placeholder={getPlaceholder('saseNo', scanAreaType)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`marka-ruhsat`} className="text-sm font-medium text-foreground">Marka</Label>
                <Input
                  id={`marka-ruhsat`}
                  name="marka"
                  value={formDataScan.marka || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'marka')}
                  placeholder={getPlaceholder('marka', scanAreaType)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`tipOnayNo-ruhsat`} className="text-sm font-medium text-foreground">Tip Onay No</Label>
                <Input
                  id={`tipOnayNo-ruhsat`}
                  name="tipOnayNo"
                  value={formDataScan.tipOnayNo || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'tipOnayNo')}
                  placeholder={getPlaceholder('tipOnayNo', scanAreaType)}
                  className="mt-1"
                />
              </div>
            </>
          )}
          {scanAreaType === 'etiket' && (
            <>
              <div>
                <Label htmlFor={`tip-etiket`} className="text-sm font-medium text-foreground">Tip</Label>
                <Input
                  id={`tip-etiket`}
                  name="tip"
                  value={formDataScan.tip || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'tip')}
                  placeholder={getPlaceholder('tip', scanAreaType)} // Placeholder for "Tip Girin"
                   className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`varyant-etiket`} className="text-sm font-medium text-foreground">Varyant</Label>
                <Input
                  id={`varyant-etiket`}
                  name="varyant"
                  value={formDataScan.varyant || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'varyant')}
                  placeholder={getPlaceholder('varyant', scanAreaType)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`versiyon-etiket`} className="text-sm font-medium text-foreground">Versiyon</Label>
                <Input
                  id={`versiyon-etiket`}
                  name="versiyon"
                  value={formDataScan.versiyon || ''}
                  onChange={(e) => handleInputChange(e, scanAreaType, 'versiyon')}
                  placeholder={getPlaceholder('versiyon', scanAreaType)}
                  className="mt-1"
                />
              </div>
             </>
          )}
      </div>
    </div>
  );

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isScanningRuhsat, setIsScanningRuhsat] = useState(false);
  const [isScanningEtiket, setIsScanningEtiket] = useState(false);
  const [scannedImageRuhsat, setScannedImageRuhsat] = useState<string | null>(null);
  const [scannedImageEtiket, setScannedImageEtiket] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult>({ status: 'bekleniyor', matchingSeriTadilatTipOnayi: null });
  const [approvalData, setApprovalData] = useState<ApprovalFormData[]>([]); // State for approval data
  const { toast } = useToast();
  const fileInputRefRuhsat = useRef<HTMLInputElement>(null);
  const fileInputRefEtiket = useRef<HTMLInputElement>(null);


  // Load approval data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('approvalData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData) as ApprovalFormData[];
          setApprovalData(parsedData);
        } catch (error) {
          console.error("Error parsing approvalData from localStorage on main page:", error);
        }
      }
    }
  }, []);


  const hasAnyScanData = (scan: ScanData): boolean => {
      return Object.values(scan).some(value => !!value && String(value).trim() !== '');
  }

  const hasRequiredComparisonData = (data: FormData): boolean => {
      const marka = data.scan1.marka; // Marka from Ruhsat
      const tipOnayNo = data.scan1.tipOnayNo; // Tip Onay No from Ruhsat
      const varyant = data.scan2.varyant; // Varyant from Etiket
      const versiyon = data.scan2.versiyon; // Versiyon from Etiket
      return !!marka && !!tipOnayNo && !!varyant && !!versiyon;
  }


  const handleInputChange = useCallback((
    e: ChangeEvent<HTMLInputElement>,
    scanAreaType: 'ruhsat' | 'etiket',
    fieldName: keyof ScanData
  ) => {
    const { value } = e.target;
    const scanKey = scanAreaType === 'ruhsat' ? 'scan1' : 'scan2';

    setFormData(prevData => ({
      ...prevData,
      [scanKey]: {
        ...prevData[scanKey],
        [fieldName]: value,
      },
    }));
  }, []);


  const handleImageUpload = useCallback(async (
    e: ChangeEvent<HTMLInputElement>,
    scanAreaType: 'ruhsat' | 'etiket'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setIsScanning = scanAreaType === 'ruhsat' ? setIsScanningRuhsat : setIsScanningEtiket;
    const setScannedImage = scanAreaType === 'ruhsat' ? setScannedImageRuhsat : setScannedImageEtiket;
    const fileInputRef = scanAreaType === 'ruhsat' ? fileInputRefRuhsat : fileInputRefEtiket;
    const scanNumber = scanAreaType === 'ruhsat' ? 1 : 2;
    
    setIsScanning(false);
    setComparisonResult({ status: 'bekleniyor', matchingSeriTadilatTipOnayi: null });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result as string;
      setScannedImage(base64Image);
      toast({
        title: `Görsel ${scanNumber} (${scanAreaType === 'ruhsat' ? 'Ruhsat' : 'Etiket'}) Yüklendi`,
        description: `Görsel taramaya hazır. "${scanAreaType === 'ruhsat' ? 'Ruhsat' : 'Etiket'} Tara" butonuna tıklayın.`,
      });
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        title: 'Dosya Okuma Hatası',
        description: `Görsel ${scanNumber} (${scanAreaType === 'ruhsat' ? 'Ruhsat' : 'Etiket'}) dosyası okunurken bir hata oluştu.`,
        variant: 'destructive',
      });
      setScannedImage(null);
    };

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast]);


  const handleManualScan = useCallback(async (scanAreaType: 'ruhsat' | 'etiket') => {
    const scannedImage = scanAreaType === 'ruhsat' ? scannedImageRuhsat : scannedImageEtiket;
    const setIsScanning = scanAreaType === 'ruhsat' ? setIsScanningRuhsat : setIsScanningEtiket;
    const isScanning = scanAreaType === 'ruhsat' ? isScanningRuhsat : isScanningEtiket;
    const scanKey = scanAreaType === 'ruhsat' ? 'scan1' : 'scan2';
    const scanNumber = scanAreaType === 'ruhsat' ? 1 : 2;
    const scanTitle = scanAreaType === 'ruhsat' ? 'Ruhsat' : 'Etiket';

    if (isScanning) return;

    if (!scannedImage) {
      toast({
        title: `${scanTitle} Görseli Yok`,
        description: `Lütfen önce taramak için ${scanTitle} görselini yükleyin.`,
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setComparisonResult({ status: 'bekleniyor', matchingSeriTadilatTipOnayi: null });

    try {
      const result = await extractDataFromVehicleLicense({
        licenseImageDataUri: scannedImage,
      });

      setFormData(prevData => {
        const updatedScanData = { ...prevData[scanKey] };

        if (scanAreaType === 'ruhsat') { // Ruhsat Tarama
          if (result.saseNo) updatedScanData.saseNo = result.saseNo;
          if (result.marka) updatedScanData.marka = result.marka;
          if (result.tipOnayNo) updatedScanData.tipOnayNo = result.tipOnayNo; // Ruhsattan Tip Onay No
          // Explicitly do NOT update tip, varyant, versiyon from Ruhsat scan
        } else { // Etiket Tarama
          if (result.tip) updatedScanData.tip = result.tip;
          if (result.varyant) updatedScanData.varyant = result.varyant;
          if (result.versiyon) updatedScanData.versiyon = result.versiyon;
           // Explicitly do NOT update saseNo, marka, tipOnayNo from Etiket scan
        }

        return {
          ...prevData,
          [scanKey]: updatedScanData,
        };
      });

      toast({
        title: `${scanTitle} Tarama Başarılı`,
        description: `Araç verileri ${scanNumber}. görselden (${scanTitle}) başarıyla okundu.`,
      });
    } catch (error) {
      console.error(`Error extracting data for ${scanTitle} scan:`, error);
      toast({
        title: `${scanTitle} Tarama Hatası`,
        description: `Araç verileri ${scanNumber}. görselden (${scanTitle}) okunurken bir hata oluştu. Lütfen manuel kontrol edin.`,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  }, [scannedImageRuhsat, scannedImageEtiket, isScanningRuhsat, isScanningEtiket, toast]);


  const triggerFileInput = useCallback((scanAreaType: 'ruhsat' | 'etiket') => {
    const fileInputRef = scanAreaType === 'ruhsat' ? fileInputRefRuhsat : fileInputRefEtiket;
    fileInputRef.current?.click();
  }, []);

  const compareData = useCallback(() => {
    const ruhsatData = formData.scan1; // Ruhsat
    const etiketData = formData.scan2; // Etiket
    const isScanning = isScanningRuhsat || isScanningEtiket;

    // Required data for comparison:
    // Marka from Ruhsat (scan1.marka)
    // Tip Onay No from Ruhsat (scan1.tipOnayNo)
    // Varyant from Etiket (scan2.varyant)
    // Versiyon from Etiket (scan2.versiyon)
    const combinedDataForComparison: Partial<ApprovalFormData> = {
        marka: ruhsatData.marka || '',
        tipOnayNo: ruhsatData.tipOnayNo || '', // Use Tip Onay No from Ruhsat
        varyant: etiketData.varyant || '',
        versiyon: etiketData.versiyon || '',
        // seriTadilatTipOnayi is for matching, not direct input here
    };


    if (isScanning) {
        setComparisonResult({ status: 'bekleniyor', matchingSeriTadilatTipOnayi: null });
        return;
    }

    if (!hasRequiredComparisonData(formData)) {
        if (scannedImageRuhsat || scannedImageEtiket || hasAnyScanData(ruhsatData) || hasAnyScanData(etiketData)) {
             setComparisonResult({ status: 'eksik veri', matchingSeriTadilatTipOnayi: null });
        } else {
            setComparisonResult({ status: 'bekleniyor', matchingSeriTadilatTipOnayi: null });
        }
        return;
    }

    const matchingApproval = approvalData.find(approval =>
        approval.marka.toLowerCase() === combinedDataForComparison.marka?.toLowerCase() &&
        approval.tipOnayNo.toLowerCase() === combinedDataForComparison.tipOnayNo?.toLowerCase() && // Compare with Ruhsat's Tip Onay No
        approval.varyant.toLowerCase() === combinedDataForComparison.varyant?.toLowerCase() &&
        approval.versiyon.toLowerCase() === combinedDataForComparison.versiyon?.toLowerCase()
    );


    if (matchingApproval) {
        setComparisonResult({ status: 'uygun', matchingSeriTadilatTipOnayi: matchingApproval.seriTadilatTipOnayi });
    } else {
        setComparisonResult({ status: 'uygun değil', matchingSeriTadilatTipOnayi: null });
    }

  }, [formData, isScanningRuhsat, isScanningEtiket, scannedImageRuhsat, scannedImageEtiket, approvalData]);


  useEffect(() => {
    compareData();
  }, [formData, isScanningRuhsat, isScanningEtiket, scannedImageRuhsat, scannedImageEtiket, approvalData, compareData]);


  const getResultIcon = () => {
    const isScanning = isScanningRuhsat || isScanningEtiket;
     if (isScanning) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;

    switch (comparisonResult.status) {
      case 'uygun':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'uygun değil':
        return <XCircle className="h-6 w-6 text-red-500" />;
       case 'eksik veri':
         return <ScanLine className="h-6 w-6 text-yellow-500" />;
      default: // bekleniyor
        if (scannedImageRuhsat || scannedImageEtiket || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
            return <ScanLine className="h-6 w-6 text-muted-foreground opacity-50" />;
        }
        return null;
    }
  };

  const getResultText = () => {
     const isScanning = isScanningRuhsat || isScanningEtiket;
     if (isScanning) return 'Karşılaştırılıyor...';

    switch (comparisonResult.status) {
      case 'uygun':
        return `Uygun (${comparisonResult.matchingSeriTadilatTipOnayi || 'N/A'})`;
      case 'uygun değil':
        return 'Uygun Değil';
      case 'eksik veri':
         return 'Eksik Veri';
      default: // bekleniyor
        if (scannedImageRuhsat || scannedImageEtiket || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
           return 'Karşılaştırma Bekleniyor';
        }
        return 'Başlamak için Veri Girin/Tarayın';
    }
  };


  const getResultColor = () => {
     const isScanning = isScanningRuhsat || isScanningEtiket;
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
    const isScanning = isScanningRuhsat || isScanningEtiket;
     if (isScanning) return 'border-muted bg-muted/50';

    switch (comparisonResult.status) {
      case 'uygun':
        return 'border-green-200 bg-green-50';
      case 'uygun değil':
        return 'border-red-200 bg-red-50';
       case 'eksik veri':
         return 'border-yellow-200 bg-yellow-50';
      default: // bekleniyor
        if (scannedImageRuhsat || scannedImageEtiket || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) {
            return 'border-muted bg-muted/50';
        }
        return 'border-transparent bg-transparent';
    }
  };


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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <ScanArea
                scanAreaType="ruhsat"
                title="Ruhsat Tarama"
                scannedImage={scannedImageRuhsat}
                isScanning={isScanningRuhsat}
                formDataScan={formData.scan1}
                fileInputRef={fileInputRefRuhsat}
                triggerFileInput={triggerFileInput}
                handleImageUpload={handleImageUpload}
                handleManualScan={handleManualScan}
                handleInputChange={handleInputChange}
             />
              <ScanArea
                scanAreaType="etiket"
                title="Etiket Tarama"
                scannedImage={scannedImageEtiket}
                isScanning={isScanningEtiket}
                formDataScan={formData.scan2}
                fileInputRef={fileInputRefEtiket}
                triggerFileInput={triggerFileInput}
                handleImageUpload={handleImageUpload}
                handleManualScan={handleManualScan}
                handleInputChange={handleInputChange}
             />
          </div>

           <Separator className="my-6" />

           <div className="mt-6 pt-4">
              <h3 className="text-xl font-semibold text-foreground mb-3 text-center">Karşılaştırma Sonucu</h3>
               <div className={`flex items-center justify-center gap-3 p-4 rounded-md border ${getResultBgColor()} transition-colors duration-300 min-h-[68px]`}>
                  {getResultIcon()}
                  <span className={`text-lg font-medium ${getResultColor()} transition-colors duration-300`}>{getResultText()}</span>
              </div>
               <p className="text-xs text-muted-foreground mt-2 text-center h-8">
                   {comparisonResult.status === 'eksik veri' && !isScanningRuhsat && !isScanningEtiket && "Karşılaştırma için Ruhsattan Marka ve Tip Onay No; Etiketten Varyant ve Versiyon bilgileri gereklidir."}
                   {comparisonResult.status === 'bekleniyor' && !isScanningRuhsat && !isScanningEtiket && !(scannedImageRuhsat || scannedImageEtiket || hasAnyScanData(formData.scan1) || hasAnyScanData(formData.scan2)) && "Başlamak için görselleri yükleyip tarayın veya bilgileri manuel girin."}
                   {(isScanningRuhsat || isScanningEtiket) && "Taranan veriler karşılaştırılıyor..."}
                   {comparisonResult.status === 'uygun' && !isScanningRuhsat && !isScanningEtiket && `Veriler onaylı seri tadilat tip onayı (${comparisonResult.matchingSeriTadilatTipOnayi || 'N/A'}) ile eşleşiyor.`}
                   {comparisonResult.status === 'uygun değil' && !isScanningRuhsat && !isScanningEtiket && "Girilen/Taranan veriler herhangi bir onaylı tip ile eşleşmiyor!"}
               </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
=======
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/select-branch');
  // Return null or an empty fragment because redirect throws an error and stops rendering
  return null;
}
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
