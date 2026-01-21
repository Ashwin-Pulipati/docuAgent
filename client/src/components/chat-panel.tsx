"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAsyncFn, useInterval, useList, useCopyToClipboard, useNetworkState } from "react-use";
import { toast } from "sonner";
import type { AgenticResult, Document, Folder, JobStatusResponse } from "@/lib/api";
import { getJobStatus, postQuery, AgenticResultSchema } from "@/lib/api";
import { normalizeStatus, friendlyStatus } from "@/lib/utils";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, FileText, Copy, Check } from "lucide-react";

type MessageStatus = "pending" | "complete" | "error";

type Message = {
  id: string;
  sender: "user" | "agent";
  text: string;
  result?: AgenticResult;
  status: MessageStatus;
};

type PollingEntry = { idx: number };

function isDoneStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return v.includes("completed") || v.includes("success") || v.includes("succeeded") || v.includes("finished");
}

function isFailedStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return v.includes("failed") || v.includes("cancel");
}

function parseAgenticOutput(output: JobStatusResponse["output"]): AgenticResult | null {
  if (!output || typeof output !== "object") return null;
  const parsed = AgenticResultSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

const MessageItem = ({ msg, isUser }: { readonly msg: Message; readonly isUser: boolean }) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(msg.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <li className={`flex items-start gap-3 group ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <Avatar aria-label="AI Assistant" className="h-8 w-8 ring-2 ring-primary/10">
          <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-white">AI</AvatarFallback>
        </Avatar>
      )}

      <div className="relative max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
            isUser
              ? "bg-gradient-to-br from-primary via-secondary to-accent text-white rounded-br-none"
              : "bg-muted/50 border border-border/50 rounded-bl-none"
          }`}
          role="log"
          aria-live={msg.status === "pending" ? "polite" : "off"}
        >
          {msg.text}
          {msg.status === "pending" && (
            <div className="mt-2 flex items-center gap-1 text-xs opacity-70" aria-label="Typing indicator">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </div>
          )}
        </div>
        
        {!isUser && msg.status !== "pending" && (
           <Button
             variant="ghost"
             size="icon"
             className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
             onClick={handleCopy}
             aria-label="Copy message text"
           >
             {isCopied ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
           </Button>
        )}
      </div>

      {isUser && (
        <Avatar aria-label="You" className="h-8 w-8 ring-2 ring-primary/10">
          <AvatarFallback className="bg-gradient-to-br from-surface1 to-surface2 text-white">U</AvatarFallback>
        </Avatar>
      )}
    </li>
  );
};

export function ChatPanel({
    selectedDocument,
    selectedFolder
}: {
    readonly selectedDocument: Document | null;
    readonly selectedFolder: Folder | null;
}) {
  const [messages, { push, updateAt }] = useList<Message>([]);
  const [inputValue, setInputValue] = useState("");
  const [polling, setPolling] = useState<Map<string, PollingEntry>>(new Map());
  const initialized = useRef(false);
  const network = useNetworkState();

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const targetName = selectedDocument ? selectedDocument.name : selectedFolder ? selectedFolder.name : null;
  const targetType = selectedDocument ? "document" : "folder";

  useEffect(() => {
    if (!initialized.current && targetName) {
      push({
        id: `welcome-${Date.now()}`,
        sender: "agent",
        text: `Ready to answer questions about this ${targetType}: ${targetName}.`,
        status: "complete",
      });
      initialized.current = true;
    }
  }, [targetName, targetType, push]);

  const canAsk = useMemo(() => {
    if (!network.online) return false;
    if (selectedDocument) {
        const s = normalizeStatus(selectedDocument.status);
        return s === "ingested" || s === "completed";
    }
    if (selectedFolder) return true;
    return false;
  }, [selectedDocument, selectedFolder, network.online]);

  const [{ loading: checking }, checkJob] = useAsyncFn(
    async (eventId: string, idx: number) => {
      const r = await getJobStatus(eventId);
      const done = isDoneStatus(r.status);
      const failed = isFailedStatus(r.status);

      if (!done && !failed) return;

      const parsed = parseAgenticOutput(r.output);

      let text = "No answer returned.";
      if (failed) {
        text = "Sorry — the request failed.";
      } else if (parsed?.needs_clarification) {
        text = parsed.clarifying_question ?? "I need one clarification.";
      } else if (parsed?.answer) {
        text = parsed.answer;
      }

      updateAt(idx, {
        ...messages[idx],
        id: eventId,
        status: failed ? "error" : "complete",
        text,
        result: parsed ?? undefined,
      });

      setPolling((prev) => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    },
    [messages, updateAt]
  );

  useInterval(
    () => {
      polling.forEach((v, eventId) => {
        void checkJob(eventId, v.idx);
      });
    },
    polling.size > 0 ? 2000 : null
  );

  const [{ loading: asking }, submitQuestion] = useAsyncFn(async () => {
    if (!selectedDocument && !selectedFolder) return;
    if (!inputValue.trim()) return;
    if (!network.online) {
        toast.error("You are offline.");
        return;
    }

    const userText = inputValue.trim();

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      status: "complete",
    };
    push(userMsg);

    const agentIdx = messages.length + 1;
    const agentMsg: Message = {
      id: `agent-${Date.now()}`,
      sender: "agent",
      text: "Analysing…",
      status: "pending",
    };
    push(agentMsg);

    setInputValue("");

    try {
      const res = await postQuery(
          userText,
          selectedDocument?.doc_id ?? null,
          6,
          selectedFolder?.id ?? null
      );
      updateAt(agentIdx, { ...agentMsg, id: res.query_event_id });
      setPolling((prev) => new Map(prev).set(res.query_event_id, { idx: agentIdx }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit your question.";
      toast.error(msg);
      updateAt(agentIdx, { ...agentMsg, text: "Sorry, I could not submit your question.", status: "error" });
    }
  }, [inputValue, selectedDocument, selectedFolder, messages, push, updateAt, network.online]);

  useEffect(() => {
      if (viewportRef.current) {
          viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
      }
  }, [messages]);

  if (!selectedDocument && !selectedFolder) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed border-border/50">
        <div className="bg-muted/50 p-4 rounded-full mb-4">
           <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
            Select a document or folder
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm">
            Choose a document or an entire folder to start analyzing and chatting with your data.
        </p>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col gradient-border shadow-none bg-transparent">
      <CardHeader className="space-y-1 pb-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <CardTitle className="truncate flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
                {targetName}
            </span>
        </CardTitle>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {selectedDocument ? (
              <>
                <span className={`h-2 w-2 rounded-full animate-pulse ${normalizeStatus(selectedDocument.status) === 'ingested' ? 'bg-green' : 'bg-yellow'}`}/>
                Status: <span className="font-medium text-foreground">{friendlyStatus(selectedDocument.status)}</span>
              </>
          ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-blue animate-pulse"/>
                <span className="font-medium text-foreground">Folder Context</span>
              </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <ScrollArea className="h-full w-full" ref={scrollRef} viewportRef={viewportRef}>
          <ul className="p-4 space-y-6">
            {messages.map((msg, i) => (
               <MessageItem key={msg.id ?? i} msg={msg} isUser={msg.sender === "user"} />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>

      <CardFooter className="pt-4 pb-0 bg-card/50 backdrop-blur-sm border-t p-4">
        <div className="flex w-full items-center gap-2 bg-background border rounded-full px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitQuestion();
            }}
            placeholder={!network.online ? "Offline - Chat unavailable" : canAsk ? `Ask about this ${targetType}…` : "Wait for processing…"}
            disabled={!canAsk || asking || checking || !network.online}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent px-4"
            aria-disabled={!canAsk || asking || checking || !network.online}
            aria-label="Chat input"
          />
          <Button
            onClick={() => void submitQuestion()}
            disabled={!canAsk || asking || checking || !inputValue.trim() || !network.online}
            size="icon"
            className="rounded-full h-8 w-8 shrink-0 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 text-white" aria-hidden="true" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}