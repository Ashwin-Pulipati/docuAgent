"use client";

import type {
  AgenticResult,
  Document,
  Folder,
  JobStatusResponse,
} from "@/lib/api";
import { AgenticResultSchema, getJobStatus, postQuery } from "@/lib/api";
import { cn, friendlyStatus, normalizeStatus, getStringColor } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAsyncFn,
  useCopyToClipboard,
  useInterval,
  useList,
  useNetworkState,
} from "react-use";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, FileText, Origami, Send, Edit2, Square } from "lucide-react";

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
  return (
    v.includes("completed") ||
    v.includes("success") ||
    v.includes("succeeded") ||
    v.includes("finished")
  );
}

function isFailedStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return v.includes("failed") || v.includes("cancel");
}

function parseAgenticOutput(
  output: JobStatusResponse["output"],
): AgenticResult | null {
  if (!output || typeof output !== "object") return null;
  const parsed = AgenticResultSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

const MessageItem = React.memo(function MessageItem({
  msg,
  isUser,
  onCopy,
  isCopied,
  onEdit,
}: {
  readonly msg: Message;
  readonly isUser: boolean;
  readonly onCopy: () => void;
  readonly isCopied: boolean;
  readonly onEdit?: () => void;
}) {
  return (
    <li className={cn("group flex items-start gap-3", isUser && "justify-end")}>
      {!isUser && (
        <Avatar
          aria-label="AI Assistant"
          className="h-9 w-9 bg-linear-to-t from-transparent to-primary/50"
        >
          <AvatarImage
            src="/ai.png"
            alt="AI Assistant"
            className="object-contain"
          />
          <AvatarFallback className="bg-gradient text-muted-foreground">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      <div className="relative max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm",
            "border border-border/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring translate-y-6",
            isUser
              ? cn(
                  "rounded-tr-none",
                  "bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20",
                  "text-foreground",
                )
              : cn(
                  "rounded-tl-none",
                  "bg-card/60 backdrop-blur-sm text-foreground",
                ),
          )}
        >
          {msg.text}

          {msg.status === "pending" && (
            <span
              className="ml-1 inline-flex items-center gap-1"
              aria-label="Typing indicator"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse delay-75" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse delay-150" />
            </span>
          )}

          {!isUser &&
            msg.result?.citations &&
            msg.result.citations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border/30">
                {msg.result.citations.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={cn(
                      "text-[10px] transition-colors",
                      getStringColor(c.source),
                    )}
                    title={c.quote}
                  >
                    {c.source} {c.page_number ? `(p. ${c.page_number})` : ""}
                  </Badge>
                ))}
              </div>
            )}
        </div>

        <div
          className={cn(
            "absolute top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "-left-20" : "-right-10",
          )}
        >
          {isUser && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/50 shadow-sm backdrop-blur-sm hover:bg-accent/10 translate-y-1/2"
              onClick={onEdit}
              aria-label="Edit message"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full bg-background/50 shadow-sm backdrop-blur-sm hover:bg-accent/10 translate-y-1/2",
              isCopied && "text-primary",
            )}
            onClick={onCopy}
            aria-label="Copy message text"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {isUser && (
        <Avatar aria-label="You" className="h-9 w-9">
          <AvatarImage src="/user.png" alt="You" className="object-cover" />
          <AvatarFallback className="bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 text-muted-foreground brightness-105">
            <Origami className="h-5 w-5 scale-x-[-1] text-rosewater/80" />
          </AvatarFallback>
        </Avatar>
      )}
    </li>
  );
});

