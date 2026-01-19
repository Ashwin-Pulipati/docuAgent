"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAsyncFn, useInterval, useList } from "react-use";
import { toast } from "sonner";
import type { AgenticResult, Document, JobStatusResponse } from "@/lib/api";
import { getJobStatus, postQuery, AgenticResultSchema } from "@/lib/api";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, FileText } from "lucide-react";

type MessageStatus = "pending" | "complete" | "error";

type Message = {
  id: string;
  sender: "user" | "agent";
  text: string;
  result?: AgenticResult;
  status: MessageStatus;
};

type PollingEntry = { idx: number };

function normalizeStatus(s: string): string {
  return (s || "").toLowerCase();
}

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

export function ChatPanel({ selectedDocument }: { selectedDocument: Document | null }) {
  const [messages, { push, updateAt, set: setMessages }] = useList<Message>([]);
  const [inputValue, setInputValue] = useState("");
  const [polling, setPolling] = useState<Map<string, PollingEntry>>(new Map());

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setInputValue("");
    setPolling(new Map());

    if (selectedDocument) {
      push({
        id: `welcome-${Date.now()}`,
        sender: "agent",
        text: `Ready to answer questions about ${selectedDocument.name}.`,
        status: "complete",
      });
    }
  }, [selectedDocument, push, setMessages]);

  const canAsk = useMemo(() => {
    if (!selectedDocument) return false;
    const s = normalizeStatus(selectedDocument.status);
    return s === "ingested" || s === "completed";
  }, [selectedDocument]);

  const [{ loading: checking }, checkJob] = useAsyncFn(
    async (eventId: string, idx: number) => {
      const r = await getJobStatus(eventId);
      const done = isDoneStatus(r.status);
      const failed = isFailedStatus(r.status);

      if (!done && !failed) return;

      const parsed = parseAgenticOutput(r.output);

      const text =
        failed
          ? "Sorry — the job failed."
          : parsed?.needs_clarification
          ? parsed.clarifying_question ?? "I need one clarification."
          : parsed?.answer ?? "No answer returned.";

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
    if (!selectedDocument) return;
    if (!inputValue.trim()) return;

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
      text: "Thinking…",
      status: "pending",
    };
    push(agentMsg);

    setInputValue("");

    try {
      const res = await postQuery(userText, selectedDocument.doc_id, 6);
      updateAt(agentIdx, { ...agentMsg, id: res.query_event_id });
      setPolling((prev) => new Map(prev).set(res.query_event_id, { idx: agentIdx }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit your question.";
      toast.error(msg);
      updateAt(agentIdx, { ...agentMsg, text: "Sorry, I could not submit your question.", status: "error" });
    }
  }, [inputValue, selectedDocument, messages, push, updateAt]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!selectedDocument) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Select a document</h2>
        <p className="text-muted-foreground">Choose a document on the left to start chatting.</p>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="truncate">Chat: {selectedDocument.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">{selectedDocument.status}</span>
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-6">
            {messages.map((msg, i) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id ?? i} className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
                  {!isUser && (
                    <Avatar aria-label="Agent">
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                    aria-live={msg.status === "pending" ? "polite" : "off"}
                  >
                    {msg.text}
                    {msg.status === "pending" && (
                      <div className="mt-1 text-xs text-muted-foreground">Working…</div>
                    )}
                  </div>

                  {isUser && (
                    <Avatar aria-label="You">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitQuestion();
            }}
            placeholder={canAsk ? "Ask a question…" : "Wait for ingestion to complete…"}
            disabled={!canAsk || asking || checking}
            aria-disabled={!canAsk || asking || checking}
          />
          <Button
            onClick={() => void submitQuestion()}
            disabled={!canAsk || asking || checking || !inputValue.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
