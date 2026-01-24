"use client";

import * as React from "react";
import type { Folder } from "@/lib/api";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder as FolderIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

type Props = Readonly<{
  folder: Folder;
  active: boolean;
  selectionMode: boolean;
  selected: boolean;
  processing: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}>;

export function FolderRow({
  folder,
  active,
  selectionMode,
  selected,
  processing,
  onClick,
  onToggleSelect,
  onRename,
  onDelete,
  onDragOver,
  onDrop,
}: Props) {
  return (
    <SidebarMenuItem className="py-0.5">
      <SidebarMenuButton
        isActive={active}
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`h-auto py-2 ${selected ? "bg-muted" : ""}`}
        title={folder.name}
      >
        {selectionMode && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="mr-2"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select folder ${folder.name}`}
          />
        )}

        <FolderIcon
          className="h-4 w-4 text-chart-3 shrink-0"
          aria-hidden="true"
        />
        <span className="font-medium">{folder.name}</span>
        {processing && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" aria-hidden="true" />
        )}
      </SidebarMenuButton>

      {!selectionMode && !processing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="top-1/2! -translate-y-1/2! right-2!"
              aria-label={`Options for folder ${folder.name}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="glass-card p-1">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
            >
              <Pencil
                className="mr-2 h-3 w-3 text-purple-500 dark:text-purple-400"
                aria-hidden="true"
              />
              Rename
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
            >
              <Trash2
                className="mr-2 h-3 w-3 text-destructive"
                aria-hidden="true"
              />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
