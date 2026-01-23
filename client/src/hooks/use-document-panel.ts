"use client";

import * as React from "react";
import { useAsyncFn, useInterval, useSet, useToggle } from "react-use";
import { toast } from "sonner";

import type { Document, Folder, ChatThread } from "@/lib/api";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  getJobStatus,
  listDocuments,
  listFolders,
  updateDocument,
  updateFolder,
  uploadDocuments,
  listChats,
  createChat,
  updateChat,
  deleteChat,
} from "@/lib/api";

import type { FilteredItems, IngestJob, SelectionId } from "@/lib/types";
import { inferFolderName, onlyPdfFiles } from "../lib/utils";

type Args = Readonly<{
  selectedDocument: Document | null;
  setSelectedDocument: (d: Document | null) => void;
  selectedFolder: Folder | null;
  setSelectedFolder: (f: Folder | null) => void;
}>;

type Return = Readonly<{
  docs: Document[];
  folders: Folder[];
  chats: ChatThread[];
  query: string;
  setQuery: (v: string) => void;

  isSelectionMode: boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectedIds: Set<string>;
  toggleSelection: (id: SelectionId) => void;
  resetSelection: () => void;

  filtered: FilteredItems;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;

  isDraggingFile: boolean;
  dragHandlers: Readonly<{
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  }>;

  ingestJobs: Map<string, IngestJob>;

  busy: boolean;
  isRefreshing: boolean;
  loadingData: boolean;

  refresh: () => void;

  openCreateFolder: boolean;
  setOpenCreateFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  createNewFolder: () => void;

  editingDoc: Document | null;
  setEditingDoc: (d: Document | null) => void;
  editingFolder: Folder | null;
  setEditingFolder: (f: Folder | null) => void;
  editingChat: ChatThread | null;
  setEditingChat: (c: ChatThread | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  renameDoc: () => void;
  renameFolder: () => void;
  renameChat: () => void;

  deleteFolderById: (id: number) => void;
  deleteDocById: (docId: string) => void;
  bulkDelete: () => void;

  handleFolderSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  handleMoveDoc: (docId: string, targetFolderId: number | null) => void;
  handleDragStartDoc: (e: React.DragEvent, docId: string) => void;
  handleDropOnFolder: (e: React.DragEvent, folderId: number) => void;
  handleDropOnRoot: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;

  createChatThread: (docId?: number, parentId?: number, folderId?: number) => Promise<void>;
  deleteChatThread: (id: number) => Promise<void>;
}>;

export function useDocumentPanel({
  selectedDocument,
  setSelectedDocument,
  selectedFolder,
  _setSelectedFolder,
}: Args): Return {
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [chats, setChats] = React.useState<ChatThread[]>([]);
  const [query, setQuery] = React.useState("");

  const [ingestJobs, setIngestJobs] = React.useState<Map<string, IngestJob>>(
    new Map(),
  );

  const [openCreateFolder, setOpenCreateFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");

  const [editingDoc, setEditingDoc] = React.useState<Document | null>(null);
  const [editingFolder, setEditingFolder] = React.useState<Folder | null>(null);
  const [editingChat, setEditingChat] = React.useState<ChatThread | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const dragCounter = React.useRef(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  const [isSelectionMode, toggleSelectionMode] = useToggle(false);
  const [selectedIds, sel] = useSet<string>(new Set());
  const { add, remove, reset, has } = sel;

  const selectedFolderId = selectedFolder?.id ?? null;

  const refreshInProgress = React.useRef(false);
  const refreshPending = React.useRef(false);

  const performFetch = React.useCallback(async () => {
    const [d, f, c] = await Promise.all([
      listDocuments(),
      listFolders(),
      listChats(selectedFolderId ?? undefined),
    ]);
    setDocs(d);
    setFolders(f);
    setChats(c);

    if (selectedDocument) {
      const updated =
        d.find((doc) => doc.doc_id === selectedDocument.doc_id) ?? null;
      if (updated && updated.status !== selectedDocument.status)
        setSelectedDocument(updated);
    }
  }, [selectedDocument, setSelectedDocument, selectedFolderId]);

  const [{ loading: loadingData }, refreshFn] = useAsyncFn(async () => {
    if (refreshInProgress.current) {
      refreshPending.current = true;
      return;
    }

    refreshInProgress.current = true;
    try {
      await performFetch();
    } finally {
      refreshInProgress.current = false;
      if (refreshPending.current) {
        refreshPending.current = false;
        void refreshFn();
      }
    }
  }, [performFetch]);

  React.useEffect(() => {
    void refreshFn();
  }, [refreshFn]);

  React.useEffect(() => {
      setChats([]);
  }, [selectedFolderId]);

  React.useEffect(() => {
    reset();
  }, [selectedFolder?.id, isSelectionMode, reset]);

  const filtered = React.useMemo<FilteredItems>(() => {
    const q = query.trim().toLowerCase();

    if (q) {
      return {
        folders: [],
        docs: docs.filter((d) => d.name.toLowerCase().includes(q)),
        chats: chats.filter((c) => c.title.toLowerCase().includes(q)),
        isSearch: true,
      };
    }

    const relevantDocs = docs.filter((d) =>
      selectedFolderId
        ? d.folder_id === selectedFolderId
        : d.folder_id === null,
    );
    const relevantFolders = selectedFolderId ? [] : folders;
    
    
    return { folders: relevantFolders, docs: relevantDocs, chats: chats, isSearch: false };
  }, [docs, folders, chats, query, selectedFolderId]);

  const toggleSelection = React.useCallback(
    (id: SelectionId) => {
      if (has(id)) remove(id);
      else add(id);
    },
    [add, has, remove],
  );

  const enterSelectionMode = React.useCallback(
    () => toggleSelectionMode(true),
    [toggleSelectionMode],
  );
  const exitSelectionMode = React.useCallback(() => {
    toggleSelectionMode(false);
    reset();
  }, [reset, toggleSelectionMode]);

  const [{ loading: pollingIngest }, pollIngest] = useAsyncFn(
    async (docId: string, eventId: string) => {
      const st = await getJobStatus(eventId);
      const status = (st.status || "").toLowerCase();
      const done = status.includes("completed") || status.includes("success");
      const failed = status.includes("failed");

      if (!done && !failed) return;

      setIngestJobs((prev) => {
        const next = new Map(prev);
        next.delete(docId);
        return next;
      });

      await refreshFn();

      if (failed) toast.error("Processing failed.");
      if (done) toast.success("Processing complete.");
    },
    [refreshFn],
  );

  useInterval(
    () => {
      // 1. Poll specific known jobs from the current session
      ingestJobs.forEach((job) => void pollIngest(job.docId, job.eventId));

      // 2. Aggressive refresh: If we have ANY documents in "processing" or "queued" status, 
      // trigger a global refresh to update their status in the UI list.
      const hasProcessingDocs = docs.some(d => d.status === "processing" || d.status === "queued" || d.status === "failed");
      if (hasProcessingDocs) {
        void refreshFn();
      }
    },
    // Poll every 3 seconds if there is work to track
    (ingestJobs.size > 0 || docs.some(d => d.status === "processing" || d.status === "queued")) ? 3000 : null,
  );

  const [{ loading: uploading }, doUpload] = useAsyncFn(
    async (files: File[], folderName?: string) => {
      if (selectedFolderId) {
        const currentDocs = docs.filter(
          (d) => d.folder_id === selectedFolderId,
        );
        if (currentDocs.length + files.length > 10) {
          toast.error("Folder limit reached (max 10 files).");
          return;
        }
      }

      const uploadPromise = uploadDocuments(
        files,
        selectedFolderId ?? undefined,
        folderName,
      );

      toast.promise(uploadPromise, {
        loading: `Uploading and processing ${files.length} file(s)...`,
        success: (results) => {
          const createdCount = results.filter((r) => r.created_new).length;
          return createdCount > 0
            ? "Files uploaded successfully! Processing started."
            : "Upload complete.";
        },
        error: (e) => (e instanceof Error ? e.message : "Upload failed"),
      });

      const results = await uploadPromise;
      await refreshFn();

      results.forEach((res) => {
        if (
          res.created_new &&
          res.ingest_event_id &&
          res.ingest_event_id !== "already_exists"
        ) {
          setIngestJobs((prev) =>
            new Map(prev).set(res.doc_id, {
              docId: res.doc_id,
              eventId: res.ingest_event_id,
            }),
          );
        }
      });
    },
    [docs, refreshFn, selectedFolderId],
  );

  const handleFolderSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const { valid, skipped } = onlyPdfFiles(files);

      if (valid.length === 0) {
        toast.error("No PDF files found in the selected folder.");
        e.target.value = "";
        return;
      }

      if (skipped > 0) {
        toast.info(
          `Found ${valid.length} PDFs (skipping ${skipped} non-PDF files).`,
        );
      }

      const folderName = inferFolderName(files);
      void doUpload(valid, folderName);
      e.target.value = "";
    },
    [doUpload],
  );

  const handleFilesSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const { valid, skipped } = onlyPdfFiles(files);
      if (skipped > 0) toast.error("Only PDF uploads are supported.");
      if (valid.length > 0) void doUpload(valid);

      e.currentTarget.value = "";
    },
    [doUpload],
  );

  const onDropFiles = React.useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const { valid, skipped } = onlyPdfFiles(files);
      if (skipped > 0)
        toast.error("Some files were skipped (only PDFs supported)");
      if (valid.length > 0) void doUpload(valid);
    },
    [doUpload],
  );

  const dragHandlers = React.useMemo(
    () => ({
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          const hasFiles = Array.from(e.dataTransfer.types).some(
            (t) => t === "Files",
          );
          if (hasFiles) setIsDraggingFile(true);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          setIsDraggingFile(false);
          dragCounter.current = 0;
        }
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        dragCounter.current = 0;
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) onDropFiles(files);
      },
    }),
    [onDropFiles],
  );

  const handleCreateFolder = React.useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName("");
      setOpenCreateFolder(false);
      await refreshFn();
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  }, [newFolderName, refreshFn]);

  const deleteFolderById = React.useCallback(
    async (id: number) => {
      if (
        !confirm("Delete folder and all its documents? This cannot be undone.")
      )
        return;
      try {
        await deleteFolder(id);
        await refreshFn();
        toast.success("Folder deleted");
      } catch {
        toast.error("Failed to delete folder");
      }
    },
    [refreshFn],
  );

  const deleteDocById = React.useCallback(
    async (docId: string) => {
      if (!confirm("Delete document?")) return;
      try {
        await deleteDocument(docId);
        toast.success("Document deleted");
        await refreshFn();
      } catch {
        toast.error("Failed to delete");
      }
    },
    [refreshFn],
  );

  const bulkDelete = React.useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    let failed = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        if (id.startsWith("f-"))
          await deleteFolder(Number.parseInt(id.substring(2)));
        else if (id.startsWith("d-")) await deleteDocument(id.substring(2));
        else if (id.startsWith("c-")) await deleteChat(Number.parseInt(id.substring(2)));
      } catch {
        failed++;
      }
    }

    if (failed > 0) toast.error(`Failed to delete ${failed} items.`);
    else toast.success("Selected items deleted.");

    reset();
    toggleSelectionMode(false);
    await refreshFn();
  }, [reset, selectedIds, toggleSelectionMode, refreshFn]);

  const handleMoveDoc = React.useCallback(
    async (docId: string, targetFolderId: number | null) => {
      try {
        await updateDocument(docId, { folder_id: targetFolderId });
        await refreshFn();
        toast.success("Document moved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Move failed");
      }
    },
    [refreshFn],
  );

  const handleDragStartDoc = React.useCallback(
    (e: React.DragEvent, docId: string) => {
      e.dataTransfer.setData("docId", docId);
    },
    [],
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDropOnFolder = React.useCallback(
    (e: React.DragEvent, folderId: number) => {
      e.preventDefault();
      const docId = e.dataTransfer.getData("docId");
      if (docId) void handleMoveDoc(docId, folderId);
    },
    [handleMoveDoc],
  );

  const handleDropOnRoot = React.useCallback(
    (e: React.DragEvent) => { 
      e.preventDefault();
      const droppedDocId = e.dataTransfer.getData("docId");
      if (droppedDocId) void handleMoveDoc(droppedDocId, null);
    },
    [handleMoveDoc],
  );

  const renameDoc = React.useCallback(async () => {
    if (!editingDoc || !renameValue.trim()) return;
    if (!renameValue.endsWith(".pdf")) {
      toast.error("Filename must end with .pdf");
      return;
    }
    try {
      await updateDocument(editingDoc.doc_id, { name: renameValue });
      setEditingDoc(null);
      await refreshFn();
      toast.success("Document renamed");
    } catch {
      toast.error("Failed to rename");
    }
  }, [editingDoc, renameValue, refreshFn]);

  const renameFolder = React.useCallback(async () => {
    if (!editingFolder || !renameValue.trim()) return;
    try {
      await updateFolder(editingFolder.id, renameValue);
      setEditingFolder(null);
      await refreshFn();
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename folder");
    }
  }, [editingFolder, renameValue, refreshFn]);

  
  const createChatThread = React.useCallback(async (docId?: number, parentId?: number, folderId?: number) => {
      try {
          const finalFolderId = folderId ?? (docId 
            ? docs.find(d => d.id === docId)?.folder_id ?? undefined 
            : selectedFolderId ?? undefined
          );
          
          await createChat("New Chat", finalFolderId, docId, parentId);
          await refreshFn();
          toast.success("New chat created");
      } catch {
          toast.error("Failed to create chat");
      }
  }, [selectedFolderId, docs, refreshFn]);

  const renameChat = React.useCallback(async () => {
      if (!editingChat || !renameValue.trim()) return;
      try {
          await updateChat(editingChat.id, renameValue);
          setEditingChat(null);
          await refreshFn();
          toast.success("Chat renamed");
      } catch {
          toast.error("Failed to rename chat");
      }
  }, [editingChat, renameValue, refreshFn]);

  const deleteChatThread = React.useCallback(async (id: number) => {
      if (!confirm("Delete this chat?")) return;
      try {
          await deleteChat(id);
          await refreshFn();
          toast.success("Chat deleted");
      } catch {
          toast.error("Failed to delete chat");
      }
  }, [refreshFn]);

  const busy = uploading;
  const isRefreshing = loadingData || pollingIngest;

  return {
    docs,
    folders,
    chats,
    query,
    setQuery,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedIds,
    toggleSelection: toggleSelection as (id: SelectionId) => void,
    resetSelection: reset,
    filtered,
    fileInputRef,
    folderInputRef,
    isDraggingFile,
    dragHandlers,
    ingestJobs,
    busy,
    isRefreshing,
    loadingData,
    refresh: () => void refreshFn(),
    openCreateFolder,
    setOpenCreateFolder,
    newFolderName,
    setNewFolderName,
    createNewFolder: () => void handleCreateFolder(),
    editingDoc,
    setEditingDoc,
    editingFolder,
    setEditingFolder,
    editingChat,
    setEditingChat,
    renameValue,
    setRenameValue,
    renameDoc: () => void renameDoc(),
    renameFolder: () => void renameFolder(),
    renameChat: () => void renameChat(),
    deleteFolderById: (id) => void deleteFolderById(id),
    deleteDocById: (id) => void deleteDocById(id),
    bulkDelete: () => void bulkDelete(),
    handleFolderSelect,
    handleFilesSelect,
    handleMoveDoc: (docId, folderId) => void handleMoveDoc(docId, folderId),
    handleDragStartDoc,
    handleDropOnFolder,
    handleDropOnRoot, 
    handleDragOver,
    createChatThread,
    deleteChatThread,
  };
}
