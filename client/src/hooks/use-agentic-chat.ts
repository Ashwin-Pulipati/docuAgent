"use client";

import type { Document, Folder, ChatThread } from "@/lib/api";
import { getJobStatus, postQuery, getChat, addReaction } from "@/lib/api";
import * as React from "react";
import {
  useAsyncFn,
  useCopyToClipboard,
  useInterval,
  useKeyPressEvent,
  useList,
  useLocalStorage,
} from "react-use";
import { toast } from "sonner";
import {
  isDoneStatus,
  isFailedStatus,
  parseAgenticOutput,
  normalizeStatus,
} from "@/lib/utils";
import type { Message, PollingEntry } from "../lib/types";

type Args = Readonly<{
  selectedDocument: Document | null;
  selectedFolder: Folder | null;
  selectedChat: ChatThread | null;
}>;

type Return = Readonly<{
  messages: Message[];
  pushMessage: (m: Message) => void;
  updateMessageAt: (idx: number, m: Message) => void;
  setMessages: (next: Message[]) => void;

  inputValue: string;
  setInputValue: (v: string) => void;

  canAsk: boolean;
  isGenerating: boolean;

  copiedId: string | null;
  copiedValue: string | undefined;
  copyMessage: (id: string, text: string) => void;

  submit: () => void;
  stop: () => void;
  edit: (msgId: string, text: string) => void;
  onReaction: (msgId: string, emoji: string) => void;

  checking: boolean;
  asking: boolean;
  online: boolean;
}>;

