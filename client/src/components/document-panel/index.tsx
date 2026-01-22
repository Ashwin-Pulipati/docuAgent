"use client";

import { Input } from "@/components/ui/input";
import type { Document, Folder } from "@/lib/api";

import { useDocumentPanel } from "../../hooks/use-document-panel";
import { ItemsList } from "./items-list";
import { PanelFooter } from "./panel-footer";
import { PanelHeader } from "./panel-header";
import { PanelShell } from "./panel-shell";
import { RenameDocumentDialog, RenameFolderDialog } from "./rename-dialogs";

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
  const {
    docs,
    folders,
    query,
    setQuery,

    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedIds,
    toggleSelection,

    filtered,

    fileInputRef,
    folderInputRef,

    isDraggingFile,
    dragHandlers,

    ingestJobs,

    busy,
    refresh,

    openCreateFolder,
    setOpenCreateFolder,
    newFolderName,
    setNewFolderName,
    createNewFolder,

    editingDoc,
    setEditingDoc,
    editingFolder,
    setEditingFolder,
    renameValue,
    setRenameValue,
    renameDoc,
    renameFolder,

    deleteFolderById,
    deleteDocById,
    bulkDelete,

    handleFolderSelect,
    handleFilesSelect,

    handleDragStartDoc,
    handleDropOnFolder,
    handleDragOver,
  } = useDocumentPanel({
    selectedDocument,
    setSelectedDocument,
    selectedFolder,
    setSelectedFolder,
  });

  return (
    <PanelShell
      isDraggingFile={isDraggingFile}
      selectedFolderId={selectedFolder?.id ?? null}
      dragHandlers={dragHandlers}
    >
      <PanelHeader
        selectedFolder={selectedFolder}
        selectedDocument={selectedDocument}
        busy={busy}
        isSelectionMode={isSelectionMode}
        canEnterSelectionMode={
          filtered.docs.length > 0 || filtered.folders.length > 0
        }
        selectedCount={selectedIds.size}
        onBackRoot={() => setSelectedFolder(null)}
        onSelectFolderContext={() => setSelectedDocument(null)}
        onEnterSelectionMode={enterSelectionMode}
        onExitSelectionMode={exitSelectionMode}
        onBulkDelete={bulkDelete}
        onRefresh={refresh}
        openCreateFolder={openCreateFolder}
        setOpenCreateFolder={setOpenCreateFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        onCreateFolder={createNewFolder}
        query={query}
        setQuery={setQuery}
        onUploadFiles={() => fileInputRef.current?.click()}
        onUploadFolder={() => folderInputRef.current?.click()}
        fileInput={
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFilesSelect}
            aria-hidden="true"
            tabIndex={-1}
          />
        }
        folderInput={
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
        }
      />

      <ItemsList
        folders={filtered.folders}
        docs={filtered.docs}
        selectedFolder={selectedFolder}
        selectedDocument={selectedDocument}
        selectionMode={isSelectionMode}
        hasSelection={(id) => selectedIds.has(id)}
        toggleSelection={toggleSelection}
        ingestingMap={ingestJobs}
        onSelectFolder={setSelectedFolder}
        onSelectDoc={setSelectedDocument}
        onRenameFolder={(f) => {
          setRenameValue(f.name);
          setEditingFolder(f);
        }}
        onDeleteFolder={deleteFolderById}
        onRenameDoc={(d) => {
          setRenameValue(d.name);
          setEditingDoc(d);
        }}
        onDeleteDoc={deleteDocById}
        onDragOver={handleDragOver}
        onDropOnFolder={handleDropOnFolder}
        onDragStartDoc={handleDragStartDoc}
      />

      <PanelFooter
        docsCount={docs.length}
        foldersCount={folders.length}
        busy={busy}
      />

      <RenameDocumentDialog
        document={editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onSave={renameDoc}
      />

      <RenameFolderDialog
        folder={editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onSave={renameFolder}
      />
    </PanelShell>
  );
}
