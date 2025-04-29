'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, Archive } from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state'; // Import the hook
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function RecordChoicePage() {
  const router = useRouter();
  const { branch } = useAppState(); // Get the selected branch

  const handleNewRecord = () => {
    router.push('/new-record/step-1');
  };

  const handleExistingRecords = () => {
    router.push('/archive');
  };

   // Redirect if no branch is selected
  React.useEffect(() => {
    if (!branch) {
      router.push('/select-branch');
    }
  }, [branch, router]);


  if (!branch) {
      // Optionally show a loading or redirecting message
      return <div className="flex min-h-screen items-center justify-center p-4">Şube seçimine yönlendiriliyorsunuz...</div>;
  }


  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Kayıt Seçenekleri</CardTitle>
           <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Seçilen Şube: {branch ? branch : 'Seçilmedi'}</AlertTitle>
              <AlertDescription>
                İşlemleriniz bu şube üzerinden devam edecektir.
              </AlertDescription>
            </Alert>
          <CardDescription>Lütfen yapmak istediğiniz işlemi seçin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Button
            onClick={handleNewRecord}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            <FilePlus className="mr-2 h-5 w-5" />
            Yeni Kayıt Oluştur
          </Button>
          <Button
            onClick={handleExistingRecords}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Archive className="mr-2 h-5 w-5" />
            Mevcut Kayıtları Görüntüle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
