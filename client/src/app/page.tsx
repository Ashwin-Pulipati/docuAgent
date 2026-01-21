"use client";

import * as React from "react";
import { useTitle, useWindowSize } from "react-use";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import type { Document, Folder } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<Folder | null>(null);
  
  const { width } = useWindowSize();
  const isMobile = width < 768;

  useTitle(
    selectedDocument 
      ? `DocuAgent | ${selectedDocument.name}` 
      : selectedFolder 
      ? `DocuAgent | ${selectedFolder.name}` 
      : "DocuAgent | Dashboard"
  );

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20">
         <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-accent/30 blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-secondary/30 blur-[120px] animate-pulse delay-1000" />
      </div>

      <DocumentPanel
        selectedDocument={selectedDocument}
        setSelectedDocument={setSelectedDocument}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
      />

      <SidebarInset className="flex flex-col h-full overflow-hidden relative">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 z-20">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          {isMobile && selectedDocument && (
            <Button 
                onClick={() => setSelectedDocument(null)}
                className="text-sm text-primary font-medium px-4 py-2 hover:bg-muted/20 rounded-lg transition-colors"
                aria-label="Back to documents list"
            >
                ← Back
            </Button>
          )}
        </header>

        <section 
          className="flex-1 overflow-hidden z-10 p-4 md:p-6"
          aria-label="AI Chat Interface"
        >
          <ChatPanel 
              key={selectedDocument?.doc_id ?? selectedFolder?.id ?? 'empty'}
              selectedDocument={selectedDocument}
              selectedFolder={selectedFolder} 
          />
        </section>
      </SidebarInset>

      <Toaster position="top-center" />
    </div>
  );
}
