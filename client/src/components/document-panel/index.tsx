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
  createChat: (docId?: number, parentId?: number) => Promise<ChatThread | undefined>;
}

export const DocumentPanel = forwardRef<DocumentPanelHandle, {
  readonly selectedDocument: Document | null;
  readonly setSelectedDocument: (d: Document | null) => void;
  readonly selectedFolder: Folder | null;
  readonly setSelectedFolder: (f: Folder | null) => void;
  readonly selectedChat: ChatThread | null;
  readonly setSelectedChat: (c: ChatThread | null) => void;
  readonly onSelectionReady?: (isReady: boolean) => void;
  readonly userGender?: "male" | "female";
  readonly onUserGenderToggle?: () => void;
}>(function DocumentPanel({
  selectedDocument,
  setSelectedDocument,
  selectedFolder,
  setSelectedFolder,
  selectedChat,
  setSelectedChat,
  onSelectionReady,
  userGender = "female",
  onUserGenderToggle,
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
    folderBusySet,

    busy,
    isRefreshing,
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
    toggleChatStar,
  } = useDocumentPanel({
    selectedDocument,
    setSelectedDocument,
    selectedFolder,
    setSelectedFolder,
    selectedChat,
    setSelectedChat,
  });

  const handleCreateChat = React.useCallback(async (docId?: number, parentId?: number, folderId?: number) => {
    const newChat = await createChatThread(docId, parentId, folderId);
    if (newChat) {
      setSelectedDocument(null);
      setSelectedChat(newChat);
    }
    return newChat;
  }, [createChatThread, setSelectedChat, setSelectedDocument]);

  const handleDeleteChat = React.useCallback(async (id: number) => {
      const deleted = await deleteChatThread(id);
      if (deleted && selectedChat?.id === id) {
          setSelectedChat(null);
      }
  }, [deleteChatThread, selectedChat, setSelectedChat]);

  useImperativeHandle(ref, () => ({
    refresh,
    createChat: handleCreateChat,
  }));

  React.useEffect(() => {
    if (!onSelectionReady) return;

    if (selectedDocument) {
      const liveDoc =
        docs.find((d) => d.doc_id === selectedDocument.doc_id) ||
        selectedDocument;
      const status = (liveDoc.status || "").toLowerCase();
      const isReady =
        !ingestJobs.has(selectedDocument.doc_id) &&
        ["ingested", "completed", "success"].includes(status);
      onSelectionReady(isReady);
    } else if (selectedFolder) {
      const isReady = !folderBusySet.has(selectedFolder.id);
      onSelectionReady(isReady);
    } else {
      onSelectionReady(true);
    }
  }, [
    selectedDocument,
    selectedFolder,
    ingestJobs,
    folderBusySet,
    onSelectionReady,
    docs,
  ]);

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
        isRefreshing={isRefreshing}
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
        onCreateChat={() => handleCreateChat()}
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
        folderBusySet={folderBusySet}
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
        onDeleteChat={handleDeleteChat}
        onToggleStar={toggleChatStar}
        onCreateChatThread={handleCreateChat}
        onDragOver={handleDragOver}
        onDropOnFolder={handleDropOnFolder}
        onDragStartDoc={handleDragStartDoc}
      />

      <PanelFooter
        docsCount={docs.length}
        foldersCount={folders.length}
        busy={busy}
        userGender={userGender}
        onUserGenderToggle={onUserGenderToggle}
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