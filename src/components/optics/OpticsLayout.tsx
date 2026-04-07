
import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OpticsSidebar } from './OpticsSidebar';
import { Toaster } from "@/components/ui/toaster";

interface OpticsLayoutProps {
  children: React.ReactNode;
}

export function OpticsLayout({ children }: OpticsLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-blue-50">
        <OpticsSidebar collapsible="icon" />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center border-b bg-white px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 bg-white">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
