
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
} from '@/components/ui/sidebar';
import { Home, FilePlus, Archive, Building, ClipboardList, FileText } from 'lucide-react'; // Added FileText for Step 5
import { Button } from '@/components/ui/button';

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
              {/* Optional: Add sub-menu for steps if needed later */}
              {/* {isActive('/new-record', false) && (
                 <SidebarMenuSub>
                     <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-1')}>
                             <Link href="/new-record/step-1">Adım 1: Ruhsat</Link>
                         </SidebarMenuSubButton>
                     </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-2')}>
                             <Link href="/new-record/step-2">Adım 2: Etiket</Link>
                         </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-3')}>
                             <Link href="/new-record/step-3">Adım 3: Ek Dosya</Link>
                         </SidebarMenuSubButton>
                     </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                         <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-4')}>
                             <Link href="/new-record/step-4">Adım 4: Form</Link>
                         </SidebarMenuSubButton>
                     </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                         <SidebarMenuSubButton asChild isActive={isActive('/new-record/step-5')}>
                             <Link href="/new-record/step-5">Adım 5: Teklif</Link>
                         </SidebarMenuSubButton>
                     </SidebarMenuSubItem>
                 </SidebarMenuSub>
              )} */}
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/archive')}
                tooltip="Arşiv"
              >
                <Link href="/archive">
                  <Archive />
                  <span>Arşiv</span>
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
  );
}
