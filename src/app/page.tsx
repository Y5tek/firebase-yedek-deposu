'use client';

import type {ChangeEvent} from 'react';
import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Camera, CheckCircle, XCircle, Loader2, ScanLine, Search} from 'lucide-react'; // Added Search icon
import {
  extractDataFromVehicleLicense,
  type ExtractDataFromVehicleLicenseOutput,
} from '@/ai/flows/extract-data-from-vehicle-license';
import {useToast} from '@/hooks/use-toast';
import Image from 'next/image';

// Updated FormData interface to match new fields
interface FormData extends ExtractDataFromVehicleLicenseOutput {
  [key: string]: string | undefined; // Allow undefined for optional fields
}

// Updated initial form data
const initialFormData: FormData = {
  saseNo: '',
  marka: '',
  tipOnayNo: '',
  varyant: '',
  versiyon: '',
};

// Updated sample data for comparison
const secondPageData: FormData = {
  saseNo: 'VIN1234567890ABCDE', // Sample VIN
  marka: 'Volkswagen',
  tipOnayNo: 'e1*2007/46*0515*10', // Sample Type Approval No
  varyant: 'AUV', // Sample Variant
  versiyon: 'AUSAX/FM6FM6', // Sample Version
};

type ComparisonResult = 'uygun' | 'uygun değil' | 'bekleniyor';

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult>('bekleniyor');
  const {toast} = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {id, value} = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value,
    }));
  };

  // Updated handleImageUpload to only set the image, not scan automatically
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset relevant states when a new image is selected
    setIsScanning(false); // Ensure scanning is false initially
    setScannedImage(null);
    setFormData(initialFormData);
    setComparisonResult('bekleniyor');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result as string;
      setScannedImage(base64Image); // Display the uploaded image
       toast({
          title: 'Görsel Yüklendi',
          description: 'Görsel taramaya hazır. "Görseli Tara" butonuna tıklayın.',
        });
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        title: 'Dosya Okuma Hatası',
        description: 'Görsel dosyası okunurken bir hata oluştu.',
        variant: 'destructive',
      });
      setScannedImage(null); // Clear image on error
      setFormData(initialFormData);
      setComparisonResult('bekleniyor');
    };
     // Clear the file input value so the same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // New function to handle manual scanning
  const handleManualScan = async () => {
    if (!scannedImage) {
       toast({
        title: 'Görsel Yok',
        description: 'Lütfen önce taramak için bir görsel yükleyin.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setFormData(initialFormData); // Reset form data before scanning
    setComparisonResult('bekleniyor'); // Reset comparison

    try {
      const result = await extractDataFromVehicleLicense({
        licenseImageDataUri: scannedImage,
      });
      // Update formData with extracted data, ensuring empty strings for undefined fields
      setFormData(prevData => ({
        ...prevData,
        saseNo: result.saseNo || '',
        marka: result.marka || '',
        tipOnayNo: result.tipOnayNo || '',
        varyant: result.varyant || '',
        versiyon: result.versiyon || '',
      }));
      toast({
        title: 'Tarama Başarılı',
        description: 'Araç verileri başarıyla okundu.',
      });
    } catch (error) {
      console.error('Error extracting data:', error);
      toast({
        title: 'Tarama Hatası',
        description: 'Araç verileri okunurken bir hata oluştu.',
        variant: 'destructive',
      });
      setFormData(initialFormData); // Clear form on error
    } finally {
      setIsScanning(false);
    }
  };


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const compareData = useCallback(() => {
    const scanned = {
      saseNo: formData.saseNo,
      marka: formData.marka,
      tipOnayNo: formData.tipOnayNo,
      varyant: formData.varyant,
      versiyon: formData.versiyon,
    };

    const hasScannedData = Object.values(scanned).some(val => val && String(val).trim() !== '');


    if (!hasScannedData || isScanning) { // Also check isScanning to avoid intermediate comparison state
        setComparisonResult('bekleniyor');
        return;
    }

    // Compare against updated secondPageData fields
    const isMatch =
      scanned.saseNo === secondPageData.saseNo &&
      scanned.marka === secondPageData.marka &&
      scanned.tipOnayNo === secondPageData.tipOnayNo &&
      scanned.varyant === secondPageData.varyant &&
      scanned.versiyon === secondPageData.versiyon;

    setComparisonResult(isMatch ? 'uygun' : 'uygun değil');
  }, [formData, isScanning]); // Add isScanning dependency

  useEffect(() => {
    compareData();
  }, [formData, compareData]); // Removed isScanning from here as it's handled in compareData

  const getResultIcon = () => {
    switch (comparisonResult) {
      case 'uygun':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'uygun değil':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        // Show loader only if actively scanning, otherwise show nothing or a placeholder
        return isScanning ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ScanLine className="h-6 w-6 text-muted-foreground opacity-50"/>;
    }
  };

  const getResultText = () => {
     if (isScanning) return 'Karşılaştırılıyor...'; // Show loading text during scan
    switch (comparisonResult) {
      case 'uygun':
        return 'Uygun';
      case 'uygun değil':
        return 'Uygun Değil';
      default:
        return 'Karşılaştırma Bekleniyor';
    }
  };

   const getResultColor = () => {
    if (isScanning) return 'text-muted-foreground'; // Muted color during scan
    switch (comparisonResult) {
      case 'uygun':
        return 'text-green-600';
      case 'uygun değil':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4 sm:p-8">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Araç Ruhsat/Etiket Tarayıcı
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Araç ruhsatı veya etiketinin fotoğrafını yükleyerek bilgileri
            otomatik doldurun ve sistem verileriyle karşılaştırın.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scan Section */}
          <div className="space-y-2"> {/* Reduced space */}
            <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Tarama Alanı</h3>
             <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border border-dashed flex items-center justify-center">
              {isScanning ? (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 animate-spin mb-2" />
                  <p>Taranıyor...</p>
                </div>
              ) : scannedImage ? (
                 <Image
                  src={scannedImage}
                  alt="Taranan Ruhsat/Etiket"
                  layout="fill"
                  objectFit="contain"
                  data-ai-hint="vehicle identification plate license"
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
                  <ScanLine className="h-12 w-12 mb-2" />
                   <p>Ruhsat veya etiket görselini yükleyin.</p>
                </div>
              )}
            </div>
             {/* Combined Button Row */}
             <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={triggerFileInput}
                disabled={isScanning}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Camera className="mr-2 h-4 w-4" />
                Görsel Seç/Değiştir
              </Button>
              <Button
                onClick={handleManualScan}
                disabled={isScanning || !scannedImage}
                variant="secondary" // Use secondary variant for distinction
                className="flex-1"
              >
                {isScanning ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" /> // Using Search icon
                )}
                {isScanning ? 'Taranıyor...' : 'Görseli Tara'}
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="license-scan"
            />
          </div>

          {/* Data Fields Section - Updated Fields */}
          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Araç Bilgileri</h3>
            <div className="space-y-3">
               <div>
                <Label htmlFor="saseNo" className="text-sm font-medium text-foreground">Şase Numarası</Label>
                <Input
                  id="saseNo"
                  value={formData.saseNo || ''} // Handle potential undefined
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                   className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="marka" className="text-sm font-medium text-foreground">Marka</Label>
                <Input
                  id="marka"
                  value={formData.marka || ''} // Handle potential undefined
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                   className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
               <div>
                <Label htmlFor="tipOnayNo" className="text-sm font-medium text-foreground">Tip Onay No</Label>
                <Input
                  id="tipOnayNo"
                  value={formData.tipOnayNo || ''} // Handle potential undefined
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                   className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="varyant" className="text-sm font-medium text-foreground">Varyant</Label>
                <Input
                  id="varyant"
                  value={formData.varyant || ''} // Handle potential undefined
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                  className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
               <div>
                <Label htmlFor="versiyon" className="text-sm font-medium text-foreground">Versiyon</Label>
                <Input
                  id="versiyon"
                  value={formData.versiyon || ''} // Handle potential undefined
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                  className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
            </div>
             <div className="mt-6 pt-4 border-t">
                <h3 className="text-lg font-semibold text-foreground mb-3">Karşılaştırma Sonucu</h3>
                 <div className={`flex items-center gap-3 p-3 rounded-md border ${
                    isScanning ? 'border-muted bg-muted/50' : // Style for loading state
                    comparisonResult === 'uygun' ? 'border-green-200 bg-green-50' :
                    comparisonResult === 'uygun değil' ? 'border-red-200 bg-red-50' :
                    'border-muted bg-muted/50' // Default/Bekleniyor state
                 }`}>
                    {getResultIcon()}
                    <span className={`text-lg font-medium ${getResultColor()}`}>{getResultText()}</span>
                </div>
                 {/* Conditional Hints */}
                 <p className="text-xs text-muted-foreground mt-2">
                    {!scannedImage && !isScanning && "Karşılaştırma için önce bir görsel seçin ve tarayın."}
                    {scannedImage && !formData.saseNo && !isScanning && "Görsel seçildi. Taramak için 'Görseli Tara' butonuna basın."}
                    {isScanning && "Taranan veriler sistemdekiyle karşılaştırılıyor..."}
                    {comparisonResult !== 'bekleniyor' && !isScanning && "Taranan araç bilgileri sistemdeki verilerle karşılaştırıldı."}
                 </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
