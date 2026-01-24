"use client";

import * as React from "react";
import type { Document } from "@/lib/api";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Loader2, MoreVertical, Pencil, Trash2, MessageSquarePlus, ChevronRight } from "lucide-react";
import { friendlyStatus, statusTone, cn } from "@/lib/utils";
import { Button } from "../ui/button";

type Props = Readonly<{
  doc: Document;
  active: boolean;
  selectionMode: boolean;
  selected: boolean;
  ingesting: boolean;
  hasChats: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreateChat: () => void;
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
}>;

export function DocumentRow({
  doc,
  active,
  selectionMode,
  selected,
  ingesting,
  hasChats,
  isExpanded,
  onClick,
  onToggleSelect,
  onToggleExpand,
  onRename,
  onDelete,
  onCreateChat,
  draggable,
  onDragStart,
}: Props) {
  return (
    <SidebarMenuItem className="relative py-0.5">
      <Button
        variant="ghost"
        size="icon"
            className={cn(
                "absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex h-5 w-5 shrink-0 items-center justify-center rounded-full cursor-pointer text-muted-foreground",
                !hasChats && "invisible pointer-events-none"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
            }}
            role="button"
            aria-label={isExpanded ? "Collapse chats" : "Expand chats"}
        >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
        </Button>

      <SidebarMenuButton
        isActive={active && !selectionMode}
        onClick={onClick}
        className={cn(
            "h-auto py-2 pr-8", 
            selected ? "bg-muted" : "",
            hasChats && "pl-7" 
        )}
        draggable={draggable}
        onDragStart={onDragStart}
        title={doc.name}
      >
        {selectionMode && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="mr-2"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select document ${doc.name}`}
          />
        )}

        <FileText
          className="h-4 w-4 text-chart-5 shrink-0"
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 items-center gap-1 py-1.5">
          <span className="truncate text-sm font-medium leading-none">
            {doc.name}
          </span>

          <div className="relative -top-1.5 left-0.5 flex shrink-0 items-center gap-1">
            <Badge
              variant={statusTone(doc.status)}
              className="h-3.5 px-1 text-[9px] uppercase"
            >
              {friendlyStatus(doc.status)}
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

      {!selectionMode && !ingesting && ["ingested", "completed", "success"].includes((doc.status || "").toLowerCase()) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="top-1/2! -translate-y-1/2! right-2!"
              aria-label={`Options for document ${doc.name}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="glass-card p-1">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onCreateChat();
              }}
              className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
            >
              <MessageSquarePlus
                className="mr-2 h-3 w-3 text-emerald-500"
                aria-hidden="true"
              />
              Create New Chat
            </DropdownMenuItem>
            
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