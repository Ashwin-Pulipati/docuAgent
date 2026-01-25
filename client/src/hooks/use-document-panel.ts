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
  selectedChat: ChatThread | null;
  setSelectedChat: (c: ChatThread | null) => void;
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
  selectAll: () => void;
  deselectAll: () => void;

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

  createChatThread: (docId?: number, parentId?: number, folderId?: number) => Promise<ChatThread | undefined>;
  deleteChatThread: (id: number) => Promise<boolean>;
  folderBusySet: Set<number>;
  toggleChatStar: (chat: ChatThread) => Promise<void>;
}>;

export function useDocumentPanel({
  selectedDocument,
  setSelectedDocument,
  selectedFolder,
  setSelectedFolder: _setSelectedFolder,
  selectedChat,
  setSelectedChat,
}: Args): Return {
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [chats, setChats] = React.useState<ChatThread[]>([]);
  const [query, setQuery] = React.useState("");

  const [ingestJobs, setIngestJobs] = React.useState<Map<string, IngestJob>>(
    new Map(),
  );

  const optimisticDeletedDocIds = React.useRef(new Set<string>());
  const optimisticDeletedFolderIds = React.useRef(new Set<number>());

  const folderBusySet = React.useMemo(() => {
    const busyFolders = new Set<number>();
    docs.forEach((d) => {
      const status = (d.status || "").toLowerCase();
      const isBusy =
        ingestJobs.has(d.doc_id) ||
        ["uploaded", "queued", "processing", "ingesting"].includes(status);
      if (isBusy && d.folder_id) {
        busyFolders.add(d.folder_id);
      }
    });
    return busyFolders;
  }, [docs, ingestJobs]);

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

    // Filter out optimistically deleted items to prevent flicker
    const filteredDocs = d.filter(
      (doc) => !optimisticDeletedDocIds.current.has(doc.doc_id),
    );
    const filteredFolders = f.filter(
      (folder) => !optimisticDeletedFolderIds.current.has(folder.id),
    );

    setDocs(filteredDocs);
    setFolders(filteredFolders);
    setChats(c);

    if (selectedDocument) {
      const updated =
        filteredDocs.find((doc) => doc.doc_id === selectedDocument.doc_id) ??
        null;
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
      const isSelected = has(id);
      if (isSelected) {
        remove(id);
        // If it's a document, deselect its chats
        if (id.startsWith("d-")) {
            const docIdStr = id.substring(2);
            // find doc to get its numeric id
            const doc = docs.find(d => d.doc_id === docIdStr);
            if (doc && doc.id) {
                const docChats = chats.filter(c => c.document_id === doc.id);
                docChats.forEach(c => remove(`c-${c.id}`));
            }
        }
      } else {
        add(id);
        // If it's a document, select its chats
        if (id.startsWith("d-")) {
            const docIdStr = id.substring(2);
            const doc = docs.find(d => d.doc_id === docIdStr);
            if (doc && doc.id) {
                const docChats = chats.filter(c => c.document_id === doc.id);
                docChats.forEach(c => add(`c-${c.id}`));
            }
        }
      }
    },
    [add, has, remove, docs, chats],
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

  const ACTIVE_STATUSES = new Set([
    "uploaded",
    "queued",
    "processing",
    "ingesting",
    "failed",
  ]);
  const READY_STATUSES = new Set(["ingested", "completed"]);

  const hasActiveDocs = docs.some((d) =>
    ACTIVE_STATUSES.has((d.status || "").toLowerCase()),
  );

  useInterval(
    () => {
      ingestJobs.forEach((job) => void pollIngest(job.docId, job.eventId));
      if (hasActiveDocs) {
        void refreshFn();
      }
    },
    ingestJobs.size > 0 || hasActiveDocs ? 1000 : null,
  );

  React.useEffect(() => {
    setIngestJobs((prev) => {
      if (prev.size === 0) return prev;

      const next = new Map(prev);
      docs.forEach((d) => {
        const st = (d.status || "").toLowerCase();
        if (READY_STATUSES.has(st)) {
          next.delete(d.doc_id);
        }
      });

      return next;
    });
  }, [docs]);

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
      
      optimisticDeletedFolderIds.current.add(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      toast.success("Folder deleted");

      if (selectedFolder?.id === id) {
        _setSelectedFolder(null);
      }

      try {
        await deleteFolder(id);
      } catch (e) {
        try {
          const currentFolders = await listFolders();
          if (currentFolders.some((f) => f.id === id)) {
            optimisticDeletedFolderIds.current.delete(id); 
            toast.error("Failed to delete folder (restoring)");
            console.error(e);
            await refreshFn(); 
          } else {
            setFolders(currentFolders);
            await refreshFn();
          }
        } catch {
          await refreshFn();
        }
        return;
      }
      
      try {
        await refreshFn();
      } catch {
        
      }
    },
    [refreshFn, selectedFolder, _setSelectedFolder],
  );

  const deleteDocById = React.useCallback(
    async (docId: string) => {
      if (!confirm("Delete document?")) return;
      
      const docToDelete = docs.find(d => d.doc_id === docId);

      optimisticDeletedDocIds.current.add(docId);
      setDocs((prev) => prev.filter((d) => d.doc_id !== docId));
      toast.success("Document deleted");

      if (selectedDocument?.doc_id === docId) {
        setSelectedDocument(null);
      }
      
      if (selectedChat && docToDelete && selectedChat.document_id === docToDelete.id) {
          setSelectedChat(null);
      }

      try {
        await deleteDocument(docId);
      } catch (e) {
        try {
          const currentDocs = await listDocuments();
          if (currentDocs.some((d) => d.doc_id === docId)) {
            optimisticDeletedDocIds.current.delete(docId);
            toast.error("Failed to delete document (restoring)");
            console.error(e);
            await refreshFn();
          } else {
            setDocs(currentDocs);
            await refreshFn();
          }
        } catch {
          await refreshFn();
        }
        return;
      }
      
      try {
        await refreshFn();
      } catch {
        
      }
    },
    [refreshFn, selectedDocument, setSelectedDocument, selectedChat, setSelectedChat, docs],
  );

  const selectAll = React.useCallback(() => {
    filtered.folders.forEach((f) => add(`f-${f.id}`));
    filtered.docs.forEach((d) => {
        add(`d-${d.doc_id}`);
        // Also select its chats
        const docChats = chats.filter(c => c.document_id === d.id);
        docChats.forEach(c => add(`c-${c.id}`));
    });
    filtered.chats.forEach((c) => add(`c-${c.id}`));
  }, [filtered, add, chats]);

  const deselectAll = React.useCallback(() => {
    reset();
  }, [reset]);

  const bulkDelete = React.useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    const toastId = toast.loading(`Deleting ${selectedIds.size} item(s)... please wait.`);
    let failed = 0;
    const deletedDocIds = new Set<string>();
    const deletedFolderIds = new Set<number>();
    const deletedChatIds = new Set<number>();

    try {
      for (const id of Array.from(selectedIds)) {
        try {
          if (id.startsWith("f-")) {
            const fid = Number.parseInt(id.substring(2));
            await deleteFolder(fid);
            deletedFolderIds.add(fid);
          } else if (id.startsWith("d-")) {
              const did = id.substring(2);
              await deleteDocument(did);
              deletedDocIds.add(did);
          } else if (id.startsWith("c-")) {
              const cid = Number.parseInt(id.substring(2));
              await deleteChat(cid);
              deletedChatIds.add(cid);
          }
        } catch {
          failed++;
        }
      }
    } finally {
      toast.dismiss(toastId);
    }

    if (failed > 0) toast.error(`Failed to delete ${failed} items.`);
    else toast.success("Selected items deleted.");

    if (selectedDocument && deletedDocIds.has(selectedDocument.doc_id)) {
        setSelectedDocument(null);
    }
    if (selectedFolder && deletedFolderIds.has(selectedFolder.id)) {
        _setSelectedFolder(null);
    }
    if (selectedChat && deletedChatIds.has(selectedChat.id)) {
        setSelectedChat(null);
    }

    reset();
    toggleSelectionMode(false);
    await refreshFn();
  }, [reset, selectedIds, toggleSelectionMode, refreshFn, selectedDocument, setSelectedDocument, selectedFolder, _setSelectedFolder, selectedChat, setSelectedChat]);

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
          
          const newChat = await createChat("New Chat", finalFolderId, docId, parentId);
          await refreshFn();
          toast.success("New chat created");
          return newChat;
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
      if (!confirm("Delete this chat?")) return false;
      try {
          await deleteChat(id);
          await refreshFn();
          toast.success("Chat deleted");
          return true;
      } catch {
          toast.error("Failed to delete chat");
          return false;
      }
  }, [refreshFn]);

  const toggleChatStar = React.useCallback(async (chat: ChatThread) => {
      try {
          const updated = await updateChat(chat.id, undefined, !chat.is_starred);
          setChats(prev => prev.map(c => c.id === chat.id ? updated : c));
          toast.success(updated.is_starred ? "Chat starred" : "Chat unstarred");
      } catch {
          toast.error("Failed to update chat");
      }
  }, []);

  const busy = uploading;
  const isRefreshing = ingestJobs.size > 0 || hasActiveDocs;

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
    selectAll,
    deselectAll,
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
    folderBusySet,
    toggleChatStar,
  };
}
