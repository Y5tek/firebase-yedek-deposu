'use client';

import type {ChangeEvent} from 'react';
import React, {useState, useCallback, useEffect} from 'react';
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
import {Camera, CheckCircle, XCircle, Loader2, ScanLine} from 'lucide-react';
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {id, value} = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScannedImage(null); // Clear previous image
    setFormData(initialFormData); // Reset form data
    setComparisonResult('bekleniyor'); // Reset comparison

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result as string;
      setScannedImage(base64Image); // Display the uploaded image
      try {
        const result = await extractDataFromVehicleLicense({
          licenseImageDataUri: base64Image,
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
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        title: 'Dosya Okuma Hatası',
        description: 'Görsel dosyası okunurken bir hata oluştu.',
        variant: 'destructive',
      });
      setIsScanning(false);
      setFormData(initialFormData); // Clear form on error
    };
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const compareData = useCallback(() => {
    // Use updated fields for scanned data
    const scanned = {
      saseNo: formData.saseNo,
      marka: formData.marka,
      tipOnayNo: formData.tipOnayNo,
      varyant: formData.varyant,
      versiyon: formData.versiyon,
    };

    // Check if all scanned fields have data (handle potential undefined from state)
    const hasScannedData = Object.values(scanned).every(val => val && String(val).trim() !== '');


    if (!hasScannedData) {
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
  }, [formData]);

  useEffect(() => {
    compareData();
  }, [formData, compareData]);

  const getResultIcon = () => {
    switch (comparisonResult) {
      case 'uygun':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'uygun değil':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
    }
  };

  const getResultText = () => {
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
          <div className="space-y-4">
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
            <Button
              onClick={triggerFileInput}
              disabled={isScanning}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Camera className="mr-2 h-4 w-4" />
              {isScanning ? 'Taranıyor...' : 'Tara/Yükle'}
            </Button>
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
                 <div className={`flex items-center gap-3 p-3 rounded-md border ${comparisonResult === 'uygun' ? 'border-green-200 bg-green-50' : comparisonResult === 'uygun değil' ? 'border-red-200 bg-red-50' : 'border-muted bg-muted/50'}`}>
                    {getResultIcon()}
                    <span className={`text-lg font-medium ${getResultColor()}`}>{getResultText()}</span>
                </div>
                {comparisonResult !== 'bekleniyor' && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Taranan araç bilgileri sistemdeki verilerle karşılaştırıldı.
                    </p>
                )}
                 {comparisonResult === 'bekleniyor' && formData.saseNo && ( // Show explanation if waiting but has scanned data
                    <p className="text-xs text-muted-foreground mt-2">
                        Taranan veriler sistemdekiyle karşılaştırılıyor...
                    </p>
                 )}
                 {comparisonResult === 'bekleniyor' && !formData.saseNo && !scannedImage && ( // Initial state hint
                    <p className="text-xs text-muted-foreground mt-2">
                        Karşılaştırma için önce bir görsel tarayın veya yükleyin.
                    </p>
                 )}
                  {comparisonResult === 'bekleniyor' && !formData.saseNo && scannedImage && !isScanning && ( // Hint if scan failed/returned no data
                    <p className="text-xs text-muted-foreground mt-2">
                       Görsel tarandı ancak veri çıkarılamadı veya eksik. Lütfen tekrar deneyin veya manuel girin.
                    </p>
                 )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
