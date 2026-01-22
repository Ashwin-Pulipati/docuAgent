"use client";

import type { Document, Folder } from "@/lib/api";
import { getJobStatus, postQuery } from "@/lib/api";
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

  checking: boolean;
  asking: boolean;
  online: boolean;
}>;

export function useAgenticChat({
  selectedDocument,
  selectedFolder,
}: Args): Return {
  const online = true;

  const targetName = selectedDocument
    ? selectedDocument.name
    : selectedFolder
      ? selectedFolder.name
      : null;

  const targetType = selectedDocument ? "document" : "folder";

  const canAsk = React.useMemo(() => {
    if (!online) return false;
    if (selectedDocument) {
      const s = normalizeStatus(selectedDocument.status);
      return s === "ingested" || s === "completed";
    }
    return Boolean(selectedFolder);
  }, [selectedDocument, selectedFolder, online]);

  const contextKey = React.useMemo(() => {
    const id = selectedDocument?.doc_id ?? selectedFolder?.id ?? "none";
    return `docuagent:draft:${targetType}:${id}`;
  }, [selectedDocument?.doc_id, selectedFolder?.id, targetType]);

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
    if (!targetName) return;
    initialized.current = false;
    setMessages([]);
  }, [targetName, setMessages]);

  React.useEffect(() => {
    if (!targetName) return;
    if (initialized.current) return;

    pushMessage({
      id: `welcome-${Date.now()}`,
      sender: "agent",
      text: `Ready to answer questions about this ${targetType}: ${targetName}.`,
      status: "complete",
    });
    initialized.current = true;
  }, [targetName, targetType, pushMessage]);

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

      updateMessageAt(idx, {
        ...current,
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
    [messages, updateMessageAt],
  );

  useInterval(
    () => {
      polling.forEach((v, eventId) => {
        void checkJob(eventId, v.idx);
      });
    },
    polling.size > 0 ? 2000 : null,
  );

  const [{ loading: asking }, submit] = useAsyncFn(async () => {
    if (!selectedDocument && !selectedFolder) return;
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
        selectedFolder?.id ?? null,
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
    checking,
    asking,
    online,
  };
}