export function ChatPanel({
  selectedDocument,
  selectedFolder,
}: {
  readonly selectedDocument: Document | null;
  readonly selectedFolder: Folder | null;
}) {
  const [messages, { push, updateAt, set }] = useList<Message>([]);
  const [inputValue, setInputValue] = useState("");
  const [polling, setPolling] = useState<Map<string, PollingEntry>>(new Map());
  const initialized = useRef(false);
  const network = useNetworkState();
  const viewportRef = useRef<HTMLDivElement>(null);

  const targetName = selectedDocument
    ? selectedDocument.name
    : selectedFolder
      ? selectedFolder.name
      : null;
  const targetType = selectedDocument ? "document" : "folder";

  const [{ value: copiedValue }, copyToClipboard] = useCopyToClipboard();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    return Boolean(selectedFolder);
  }, [selectedDocument, selectedFolder, network.online]);

  const [{ loading: checking }, checkJob] = useAsyncFn(
    async (eventId: string, idx: number) => {
      const r = await getJobStatus(eventId);
      const done = isDoneStatus(r.status);
      const failed = isFailedStatus(r.status);
      if (!done && !failed) return;

      const parsed = parseAgenticOutput(r.output);

      let text = "No answer returned.";
      if (failed) text = "Sorry — the request failed.";
      else if (parsed?.needs_clarification)
        text = parsed.clarifying_question ?? "I need one clarification.";
      else if (parsed?.answer) text = parsed.answer;

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
    [messages, updateAt],
  );

  useInterval(
    () => {
      polling.forEach((v, eventId) => {
        void checkJob(eventId, v.idx);
      });
    },
    polling.size > 0 ? 2000 : null,
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
      text: "Analysing",
      status: "pending",
    };
    push(agentMsg);

    setInputValue("");

    try {
      const res = await postQuery(
        userText,
        selectedDocument?.doc_id ?? null,
        6,
        selectedFolder?.id ?? null,
      );
      updateAt(agentIdx, { ...agentMsg, id: res.query_event_id });
      setPolling((prev) =>
        new Map(prev).set(res.query_event_id, { idx: agentIdx }),
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to submit your question.";
      toast.error(msg);
      updateAt(agentIdx, {
        ...agentMsg,
        text: "Sorry, I could not submit your question.",
        status: "error",
      });
    }
  }, [
    inputValue,
    selectedDocument,
    selectedFolder,
    messages,
    push,
    updateAt,
    network.online,
  ]);

  const stopGenerating = useCallback(() => {
    // Find pending message(s) and stop polling
    const newPolling = new Map(polling);
    newPolling.forEach(({ idx }) => {
        updateAt(idx, { ...messages[idx], status: "error", text: "Stopped by user." });
    });
    setPolling(new Map());
  }, [polling, updateAt, messages]);

  const handleEdit = useCallback((msgId: string, text: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    
    // Stop any ongoing generation first if we are editing
    if (polling.size > 0) {
        stopGenerating();
    }

    setInputValue(text);
    // Remove this message and everything after it
    const newMessages = messages.slice(0, idx);
    set(newMessages);
  }, [messages, set, polling, stopGenerating]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleCopyFactory = useCallback(
    (id: string, text: string) => () => {
      copyToClipboard(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    },
    [copyToClipboard],
  );

  if (!selectedDocument && !selectedFolder) {
    return (
      <div className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-border/50 p-8 text-center">
        <div className="mb-4 rounded-2xl bg-muted/50 p-4 bg-gradient">
          <FileText
            className="h-10 w-10 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h2 className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-display font-semibold text-transparent md:text-3xl">
          Select a document or folder
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Choose a document or an entire folder to start analyzing and chatting
          with your data.
        </p>
      </div>
    );
  }

  const docReady =
    selectedDocument &&
    (normalizeStatus(selectedDocument.status) === "ingested" ||
      normalizeStatus(selectedDocument.status) === "completed");

  const isGenerating = polling.size > 0;

  return (
    <Card className="glass-card flex h-full flex-col border border-border/50 bg-card/20 shadow-none">
      <CardHeader className="sticky top-0 z-10 space-y-1 rounded-t-2xl border-b border-border/50 bg-card/40 px-6 pb-4 backdrop-blur-sm">
        <CardTitle className="mt-4 flex items-center gap-2 truncate">
          <span className="text-gradient text-3xl font-bold">{targetName}</span>
        </CardTitle>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {selectedDocument ? (
            <>
              <span
                className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  docReady ? "bg-primary" : "bg-secondary",
                )}
                aria-hidden="true"
              />
              <span>Status:</span>
              <span className="font-medium text-foreground">
                {friendlyStatus(selectedDocument.status)}
              </span>
            </>
          ) : (
            <>
              <span
                className="h-2 w-2 rounded-full bg-secondary animate-pulse"
                aria-hidden="true"
              />
              <span className="font-medium text-foreground">
                Folder Context
              </span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full w-full" viewportRef={viewportRef}>
          <ul className="space-y-6 p-4">
            {messages.map((msg, i) => (
              <MessageItem
                key={msg.id ?? i}
                msg={msg}
                isUser={msg.sender === "user"}
                onCopy={handleCopyFactory(msg.id, msg.text)}
                isCopied={copiedId === msg.id && copiedValue === msg.text}
                onEdit={msg.sender === "user" ? () => handleEdit(msg.id, msg.text) : undefined}
              />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>

      <CardFooter className="rounded-b-2xl border-t border-border/50 bg-card/40 p-4 backdrop-blur-sm">
        <div className="flex w-full items-center gap-2 rounded-2xl border border-border/50 bg-background/40 px-2 py-2 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitQuestion();
            }}
            placeholder={
              canAsk ? `Ask about this ${targetType}…` : "Wait for processing…"
            }
            disabled={!canAsk || asking || checking || !network.online || isGenerating}
            className="border-none bg-transparent px-4 shadow-none focus-visible:ring-0 "
            aria-disabled={!canAsk || asking || checking || !network.online || isGenerating}
            aria-label="Chat input"
          />
          
          {isGenerating ? (
            <Button
                onClick={stopGenerating}
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20"
                aria-label="Stop generating"
            >
                <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
                onClick={() => void submitQuestion()}
                disabled={
                !canAsk ||
                asking ||
                checking ||
                !inputValue.trim() ||
                !network.online
                }
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-2xl bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 text-muted-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring "
                aria-label="Send message"
            >
                <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}