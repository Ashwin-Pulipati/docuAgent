"use client";

import * as React from "react";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { useAgenticChat } from "@/hooks/use-agentic-chat";
import { ChatHeader } from "./chat-header";
import { ChatComposer } from "./chat-composer";
import { EmptyChatState } from "./empty-chat-state";
import { MessageItem } from "./message-item";

export function ChatPanel({
  selectedDocument,
  selectedFolder,
  selectedChat,
  onRenameChat,
  onCreateChat,
  isReady = true,
}: {
  readonly selectedDocument: Document | null;
  readonly selectedFolder: Folder | null;
  readonly selectedChat: ChatThread | null;
  readonly onRenameChat?: (newTitle: string) => void;
  readonly onCreateChat?: () => void;
  readonly isReady?: boolean;
}) {
  const targetName = selectedDocument
    ? selectedDocument.name
    : selectedFolder
      ? selectedFolder.name
      : selectedChat
        ? selectedChat.title
        : "";

  const targetType = selectedDocument ? "document" : "folder";

  const {
    messages,
    inputValue,
    setInputValue,
    canAsk,
    isGenerating,
    copiedId,
    copiedValue,
    copyMessage,
    submit,
    stop,
    edit,
    asking,
    checking,
    online,
    onReaction,
  } = useAgenticChat({ selectedDocument, selectedFolder, selectedChat });

  const [userScrolled, setUserScrolled] = React.useState(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // Handle scroll events on window
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolled(!isAtBottom);
      setShowScrollButton(!isAtBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smart auto-scroll
  React.useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const isUserMessage = lastMsg?.sender === "user";
    
    // Scroll if we're already at the bottom OR if it's a new user message
    if (!userScrolled || isUserMessage) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, userScrolled]);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
    setUserScrolled(false);
    setShowScrollButton(false);
  };

  if (!selectedChat) {
      return <EmptyChatState selectedDocument={selectedDocument} selectedFolder={selectedFolder} onCreateChat={onCreateChat} disabled={!isReady} />;
  }

  const disabled = !canAsk || asking || checking || !online || isGenerating;
  const placeholder = canAsk
    ? `Ask about this ${targetType}…`
    : "Wait for processing…";

  return (
    <Card className="flex flex-col min-h-[calc(100vh-4rem)] border-none bg-transparent shadow-none max-w-7xl mx-auto relative">
      <div className="sticky top-4 z-30 pointer-events-none flex justify-center">
        <div className="pointer-events-auto">
          <ChatHeader
            selectedDocument={selectedDocument}
            selectedFolder={selectedFolder}
            targetName={targetName}
            onRename={selectedChat ? onRenameChat : undefined}
          />
        </div>
      </div>

      <CardContent className="flex-1 p-0 pb-4">
        <ul
          className="space-y-6 p-4 md:px-8"
          role="log"
          aria-live={isGenerating ? "polite" : "off"}
          aria-relevant="additions text"
          aria-label="Chat messages"
        >
          {messages.map((msg, i) => (
            <MessageItem
              key={msg.id ?? i}
              msg={msg}
              isUser={msg.sender === "user"}
              isCopied={copiedId === msg.id && copiedValue === msg.text}
              onCopy={() => copyMessage(msg.id, msg.text)}
              onReaction={onReaction}
              onEdit={
                msg.sender === "user"
                  ? () => edit(msg.id, msg.text)
                  : undefined
              }
            />
          ))}
        </ul>
      </CardContent>

      <div className="sticky bottom-20 z-30 pointer-events-none flex justify-center px-4 mt-4">
        <div className="pointer-events-auto w-full max-w-4xl relative">
          {showScrollButton && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-14 left-1/2 -translate-x-1/2 z-40 h-10 w-10 rounded-full shadow-lg text-secondary bg-secondary/10 animate-in fade-in zoom-in duration-200"
              onClick={scrollToBottom}
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          )}
          
          <CardFooter className="p-0 border-none bg-transparent shadow-none w-full flex-col">
            <div className="w-full rounded-4xl border border-border/40 bg-background/60 p-0.5 shadow-2xl backdrop-blur-xl">
              <ChatComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={submit}
                onStop={stop}
                disabled={disabled}
                canAsk={canAsk}
                isGenerating={isGenerating}
                placeholder={placeholder}
              />
            </div>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}