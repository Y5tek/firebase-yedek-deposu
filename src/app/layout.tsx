import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
<<<<<<< HEAD
import {Toaster} from '@/components/ui/toaster'; // Import Toaster
=======
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'Araç Ruhsat Tarayıcı', // Updated title
  description: 'Araç ruhsat ve etiket bilgilerini tarayın ve karşılaştırın.', // Updated description
=======
  title: 'ArşivAsistanı', // Update title
  description: 'Belge tarama ve arşivleme uygulaması', // Update description
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<<<<<<< HEAD
=======
    // Update language to Turkish
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster component */}
      </body>
    </html>
  );
}
