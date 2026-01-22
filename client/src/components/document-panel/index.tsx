import React, { forwardRef, useImperativeHandle } from "react";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { Input } from "@/components/ui/input";

import { useDocumentPanel } from "@/hooks/use-document-panel";
import { PanelShell } from "./panel-shell";
import { PanelHeader } from "./panel-header";
import { ItemsList } from "./items-list";
import { PanelFooter } from "./panel-footer";
import { RenameDocumentDialog, RenameFolderDialog, RenameChatDialog } from "./rename-dialogs";

export interface DocumentPanelHandle {
  refresh: () => void;
}

export const DocumentPanel = forwardRef<DocumentPanelHandle, {
  readonly selectedDocument: Document | null;
  readonly setSelectedDocument: (d: Document | null) => void;
  readonly selectedFolder: Folder | null;
  readonly setSelectedFolder: (f: Folder | null) => void;
  readonly selectedChat: ChatThread | null;
  readonly setSelectedChat: (c: ChatThread | null) => void;
}>(function DocumentPanel({
  selectedDocument,
  setSelectedDocument,
  selectedFolder,
  setSelectedFolder,
  selectedChat,
  setSelectedChat,
}, ref) {
  const {
    docs,
    folders,
    chats,
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
    editingChat,
    setEditingChat,
    renameValue,
    setRenameValue,
    renameDoc,
    renameFolder,
    renameChat,

    deleteFolderById,
    deleteDocById,
    bulkDelete,

    handleFolderSelect,
    handleFilesSelect,

    handleDragStartDoc,
    handleDropOnFolder,
    handleDragOver,

    createChatThread,
    deleteChatThread,
  } = useDocumentPanel({
    selectedDocument,
    setSelectedDocument,
    selectedFolder,
    setSelectedFolder,
  });

  useImperativeHandle(ref, () => ({
    refresh,
  }));

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
          filtered.docs.length > 0 || filtered.folders.length > 0 || filtered.chats.length > 0
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
        onCreateChat={() => createChatThread()} // Wrap to avoid passing MouseEvent
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
        chats={filtered.chats}
        selectedFolder={selectedFolder}
        selectedDocument={selectedDocument}
        selectedChat={selectedChat}
        selectionMode={isSelectionMode}
        hasSelection={(id) => selectedIds.has(id)}
        toggleSelection={toggleSelection}
        ingestingMap={ingestJobs}
        onSelectFolder={setSelectedFolder}
        onSelectDoc={setSelectedDocument}
        onSelectChat={setSelectedChat}
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
        onRenameChat={(c) => {
            setRenameValue(c.title);
            setEditingChat(c);
        }}
        onDeleteChat={deleteChatThread}
        onCreateChatThread={createChatThread}
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

      <RenameChatDialog
        chat={editingChat}
        onOpenChange={(open) => !open && setEditingChat(null)}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onSave={renameChat}
      />
    </PanelShell>
  );
});