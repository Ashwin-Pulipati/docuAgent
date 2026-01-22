"use client";

import * as React from "react";
import { useTitle, useWindowSize } from "react-use";
import { DocumentPanel, type DocumentPanelHandle } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { updateChat } from "@/lib/api";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { toast } from "sonner";

export default function Home() {
  const [selectedDocument, setSelectedDocument] =
    React.useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<Folder | null>(
    null,
  );
  const [selectedChat, setSelectedChat] = React.useState<ChatThread | null>(null);
  const sidebarRef = React.useRef<DocumentPanelHandle>(null);

  const handleSelectDocument = (doc: Document | null) => {
      setSelectedDocument(doc);
      if (doc) {
          setSelectedChat(null);
      }
  };

  const handleSelectFolder = (folder: Folder | null) => {
      setSelectedFolder(folder);
      if (folder) {
          setSelectedDocument(null);
          setSelectedChat(null);
      }
  };

  const handleSelectChat = (chat: ChatThread | null) => {
      setSelectedChat(chat);
      if (chat) {
          setSelectedDocument(null);
      }
  };

  const handleChatRename = async (newTitle: string) => {
      if (!selectedChat) return;
      try {
          const updated = await updateChat(selectedChat.id, newTitle);
          setSelectedChat(updated);
          sidebarRef.current?.refresh();
          toast.success("Chat renamed");
      } catch (e) {
          toast.error("Failed to rename chat");
      }
  };

  const { width } = useWindowSize();
  const isMobile = width < 768;

  useTitle(
    selectedDocument
      ? `DocuAgent | ${selectedDocument.name}`
      : selectedChat
        ? `DocuAgent | ${selectedChat.title}`
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
        ref={sidebarRef}
        selectedDocument={selectedDocument}
        setSelectedDocument={handleSelectDocument}
        selectedFolder={selectedFolder}
        setSelectedFolder={handleSelectFolder}
        selectedChat={selectedChat}
        setSelectedChat={handleSelectChat}
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
            key={selectedDocument?.doc_id ?? selectedFolder?.id ?? selectedChat?.id ?? "empty"}
            selectedDocument={selectedDocument}
            selectedFolder={selectedFolder}
            selectedChat={selectedChat}
            onRenameChat={handleChatRename}
          />
        </main>

        <Footer />
      </SidebarInset>

      <Toaster position="top-center" />
    </div>
  );
}