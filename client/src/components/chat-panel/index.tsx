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

  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const isAtBottomRef = React.useRef(true);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Handle scroll events
  React.useEffect(() => {
    const scrollArea = scrollContainerRef.current?.closest(".overflow-y-auto");
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea as HTMLElement;
      // Use a slightly larger threshold (100px) to be more forgiving
      const bottom = scrollHeight - scrollTop - clientHeight < 100;
      isAtBottomRef.current = bottom;
      setIsAtBottom(bottom);
    };

    scrollArea.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollArea.removeEventListener("scroll", handleScroll);
  }, []); // Only run on mount

  // Watch for ANY size change in the message list (new messages, status changes, reactions)
  React.useEffect(() => {
    const scrollArea = scrollContainerRef.current?.closest(".overflow-y-auto");
    const list = listRef.current;
    if (!scrollArea || !list) return;

    const observer = new ResizeObserver(() => {
      const lastMsg = messages[messages.length - 1];
      const isUserMessage = lastMsg?.sender === "user";

      if (isAtBottomRef.current || isUserMessage) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: isUserMessage ? "smooth" : "instant",
        });
      }
    });

    observer.observe(list);
    return () => observer.disconnect();
  }, [messages]); // Re-bind when messages array changes to check isUserMessage

  const scrollToBottom = () => {
    const scrollArea = scrollContainerRef.current?.closest(".overflow-y-auto");
    if (scrollArea) {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "smooth",
      });
    }
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  };

  if (!selectedChat) {
      return <EmptyChatState selectedDocument={selectedDocument} selectedFolder={selectedFolder} onCreateChat={onCreateChat} disabled={!isReady} />;
  }

  const disabled = !canAsk || asking || checking || !online || isGenerating;
  const placeholder = canAsk
    ? `Ask about this ${targetType}…`
    : "Wait for processing…";

  return (
    <Card ref={scrollContainerRef} className="flex flex-col min-h-full border-none bg-transparent shadow-none max-w-7xl mx-auto relative">
      <div className="sticky top-20 z-30 pointer-events-none flex justify-center">
        <div className="pointer-events-auto">
          <ChatHeader
            selectedDocument={selectedDocument}
            selectedFolder={selectedFolder}
            targetName={targetName}
            onRename={selectedChat ? onRenameChat : undefined}
          />
        </div>
      </div>

      <CardContent className="flex-1 p-0">
        <ul
          ref={listRef}
          className="space-y-6 p-4 md:px-8 pb-40"
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
          {!isAtBottom && (
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