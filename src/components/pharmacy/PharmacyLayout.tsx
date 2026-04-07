
import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PharmacySidebar } from './PharmacySidebar';
import { Toaster } from "@/components/ui/toaster";

interface PharmacyLayoutProps {
  children: React.ReactNode;
}

export function PharmacyLayout({ children }: PharmacyLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-green-50">
        <PharmacySidebar collapsible="icon" />
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
