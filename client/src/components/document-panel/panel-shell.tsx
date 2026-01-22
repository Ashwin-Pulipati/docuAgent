"use client";

import * as React from "react";
import { Sidebar } from "@/components/ui/sidebar";

type Props = Readonly<{
  children: React.ReactNode;
  isDraggingFile: boolean;
  selectedFolderId: number | null;
  dragHandlers: Readonly<{
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  }>;
}>;

export function PanelShell({
  children,
  isDraggingFile,
  selectedFolderId,
  dragHandlers,
}: Props) {
  return (
    <Sidebar
      className="glass-panel border-r border-border/50"
      onDragEnter={dragHandlers.onDragEnter}
      onDragLeave={dragHandlers.onDragLeave}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="animate-pulse text-lg font-semibold text-primary">
            Drop PDF here to upload to {selectedFolderId ? "folder" : "root"}
          </div>
        </div>
      )}
      {children}
    </Sidebar>
  );
}
