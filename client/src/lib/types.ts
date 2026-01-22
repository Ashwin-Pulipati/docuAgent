import type { AgenticResult, Document, Folder } from "./api";

export type MessageStatus = "pending" | "complete" | "error";

export type Message = {
  id: string;
  sender: "user" | "agent";
  text: string;
  result?: AgenticResult;
  status: MessageStatus;
};

export type PollingEntry = { idx: number };

export type SelectionId = `f-${number}` | `d-${string}`;

export type IngestJob = {
  docId: string;
  eventId: string;
};

export type FilteredItems = {
  folders: Folder[];
  docs: Document[];
  isSearch: boolean;
};