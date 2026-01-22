"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { SidebarHeader } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  Trash2,
  X,
  CheckSquare,
  CornerUpLeft,
  Folder as FolderIcon,
} from "lucide-react";
import type { Document, Folder } from "@/lib/api";
import { UploadMenu } from "./upload-menu";
import { SearchBar } from "./search-bar";
import { CreateFolderDialog } from "./create-folder-dialog";

type Props = Readonly<{
  selectedFolder: Folder | null;
  selectedDocument: Document | null;

  busy: boolean;
  isSelectionMode: boolean;

  canEnterSelectionMode: boolean;
  selectedCount: number;

  onBackRoot: () => void;
  onSelectFolderContext: () => void;

  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;

  onBulkDelete: () => void;
  onRefresh: () => void;

  openCreateFolder: boolean;
  setOpenCreateFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  onCreateFolder: () => void;

  query: string;
  setQuery: (v: string) => void;

  onUploadFiles: () => void;
  onUploadFolder: () => void;

  fileInput: React.ReactNode;
  folderInput: React.ReactNode;
}>;

export function PanelHeader({
  selectedFolder,
  selectedDocument,
  busy,
  isSelectionMode,
  canEnterSelectionMode,
  selectedCount,
  onBackRoot,
  onSelectFolderContext,
  onEnterSelectionMode,
  onExitSelectionMode,
  onBulkDelete,
  onRefresh,
  openCreateFolder,
  setOpenCreateFolder,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  query,
  setQuery,
  onUploadFiles,
  onUploadFolder,
  fileInput,
  folderInput,
}: Props) {
  return (
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
            <CreateFolderDialog
              isOpen={openCreateFolder}
              onOpenChange={setOpenCreateFolder}
              newFolderName={newFolderName}
              onNameChange={setNewFolderName}
              onCreate={onCreateFolder}
              disabled={busy}
            />
          )}

          {isSelectionMode ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onExitSelectionMode}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                title="Cancel Selection"
                aria-label="Cancel selection mode"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onBulkDelete}
                disabled={selectedCount === 0 || busy}
                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                title={`Delete ${selectedCount} selected items`}
                aria-label={`Delete ${selectedCount} selected items`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEnterSelectionMode}
              disabled={busy || !canEnterSelectionMode}
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
                onClick={onRefresh}
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

              <UploadMenu
                busy={busy}
                onUploadFiles={onUploadFiles}
                onUploadFolder={onUploadFolder}
              />
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
              onClick={onBackRoot}
              className="h-8 w-8 rounded-full"
              title="Back to Root (Drop here to move to Root)"
              aria-label="Go back to root folder"
            >
              <CornerUpLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            {selectedDocument && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSelectFolderContext}
                className="h-8 w-8 rounded-full text-primary"
                title="Select Folder (Chat with entire folder)"
                aria-label="Deselect document to chat with folder"
              >
                <FolderIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}

        <SearchBar value={query} onChange={setQuery} disabled={busy} />
      </div>

      {fileInput}
      {folderInput}
    </SidebarHeader>
  );
}
