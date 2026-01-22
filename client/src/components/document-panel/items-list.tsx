"use client";

import * as React from "react";
import type { Document, Folder } from "@/lib/api";
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { FolderRow } from "./folder-row";
import { DocumentRow } from "./document-row";
import type { SelectionId } from "@/lib/types";

type Props = Readonly<{
  folders: Folder[];
  docs: Document[];

  selectedFolder: Folder | null;
  selectedDocument: Document | null;

  selectionMode: boolean;

  hasSelection: (id: string) => boolean;
  toggleSelection: (id: SelectionId) => void;

  ingestingMap: Map<string, unknown>;

  onSelectFolder: (f: Folder) => void;
  onSelectDoc: (d: Document) => void;

  onRenameFolder: (f: Folder) => void;
  onDeleteFolder: (id: number) => void;

  onRenameDoc: (d: Document) => void;
  onDeleteDoc: (docId: string) => void;

  onDragOver: (e: React.DragEvent) => void;
  onDropOnFolder: (e: React.DragEvent, folderId: number) => void;

  onDragStartDoc: (e: React.DragEvent, docId: string) => void;
}>;

export function ItemsList({
  folders,
  docs,
  selectedFolder,
  selectedDocument,
  selectionMode,
  hasSelection,
  toggleSelection,
  ingestingMap,
  onSelectFolder,
  onSelectDoc,
  onRenameFolder,
  onDeleteFolder,
  onRenameDoc,
  onDeleteDoc,
  onDragOver,
  onDropOnFolder,
  onDragStartDoc,
}: Props) {
  return (
    <SidebarContent className="bg-transparent">
      <SidebarGroup className="py-4">
        <SidebarGroupLabel className="mb-2 px-2">Documents & Folders</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2 px-0">
            {folders.map((f) => (
              <FolderRow
                key={`folder-${f.id}`}
                folder={f}
                active={selectedFolder?.id === f.id}
                selectionMode={selectionMode}
                selected={hasSelection(`f-${f.id}`)}
                onClick={() => {
                  if (selectionMode) toggleSelection(`f-${f.id}`);
                  else onSelectFolder(f);
                }}
                onToggleSelect={() => toggleSelection(`f-${f.id}`)}
                onRename={() => onRenameFolder(f)}
                onDelete={() => onDeleteFolder(f.id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDropOnFolder(e, f.id)}
              />
            ))}

            {docs.map((d) => {
              const selected = selectedDocument?.doc_id === d.doc_id;
              const isSelectedInMode = hasSelection(`d-${d.doc_id}`);
              const ingesting = ingestingMap.has(d.doc_id);

              return (
                <DocumentRow
                  key={d.doc_id}
                  doc={d}
                  active={selected}
                  selectionMode={selectionMode}
                  selected={isSelectedInMode}
                  ingesting={ingesting}
                  onClick={() => {
                    if (selectionMode) toggleSelection(`d-${d.doc_id}`);
                    else onSelectDoc(d);
                  }}
                  onToggleSelect={() => toggleSelection(`d-${d.doc_id}`)}
                  onRename={() => onRenameDoc(d)}
                  onDelete={() => onDeleteDoc(d.doc_id)}
                  draggable={!selectionMode}
                  onDragStart={(e) => onDragStartDoc(e, d.doc_id)}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
