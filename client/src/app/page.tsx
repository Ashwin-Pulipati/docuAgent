"use client";

import * as React from "react";
import { useTitle, useWindowSize } from "react-use";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Document, Folder } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Home() {
  const [selectedDocument, setSelectedDocument] =
    React.useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<Folder | null>(
    null,
  );

  const { width } = useWindowSize();
  const isMobile = width < 768;

  useTitle(
    selectedDocument
      ? `DocuAgent | ${selectedDocument.name}`
      : selectedFolder
        ? `DocuAgent | ${selectedFolder.name}`
        : "DocuAgent | Dashboard",
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

      <SidebarInset className="relative flex h-full flex-col overflow-hidden">
        <Header />

        {isMobile && selectedDocument && (
          <div className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-card/30 px-4 backdrop-blur-sm md:hidden">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedDocument(null)}
              className="neo-glass inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to documents list"
            >
              <span aria-hidden="true">←</span> Back
            </Button>
          </div>
        )}

        <main
          id="main"
          className="z-10 flex-1 overflow-hidden p-4 md:p-6"
          aria-label="AI Chat Interface"
        >
          <ChatPanel
            key={selectedDocument?.doc_id ?? selectedFolder?.id ?? "empty"}
            selectedDocument={selectedDocument}
            selectedFolder={selectedFolder}
          />
        </main>

        <Footer />
      </SidebarInset>

      <Toaster position="top-center" />
    </div>
  );
}
