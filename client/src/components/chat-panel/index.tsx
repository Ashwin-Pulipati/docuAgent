"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document, Folder } from "@/lib/api";
import * as React from "react";
import { useAgenticChat } from "../../hooks/use-agentic-chat";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { EmptyChatState } from "./empty-chat-state";
import { MessageItem } from "./message-item";

export function ChatPanel({
  selectedDocument,
  selectedFolder,
}: {
  readonly selectedDocument: Document | null;
  readonly selectedFolder: Folder | null;
}) {
  const targetName = selectedDocument
    ? selectedDocument.name
    : selectedFolder
      ? selectedFolder.name
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
  } = useAgenticChat({ selectedDocument, selectedFolder });

  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  if (!selectedDocument && !selectedFolder) return <EmptyChatState />;

  const disabled = !canAsk || asking || checking || !online || isGenerating;
  const placeholder = canAsk
    ? `Ask about this ${targetType}…`
    : "Wait for processing…";

  return (
    <Card className="glass-card flex h-full flex-col border border-border/50 bg-card/20 shadow-none">
      <ChatHeader
        selectedDocument={selectedDocument}
        selectedFolder={selectedFolder}
        targetName={targetName}
      />

      <CardContent className="relative flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full w-full" viewportRef={viewportRef}>
          <ul
            className="space-y-6 p-4"
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
                onEdit={
                  msg.sender === "user"
                    ? () => edit(msg.id, msg.text)
                    : undefined
                }
              />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>

      <CardFooter className="rounded-b-2xl border-t border-border/50 bg-card/40 p-4 backdrop-blur-sm">
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
      </CardFooter>
    </Card>
  );
}