export function useAgenticChat({
  selectedDocument,
  selectedFolder,
  selectedChat,
}: Args): Return {
  const online = true;

  const targetName = selectedDocument
    ? selectedDocument.name
    : selectedFolder
      ? selectedFolder.name
      : selectedChat
        ? selectedChat.title
        : null;

  const targetType = selectedDocument ? "document" : selectedFolder ? "folder" : "chat";

  const canAsk = React.useMemo(() => {
    if (!online) return false;
    if (selectedDocument) {
      const s = normalizeStatus(selectedDocument.status);
      return s === "ingested" || s === "completed";
    }
    if (selectedFolder) return true;
    return Boolean(selectedChat);
  }, [selectedDocument, selectedFolder, selectedChat, online]);

  const contextKey = React.useMemo(() => {
    const id = selectedDocument?.doc_id ?? selectedFolder?.id ?? selectedChat?.id ?? "none";
    return `docuagent:draft:${targetType}:${id}`;
  }, [selectedDocument?.doc_id, selectedFolder?.id, selectedChat?.id, targetType]);

  const [draft, setDraft, removeDraft] = useLocalStorage<string>(
    contextKey,
    "",
  );
  const [inputValue, setInputValue] = React.useState<string>(draft ?? "");

  React.useEffect(() => {
    setInputValue(draft ?? "");
  }, [draft]);

  React.useEffect(() => {
    setDraft(inputValue);
  }, [inputValue, setDraft]);

  const [messages, list] = useList<Message>([]);
  const {
    push: pushMessage,
    updateAt: updateMessageAt,
    set: setMessages,
  } = list;

  const initialized = React.useRef(false);
  
  React.useEffect(() => {
      if (selectedChat) {
          getChat(selectedChat.id).then(chat => {
              const history: Message[] = chat.messages.map(m => ({
                  id: m.id.toString(),
                  sender: m.role as "user" | "agent",
                  text: m.content,
                  result: m.citations ? { 
                      citations: m.citations, 
                      answer: m.content, 
                      intent: "qa", 
                      needs_clarification: false,
                      sources: [],
                      num_contexts: 0
                  } : undefined,
                  status: "complete",
                  reactions: m.reactions ?? undefined
              }));
              setMessages(history);
              initialized.current = true;
          }).catch(() => {
              toast.error("Failed to load chat history");
          });
      } 
  }, [selectedChat, setMessages]);

  React.useEffect(() => {
    if (!targetName) return;
    
    if (selectedChat) return; 

    initialized.current = false;
    setMessages([]);
  }, [targetName, setMessages, selectedChat]);

  React.useEffect(() => {
    if (!targetName) return;
    if (initialized.current) return;
    if (selectedChat) return;
    pushMessage({
      id: `welcome-${Date.now()}`,
      sender: "agent",
      text: `Ready to answer questions about this ${targetType}: ${targetName}.`,
      status: "complete",
    });
    initialized.current = true;
  }, [targetName, targetType, pushMessage, selectedChat]);

  const [{ value: copiedValue }, copyToClipboard] = useCopyToClipboard();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyMessage = React.useCallback(
    (id: string, text: string) => {
      copyToClipboard(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    },
    [copyToClipboard],
  );

  const [polling, setPolling] = React.useState<Map<string, PollingEntry>>(
    new Map(),
  );
  const isGenerating = polling.size > 0;

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

      const current = messages[idx];
      if (!current) return;

      const messageId = parsed?.message_id ? parsed.message_id.toString() : eventId;

      updateMessageAt(idx, {
        ...current,
        id: messageId,
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
    [messages, updateMessageAt],
  );

  useInterval(
    () => {
      polling.forEach((v, eventId) => {
        void checkJob(eventId, v.idx);
      });
      
      const hasPendingMessages = messages.some(m => m.status === "pending");
      if (hasPendingMessages && selectedChat) {
          getChat(selectedChat.id).then(chat => {
              const history: Message[] = chat.messages.map(m => ({
                  id: m.id.toString(),
                  sender: m.role as "user" | "agent",
                  text: m.content,
                  result: m.citations ? { 
                      citations: m.citations, 
                      answer: m.content, 
                      intent: "qa", 
                      needs_clarification: false,
                      sources: [],
                      num_contexts: 0
                  } : undefined,
                  status: (m.content === "Analysing" || !m.content) ? "pending" : "complete",
                  reactions: m.reactions ?? undefined
              }));
               
              const hasChanged = history.some((m, i) => m.text !== messages[i]?.text || m.status !== messages[i]?.status || JSON.stringify(m.reactions) !== JSON.stringify(messages[i]?.reactions));
              if (hasChanged) {
                  setMessages(history);
              }
          }).catch(() => {});
      }
    },
    (polling.size > 0 || messages.some(m => m.status === "pending")) ? 750 : null,
  );

  const [{ loading: asking }, submit] = useAsyncFn(async () => {
    if (!selectedDocument && !selectedFolder && !selectedChat) return;
    if (!inputValue.trim()) return;

    if (!online) {
      toast.error("You are offline.");
      return;
    }

    const userText = inputValue.trim();

    pushMessage({
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      status: "complete",
    });

    const agentIdx = messages.length + 1;

    pushMessage({
      id: `agent-${Date.now()}`,
      sender: "agent",
      text: "Analysing",
      status: "pending",
    });

    setInputValue("");
    removeDraft();

    try {
      const res = await postQuery(
        userText,
        selectedDocument?.doc_id ?? null,
        6,
        selectedFolder?.id ?? selectedChat?.folder_id ?? null,
        selectedChat?.id ?? null 
      );

      const pending = messages[agentIdx];
      updateMessageAt(agentIdx, {
        ...(pending ?? {
          id: res.query_event_id,
          sender: "agent",
          text: "Analysing",
          status: "pending",
        }),
        id: res.query_event_id,
      });

      setPolling((prev) =>
        new Map(prev).set(res.query_event_id, { idx: agentIdx }),
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to submit your question.";
      toast.error(msg);

      const pending = messages[agentIdx];
      updateMessageAt(agentIdx, {
        ...(pending ?? {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: "",
          status: "error",
        }),
        text: "Sorry, I could not submit your question.",
        status: "error",
      });
    }
  }, [
    inputValue,
    selectedDocument,
    selectedFolder,
    selectedChat,
    online,
    pushMessage,
    messages,
    updateMessageAt,
    removeDraft,
    setInputValue,
  ]);

  const stop = React.useCallback(() => {
    setPolling((prev) => {
      const next = new Map(prev);
      next.forEach(({ idx }) => {
        const current = messages[idx];
        if (!current) return;
        updateMessageAt(idx, {
          ...current,
          status: "error",
          text: "Stopped by user.",
        });
      });
      return new Map();
    });
  }, [messages, updateMessageAt]);

  const edit = React.useCallback(
    (msgId: string, text: string) => {
      const idx = messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;

      if (polling.size > 0) stop();

      setInputValue(text);
      setMessages(messages.slice(0, idx));
    },
    [messages, polling.size, setMessages, setInputValue, stop],
  );

  const handleReaction = React.useCallback(async (msgId: string, emoji: string) => {
      if (isNaN(Number(msgId))) return; 
      
      try {
          const updatedMsg = await addReaction(Number(msgId), emoji);
          const idx = messages.findIndex(m => m.id === msgId);
          if (idx !== -1) {
              updateMessageAt(idx, {
                  ...messages[idx],
                  reactions: updatedMsg.reactions ?? undefined
              });
          }
      } catch {
          toast.error("Failed to add reaction");
      }
  }, [messages, updateMessageAt]);

  useKeyPressEvent("Escape", () => {
    if (isGenerating) stop();
  });

  useKeyPressEvent(
    (e) =>
      (e.key === "Enter" && (e.ctrlKey || e.metaKey)) as unknown as boolean,
    () => {
      if (!isGenerating && canAsk) void submit();
    },
  );

  return {
    messages,
    pushMessage,
    updateMessageAt,
    setMessages,
    inputValue,
    setInputValue,
    canAsk,
    isGenerating,
    copiedId,
    copiedValue,
    copyMessage,
    submit: () => void submit(),
    stop,
    edit,
    onReaction: handleReaction,
    checking,
    asking,
    online,
  };
}