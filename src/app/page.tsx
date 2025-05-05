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

interface FormData extends ExtractDataFromVehicleLicenseOutput {
  [key: string]: string; // Add index signature
}

const initialFormData: FormData = {
  ruhsatNo: '',
  etiketNo: '',
  marka: '',
  model: '',
};

const secondPageData: FormData = {
  ruhsatNo: '12345', // Sample data for comparison
  etiketNo: '67890',
  marka: 'Toyota',
  model: 'Corolla',
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
        setFormData(prevData => ({
          ...prevData,
          ruhsatNo: result.ruhsatNo || '',
          etiketNo: result.etiketNo || '',
          marka: result.marka || '',
          model: result.model || '',
        }));
        toast({
          title: 'Tarama Başarılı',
          description: 'Ruhsat verileri başarıyla okundu.',
        });
      } catch (error) {
        console.error('Error extracting data:', error);
        toast({
          title: 'Tarama Hatası',
          description: 'Ruhsat verileri okunurken bir hata oluştu.',
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
    const scanned = {
      ruhsatNo: formData.ruhsatNo,
      etiketNo: formData.etiketNo,
      marka: formData.marka,
      model: formData.model,
    };

    // Check if all scanned fields have data
    const hasScannedData = Object.values(scanned).every(val => val && val.trim() !== '');

    if (!hasScannedData) {
        setComparisonResult('bekleniyor');
        return;
    }

    const isMatch =
      scanned.ruhsatNo === secondPageData.ruhsatNo &&
      scanned.etiketNo === secondPageData.etiketNo &&
      scanned.marka === secondPageData.marka &&
      scanned.model === secondPageData.model;

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
            Araç Ruhsat Tarayıcı
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Araç ruhsatı veya etiketinin fotoğrafını yükleyerek bilgileri
            otomatik doldurun ve karşılaştırın.
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
                  alt="Taranan Ruhsat"
                  layout="fill"
                  objectFit="contain"
                  data-ai-hint="vehicle license plate"
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
              {isScanning ? 'Taranıyor...' : 'Ruhsat Tara/Yükle'}
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

          {/* Data Fields Section */}
          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Araç Bilgileri</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="ruhsatNo" className="text-sm font-medium text-foreground">Ruhsat Numarası</Label>
                <Input
                  id="ruhsatNo"
                  value={formData.ruhsatNo}
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                   className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="etiketNo" className="text-sm font-medium text-foreground">Etiket Numarası</Label>
                <Input
                  id="etiketNo"
                  value={formData.etiketNo}
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
                  value={formData.marka}
                  onChange={handleInputChange}
                  placeholder="-"
                  readOnly={isScanning}
                   className="mt-1 bg-white read-only:bg-muted/50 read-only:cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="model" className="text-sm font-medium text-foreground">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
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
                        Taranan ruhsat bilgileri sistemdeki verilerle karşılaştırıldı.
                    </p>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
