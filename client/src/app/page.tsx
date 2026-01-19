"use client";

import * as React from "react";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";
import { Toaster } from "@/components/ui/sonner";
import type { Document } from "@/lib/api";

export default function Home() {
  const [selectedDocument, setSelectedDocument] =
    React.useState<Document | null>(null);

  return (
    <main className="flex h-screen flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <div className="w-full max-w-screen-2xl h-full grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm">
          <DocumentPanel
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
          />
        </div>
        <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm">
          <ChatPanel selectedDocument={selectedDocument} />
        </div>
      </div>
      <Toaster />
    </main>
  );
}
