"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAsyncFn, useInterval, useSet, useToggle } from "react-use";
import { toast } from "sonner";

import type { Document, Folder } from "@/lib/api";
import {
  getJobStatus,
  listDocuments,
  uploadDocuments,
  listFolders,
  createFolder,
  deleteFolder,
  updateDocument,
  updateFolder,
  deleteDocument,
} from "@/lib/api";
import { normalizeStatus, friendlyStatus } from "@/lib/utils";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  FileUp,
  RefreshCcw,
  FileText,
  Loader2,
  Search,
  FolderPlus,
  Folder as FolderIcon,
  FolderUp,
  MoreVertical,
  Pencil,
  Trash2,
  CornerUpLeft,
  CheckSquare,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeStatus(status);
  if (s === "ingested" || s === "completed") return "secondary";
  if (s === "failed") return "destructive";
  if (s === "uploaded") return "outline";
  return "default";
}

export function DocumentPanel({
  selectedDocument,
  setSelectedDocument,
  selectedFolder,
  setSelectedFolder,
}: {
  readonly selectedDocument: Document | null;
  readonly setSelectedDocument: (d: Document | null) => void;
  readonly selectedFolder: Folder | null;
  readonly setSelectedFolder: (f: Folder | null) => void;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState("");
  const [ingestJobs, setIngestJobs] = useState<Map<string, { docId: string; eventId: string }>>(
    new Map(),
  );
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

  const [isSelectionMode, toggleSelectionMode] = useToggle(false);
  const [
    selectedIds,
    { add: addSelection, remove: removeSelection, reset: resetSelection, has: hasSelection },
  ] = useSet<string>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [{ loading: loadingData }, refresh] = useAsyncFn(async () => {
    const [d, f] = await Promise.all([listDocuments(), listFolders()]);
    setDocs(d);
    setFolders(f);

    if (selectedDocument) {
      const updated = d.find((doc) => doc.doc_id === selectedDocument.doc_id) ?? null;
      if (updated && updated.status !== selectedDocument.status) setSelectedDocument(updated);
    }
  }, [selectedDocument, setSelectedDocument]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    resetSelection();
  }, [selectedFolder?.id, isSelectionMode, resetSelection]);

  const selectedFolderId = selectedFolder?.id ?? null;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q) {
      return {
        folders: [],
        docs: docs.filter((d) => d.name.toLowerCase().includes(q)),
        isSearch: true,
      };
    }

    const relevantDocs = docs.filter((d) =>
      selectedFolderId ? d.folder_id === selectedFolderId : d.folder_id === null,
    );
    const relevantFolders = selectedFolderId ? [] : folders;

    return { folders: relevantFolders, docs: relevantDocs, isSearch: false };
  }, [docs, folders, query, selectedFolderId]);

  const toggleSelection = (id: string) => {
    if (hasSelection(id)) removeSelection(id);
    else addSelection(id);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    let failed = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        if (id.startsWith("f-")) await deleteFolder(Number.parseInt(id.substring(2)));
        else if (id.startsWith("d-")) await deleteDocument(id.substring(2));
      } catch {
        failed++;
      }
    }

    if (failed > 0) toast.error(`Failed to delete ${failed} items.`);
    else toast.success("Selected items deleted.");

    resetSelection();
    toggleSelectionMode(false);
    await refresh();
  };

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

      await refresh();

      if (failed) toast.error("Processing failed.");
      if (done) toast.success("Processing complete.");
    },
    [refresh],
  );

  useInterval(
    () => {
      ingestJobs.forEach((job) => void pollIngest(job.docId, job.eventId));
    },
    ingestJobs.size > 0 ? 2000 : null,
  );

  const [{ loading: uploading }, doUpload] = useAsyncFn(
    async (files: File[], folderName?: string) => {
      if (selectedFolderId) {
        const currentDocs = docs.filter((d) => d.folder_id === selectedFolderId);
        if (currentDocs.length + files.length > 10) {
          toast.error("Folder limit reached (max 10 files).");
          return;
        }
      }

      try {
        const results = await uploadDocuments(files, selectedFolderId ?? undefined, folderName);
        const createdCount = results.filter((r) => r.created_new).length;

        toast.success(
          createdCount > 0
            ? `Uploaded ${files.length} file(s). Processing started…`
            : "Files uploaded (duplicates handling may vary).",
        );

        await refresh();

        results.forEach((res) => {
          if (res.created_new && res.ingest_event_id && res.ingest_event_id !== "already_exists") {
            setIngestJobs((prev) =>
              new Map(prev).set(res.doc_id, { docId: res.doc_id, eventId: res.ingest_event_id }),
            );
          }
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [refresh, docs, selectedFolderId],
  );

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (validFiles.length === 0) {
      toast.error("No PDF files found in the selected folder.");
      return;
    }

    if (validFiles.length !== files.length) {
      toast.info(`Found ${validFiles.length} PDFs (skipping ${files.length - validFiles.length} non-PDF files).`);
    }

    let folderName: string | undefined;
    if (validFiles[0]?.webkitRelativePath) folderName = validFiles[0].webkitRelativePath.split("/")[0];

    void doUpload(validFiles, folderName);
    e.target.value = "";
  };

  const onDropFiles = (files: File[]) => {
    if (files.length === 0) return;
    const validFiles = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (validFiles.length !== files.length) toast.error("Some files were skipped (only PDFs supported)");
    if (validFiles.length > 0) void doUpload(validFiles);
  };

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.types).some((t) => t === "Files");
      if (hasFiles) setIsDraggingFile(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDraggingFile(false);
      dragCounter.current = 0;
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) onDropFiles(files);
  };

  const handleDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData("docId", docId);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName("");
      setIsCreateFolderOpen(false);
      await refresh();
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm("Delete folder and all its documents? This cannot be undone.")) return;
    try {
      await deleteFolder(id);
      await refresh();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleMoveDoc = async (docId: string, targetFolderId: number | null) => {
    try {
      await updateDocument(docId, { folder_id: targetFolderId });
      await refresh();
      toast.success("Document moved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
    }
  };

  const handleRenameDoc = async () => {
    if (!editingDoc || !renameValue.trim()) return;
    if (!renameValue.endsWith(".pdf")) {
      toast.error("Filename must end with .pdf");
      return;
    }
    try {
      await updateDocument(editingDoc.doc_id, { name: renameValue });
      setEditingDoc(null);
      await refresh();
      toast.success("Document renamed");
    } catch {
      toast.error("Failed to rename");
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !renameValue.trim()) return;
    try {
      await updateFolder(editingFolder.id, renameValue);
      setEditingFolder(null);
      await refresh();
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename folder");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData("docId");
    if (docId) void handleMoveDoc(docId, folderId);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData("docId");
    if (docId) void handleMoveDoc(docId, null);
  };

  const busy = uploading || loadingData || pollingIngest;

  return (
    <Sidebar
      className="glass-panel border-r border-border/50"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="animate-pulse text-lg font-semibold text-primary">
            Drop PDF here to upload to {selectedFolderId ? "folder" : "root"}
          </div>
        </div>
      )}

      <SidebarHeader className="border-b border-border/50 px-4 py-4 space-y-4 bg-card/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 p-1.5 ring-1 ring-border/50 transition-all group-hover:ring-primary/30">
              <Image
                src="/logo.png"
                alt="DocuAgent Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
          </Link>

          <div
            className="neo-glass flex gap-1 rounded-full p-1"
            role="toolbar"
            aria-label="Document actions"
          >
            {!selectedFolder && !isSelectionMode && (
              <Dialog
                open={isCreateFolderOpen}
                onOpenChange={setIsCreateFolderOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={busy}
                    aria-label="Create new folder"
                    title="Create new folder"
                  >
                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Folder Name</Label>
                      <Input
                        id="name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateFolder}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isSelectionMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    toggleSelectionMode(false);
                    resetSelection();
                  }}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  title="Cancel Selection"
                  aria-label="Cancel selection mode"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || busy}
                  className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                  title={`Delete ${selectedIds.size} selected items`}
                  aria-label={`Delete ${selectedIds.size} selected items`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSelectionMode(true)}
                disabled={
                  busy ||
                  (filteredItems.docs.length === 0 &&
                    filteredItems.folders.length === 0)
                }
                className="h-8 w-8 rounded-full"
                title="Select Multiple Files or Folders"
                aria-label="Enter selection mode"
              >
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {!isSelectionMode && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void refresh()}
                  disabled={busy}
                  className="h-8 w-8 rounded-full"
                  aria-label="Refresh documents list"
                  title="Refresh list"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-gradient md:flex md:items-center md:px-12 px-0"
                      disabled={busy}
                      aria-label="Upload options"
                      title="Upload options"
                    >
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:flex">Upload</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuItem
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                      Upload Files
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <FolderUp className="mr-2 h-4 w-4" aria-hidden="true" />
                      Upload Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {selectedFolder && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFolder(null)}
                onDragOver={handleDragOver}
                onDrop={handleDropOnRoot}
                className="h-8 w-8 rounded-full"
                title="Back to Root (Drop here to move to Root)"
                aria-label="Go back to root folder"
              >
                <CornerUpLeft className="h-4 w-4" />
              </Button>

              {selectedDocument && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDocument(null)}
                  className="h-8 w-8 rounded-full text-primary"
                  title="Select Folder (Chat with entire folder)"
                  aria-label="Deselect document to chat with folder"
                >
                  <FolderIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <SidebarInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              disabled={busy}
              className="pl-8"
              aria-label="Search documents and folders"
            />
          </div>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            const validFiles = files.filter(
              (f) =>
                f.type === "application/pdf" ||
                f.name.toLowerCase().endsWith(".pdf"),
            );

            if (validFiles.length !== files.length)
              toast.error("Only PDF uploads are supported.");
            if (validFiles.length > 0) void doUpload(validFiles);

            e.currentTarget.value = "";
          }}
          aria-hidden="true"
          tabIndex={-1}
        />

        <Input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error - webkitdirectory is not in standard React types
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFolderSelect}
          aria-hidden="true"
          tabIndex={-1}
        />
      </SidebarHeader>

      <SidebarContent className="bg-transparent">
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="mb-2 px-2">
            Documents & Folders
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-0">
              {filteredItems.folders.map((f) => (
                <SidebarMenuItem key={`folder-${f.id}`}>
                  <SidebarMenuButton
                    isActive={selectedFolder?.id === f.id}
                    onClick={() => {
                      if (isSelectionMode) toggleSelection(`f-${f.id}`);
                      else setSelectedFolder(f);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnFolder(e, f.id)}
                    className={`h-auto py-2 ${hasSelection(`f-${f.id}`) ? "bg-muted" : ""}`}
                    title={f.name}
                  >
                    {isSelectionMode && (
                      <Checkbox
                        checked={hasSelection(`f-${f.id}`)}
                        onCheckedChange={() => toggleSelection(`f-${f.id}`)}
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select folder ${f.name}`}
                      />
                    )}
                    <FolderIcon
                      className="h-4 w-4 text-chart-3 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{f.name}</span>
                  </SidebarMenuButton>

                  {!isSelectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          className="top-1/2! -translate-y-1/2! right-2!"
                          aria-label={`Options for folder ${f.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="glass-card p-1"
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameValue(f.name);
                            setEditingFolder(f);
                          }}
                          className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                        >
                          <Pencil className="mr-2 h-3 w-3 text-purple-500 dark:text-purple-400" />
                          Rename
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteFolder(f.id);
                          }}
                          className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                        >
                          <Trash2 className="mr-2 h-3 w-3 text-destructive" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </SidebarMenuItem>
              ))}

              {filteredItems.docs.map((d) => {
                const selected = selectedDocument?.doc_id === d.doc_id;
                const isSelectedInMode = hasSelection(`d-${d.doc_id}`);
                const ingesting = ingestJobs.has(d.doc_id);

                return (
                  <SidebarMenuItem key={d.doc_id}>
                    <SidebarMenuButton
                      isActive={selected && !isSelectionMode}
                      onClick={() => {
                        if (isSelectionMode) toggleSelection(`d-${d.doc_id}`);
                        else setSelectedDocument(d);
                      }}
                      className={`h-auto py-2 ${isSelectedInMode ? "bg-muted" : ""}`}
                      draggable={!isSelectionMode}
                      onDragStart={(e) => handleDragStart(e, d.doc_id)}
                      title={d.name}
                    >
                      {isSelectionMode && (
                        <Checkbox
                          checked={isSelectedInMode}
                          onCheckedChange={() =>
                            toggleSelection(`d-${d.doc_id}`)
                          }
                          className="mr-2"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select document ${d.name}`}
                        />
                      )}

                      <FileText
                        className="h-4 w-4 text-chart-5 shrink-0"
                        aria-hidden="true"
                      />

                      <div className="flex min-w-0 flex-1 items-center gap-1 py-1.5">
                        <span className="truncate text-sm font-medium leading-none">
                          {d.name}
                        </span>

                        <div className="relative -top-1.5 left-0.5 flex shrink-0 items-center gap-1">
                          <Badge
                            variant={statusTone(d.status)}
                            className="h-3.5 px-1 text-[9px] uppercase"
                          >
                            {friendlyStatus(d.status)}
                          </Badge>
                          {ingesting && (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-label="Processing"
                            />
                          )}
                        </div>
                      </div>
                    </SidebarMenuButton>

                    {!isSelectionMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction
                            className="top-1/2! -translate-y-1/2! right-2!"
                            aria-label={`Options for document ${d.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="glass-card p-1"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameValue(d.name);
                              setEditingDoc(d);
                            }}
                            className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                          >
                            <Pencil className="mr-2 h-3 w-3 text-purple-500 dark:text-purple-400" />
                            Rename
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete document?")) {
                                void deleteDocument(d.doc_id)
                                  .then(() => {
                                    toast.success("Document deleted");
                                    void refresh();
                                  })
                                  .catch(() => toast.error("Failed to delete"));
                              }
                            }}
                            className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                          >
                            <Trash2 className="mr-2 h-3 w-3 text-destructive" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4 bg-card/10 backdrop-blur-sm">
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            {docs.length} DOCS • {folders.length} FOLDERS
          </span>
          {busy && (
            <div className="flex items-center gap-1 text-primary">
              <Loader2 className="h-2 w-2 animate-spin" /> SYNCING
            </div>
          )}
        </div>
      </SidebarFooter>

      <Dialog
        open={!!editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
      >
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename">Filename</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRenameDoc}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
      >
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-folder">Folder Name</Label>
            <Input
              id="rename-folder"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRenameFolder}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}