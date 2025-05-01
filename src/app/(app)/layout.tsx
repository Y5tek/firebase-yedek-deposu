'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { Home, FilePlus, Archive, Building, ClipboardList, FileText, FileCheck2, FileSignature, ListChecks } from 'lucide-react'; // Combined icons
import { Button } from '@/components/ui/button';
import { AppQueryClientProvider } from '@/providers/query-provider'; // Import the QueryClientProvider

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get the initial state from cookies or default to true (expanded)
  const getInitialSidebarState = () => {
    if (typeof window !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('sidebar_state='))
        ?.split('=')[1];
      return cookieValue ? cookieValue === 'true' : true;
    }
    return true;
  };

  const [open, setOpen] = React.useState(getInitialSidebarState);

  const isActive = (path: string, exact: boolean = true) => {
      if (exact) {
          return pathname === path;
      }
      return pathname.startsWith(path);
  };


  if (!isClient) {
    // Render nothing or a loading indicator on the server
    return null;
  }

  return (
    <AppQueryClientProvider> {/* Wrap the entire layout */}
      <SidebarProvider defaultOpen={open} onOpenChange={setOpen}>
        <Sidebar>
          <SidebarHeader>
            <Button variant="ghost" size="icon" className="h-10 w-10 self-end md:hidden" asChild>
              <SidebarTrigger/>
            </Button>
            <h2 className="text-xl font-semibold px-2">ArşivAsistanı</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/select-branch')}
                  tooltip="Şube Seçimi"
                >
                  <Link href="/select-branch">
                    <Building />
                    <span>Şube Seçimi</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/record-choice')}
                  tooltip="Kayıt Seçeneği"
                >
                  <Link href="/record-choice">
                    <Home />
                    <span>Kayıt Seçeneği</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/new-record', false)} // Check if path starts with /new-record
                  tooltip="Yeni Kayıt"
                >
                  {/* Link to the first step */}
                  <Link href="/new-record/step-1">
                    <FilePlus />
                    <span>Yeni Kayıt</span>
                  </Link>
                </SidebarMenuButton>
                {/* Add sub-menu for steps */}
                {isActive('/new-record', false) && (
                  <SidebarMenuSub>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-1')}>
                              {/* Adım 1: Ruhsat - matches title: Yeni Kayıt - Adım 1: Araç Ruhsatı */}
                              <Link href="/new-record/step-1"><FileText className="mr-2 h-3 w-3"/>Adım 1: Ruhsat</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-2')}>
                               {/* Adım 2: Etiket - matches title: Yeni Kayıt - Adım 2: Etiket Bilgileri */}
                              <Link href="/new-record/step-2"><FileText className="mr-2 h-3 w-3"/>Adım 2: Etiket</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-3')}>
                               {/* Adım 3: Ek Dosya - matches title: Yeni Kayıt - Adım 3: Ek Dosya Yükleme */}
                              <Link href="/new-record/step-3"><FilePlus className="mr-2 h-3 w-3"/>Adım 3: Ek Dosya</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-4')}>
                               {/* Adım 4: Seri Tadilat - matches title: Seri Tadilat Uygunluk Formu */}
                              <Link href="/new-record/step-4"><FileSignature className="mr-2 h-3 w-3"/>Adım 4: Seri Tadilat</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-5')}>
                               {/* Adım 5: Teklif */}
                              <Link href="/new-record/step-5"><ClipboardList className="mr-2 h-3 w-3"/>Adım 5: Teklif</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-6')}>
                              {/* Adım 6: Son Kontrol - matches title: ARA VE SON KONTROL FORMU */}
                              <Link href="/new-record/step-6"><FileCheck2 className="mr-2 h-3 w-3"/>Adım 6: Son Kontrol</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-7')}>
                               {/* Adım 7: Özet & Arşiv - matches title: Kayıt Özeti ve Tamamlama */}
                              <Link href="/new-record/step-7"><Archive className="mr-2 h-3 w-3"/>Adım 7: Özet & Arşiv</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/archive', true)} // Exact match for Archive
                  tooltip="Arşiv"
                >
                  <Link href="/archive">
                    <Archive />
                    <span>Arşiv</span>
                  </Link>
                </SidebarMenuButton>
                {/* Sub-menu for Archive Section - Removed */}
                {/*
                <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={isActive('/tip-onay-listesi')}>
                            <Link href="/tip-onay-listesi"><ListChecks className="mr-2 h-3 w-3"/>Tip Onay Listesi</Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
                */}
              </SidebarMenuItem>
               {/* Moved Tip Onay Listesi to top level */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/tip-onay-listesi', true)}
                  tooltip="Tip Onay Listesi"
                >
                    <Link href="/tip-onay-listesi">
                        <ListChecks />
                        <span>Tip Onay Listesi</span>
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {/* Footer content can go here */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </AppQueryClientProvider>
  );
}
