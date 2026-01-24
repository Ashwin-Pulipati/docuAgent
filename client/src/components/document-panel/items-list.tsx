"use client";

import * as React from "react";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { FolderRow } from "./folder-row";
import { DocumentRow } from "./document-row";
import type { SelectionId } from "@/lib/types";
import { MessageSquare, MoreVertical, Pencil, Trash2, MessageSquarePlus, CornerDownRight, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type Props = Readonly<{
  folders: Folder[];
  docs: Document[];
  chats: ChatThread[];

  selectedFolder: Folder | null;
  selectedDocument: Document | null;
  selectedChat: ChatThread | null;

  selectionMode: boolean;

  hasSelection: (id: string) => boolean;
  toggleSelection: (id: SelectionId) => void;

  ingestingMap: Map<string, unknown>;
  folderBusySet: Set<number>;

  onSelectFolder: (f: Folder) => void;
  onSelectDoc: (d: Document) => void;
  onSelectChat: (c: ChatThread) => void;

  onRenameFolder: (f: Folder) => void;
  onDeleteFolder: (id: number) => void;

  onRenameDoc: (d: Document) => void;
  onDeleteDoc: (docId: string) => void;

  onRenameChat: (c: ChatThread) => void;
  onDeleteChat: (id: number) => void;
  onCreateChatThread: (docId?: number, parentId?: number) => void;

  onDragOver: (e: React.DragEvent) => void;
  onDropOnFolder: (e: React.DragEvent, folderId: number) => void;

  onDragStartDoc: (e: React.DragEvent, docId: string) => void;
}>;

function ChatRow({
    chat,
    chatsByParentId,
    selectedChat,
    selectionMode,
    hasSelection,
    toggleSelection,
    onSelectChat,
    onRenameChat,
    onDeleteChat,
    onCreateChatThread,
    depth = 0,
    allowBranching = true
}: {
    readonly chat: ChatThread;
    readonly chatsByParentId: Map<number, ChatThread[]>;
    readonly selectedChat: ChatThread | null;
    readonly selectionMode: boolean;
    readonly hasSelection: (id: string) => boolean;
    readonly toggleSelection: (id: SelectionId) => void;
    readonly onSelectChat: (c: ChatThread) => void;
    readonly onRenameChat: (c: ChatThread) => void;
    readonly onDeleteChat: (id: number) => void;
    readonly onCreateChatThread: (docId?: number, parentId?: number) => void;
    readonly depth?: number;
    readonly allowBranching?: boolean;
}) {
    const children = chatsByParentId.get(chat.id) || [];
    const isSelected = selectedChat?.id === chat.id;
    const isChecked = hasSelection(`c-${chat.id}`);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const hasChildren = children.length > 0;
    const paddingLeft = depth * 12 + 12;

    return (
        <>
            <SidebarMenuItem className="relative">
                {hasChildren && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 z-20 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent/20 cursor-pointer text-muted-foreground hover:text-accent"
                        )}
                        style={{ left: `${paddingLeft - 8}px` }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        role="button"
                    >
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                )}

                <SidebarMenuButton
                    isActive={isSelected && !selectionMode}
                    onClick={() => {
                        if (selectionMode) toggleSelection(`c-${chat.id}`);
                        else onSelectChat(chat);
                    }}
                    className={cn(
                        "h-auto py-2 pr-8", 
                        isChecked ? "bg-muted" : ""
                    )}
                    title={chat.title}
                    style={{ paddingLeft: `${paddingLeft + (hasChildren ? 12 : 12)}px` }}
                >
                    {selectionMode && (
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelection(`c-${chat.id}`)}
                            className="mr-2"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select chat ${chat.title}`}
                        />
                    )}
                    
                    {/* Indentation/Connector icon when no children */}
                    {depth > 0 && !hasChildren && (
                         <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0 mr-1" aria-hidden="true" />
                    )}
                    
                    {!hasChildren && depth === 0 && (
                         <MessageSquare className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    )}

                    <span className="font-medium truncate text-sm">{chat.title}</span>
                </SidebarMenuButton>

                {!selectionMode && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuAction className="top-1/2! -translate-y-1/2! right-2!" aria-label={`Options for chat ${chat.title}`}>
                                <MoreVertical className="h-4 w-4" />
                            </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card p-1">
                             {allowBranching && (
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCreateChatThread(undefined, chat.id);
                                        setIsExpanded(true);
                                    }}
                                    className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                                >
                                    <MessageSquarePlus className="mr-2 h-3 w-3 text-emerald-500" />
                                    Branch Chat
                                </DropdownMenuItem>
                             )}
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRenameChat(chat);
                                }}
                                className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                            >
                                <Pencil className="mr-2 h-3 w-3 text-purple-500" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChat(chat.id);
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
            {isExpanded && children.map(child => (
                <ChatRow
                    key={`chat-${child.id}`}
                    chat={child}
                    chatsByParentId={chatsByParentId}
                    selectedChat={selectedChat}
                    selectionMode={selectionMode}
                    hasSelection={hasSelection}
                    toggleSelection={toggleSelection}
                    onSelectChat={onSelectChat}
                    onRenameChat={onRenameChat}
                    onDeleteChat={onDeleteChat}
                    onCreateChatThread={onCreateChatThread}
                    depth={depth + 1}
                    allowBranching={allowBranching}
                />
            ))}
        </>
    );
}

export function ItemsList({
  folders,
  docs,
  chats,
  selectedFolder,
  selectedDocument,
  selectedChat,
  selectionMode,
  hasSelection,
  toggleSelection,
  ingestingMap,
  folderBusySet,
  onSelectFolder,
  onSelectDoc,
  onSelectChat,
  onRenameFolder,
  onDeleteFolder,
  onRenameDoc,
  onDeleteDoc,
  onRenameChat,
  onDeleteChat,
  onCreateChatThread,
  onDragOver,
  onDropOnFolder,
  onDragStartDoc,
}: Props) {
  
  const { independentChats, chatsByDocId, chatsByParentId } = React.useMemo(() => {
      const independent: ChatThread[] = [];
      const byDoc = new Map<number, ChatThread[]>();
      const byParent = new Map<number, ChatThread[]>();

      chats.forEach(c => {
          if (c.parent_id) {
              if (!byParent.has(c.parent_id)) byParent.set(c.parent_id, []);
              byParent.get(c.parent_id)!.push(c);
          } else if (c.document_id) {
              if (!byDoc.has(c.document_id)) byDoc.set(c.document_id, []);
              byDoc.get(c.document_id)!.push(c);
          } else {
              independent.push(c);
          }
      });
      return { independentChats: independent, chatsByDocId: byDoc, chatsByParentId: byParent };
  }, [chats]);

  const [expandedDocIds, setExpandedDocIds] = React.useState<Set<string>>(new Set());

  const toggleDocExpand = (docId: string) => {
      const next = new Set(expandedDocIds);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      setExpandedDocIds(next);
  };
  
  
  React.useEffect(() => {
    if (selectedChat?.document_id) {
        const doc = docs.find(d => d.id === selectedChat.document_id);
        if (doc) {
             setExpandedDocIds(prev => {
                 if (prev.has(doc.doc_id)) return prev;
                 return new Set(prev).add(doc.doc_id);
             });
        }
    }
  }, [selectedChat, docs]);

  return (
    <SidebarContent className="bg-transparent">
      {selectedFolder && independentChats.length > 0 && (
          <SidebarGroup className="py-4">
            <SidebarGroupLabel className="mb-2 px-2">Folder-level Chats</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="gap-2 px-0">
                    {independentChats.map((c) => (
                        <ChatRow 
                            key={`chat-${c.id}`} 
                            chat={c} 
                            chatsByParentId={chatsByParentId}
                            selectedChat={selectedChat}
                            selectionMode={selectionMode}
                            hasSelection={hasSelection}
                            toggleSelection={toggleSelection}
                            onSelectChat={onSelectChat}
                            onRenameChat={onRenameChat}
                            onDeleteChat={onDeleteChat}
                            onCreateChatThread={onCreateChatThread}
                            allowBranching={false}
                        />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
      )}

      <SidebarGroup className="py-4">
        <SidebarGroupLabel className="mb-2 px-2">Documents & Folders</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2 px-0">
            {folders.map((f) => (
              <FolderRow
                key={`folder-${f.id}`}
                folder={f}
                active={selectedFolder?.id === f.id && !selectedDocument && !selectedChat}
                selectionMode={selectionMode}
                selected={hasSelection(`f-${f.id}`)}
                processing={folderBusySet.has(f.id)}
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
              const selected = selectedDocument?.doc_id === d.doc_id && !selectedChat;
              const isSelectedInMode = hasSelection(`d-${d.doc_id}`);
              const ingesting = ingestingMap.has(d.doc_id);
              const docChats = d.id ? (chatsByDocId.get(d.id) || []) : [];
              const hasChats = docChats.length > 0;
              const isExpanded = expandedDocIds.has(d.doc_id);

              return (
                <React.Fragment key={d.doc_id}>
                    <DocumentRow
                        doc={d}
                        active={selected}
                        selectionMode={selectionMode}
                        selected={isSelectedInMode}
                        ingesting={ingesting}
                        hasChats={hasChats}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleDocExpand(d.doc_id)}
                        onClick={() => {
                            if (selectionMode) toggleSelection(`d-${d.doc_id}`);
                            else onSelectDoc(d);
                        }}
                        onToggleSelect={() => toggleSelection(`d-${d.doc_id}`)}
                        onRename={() => onRenameDoc(d)}
                        onDelete={() => onDeleteDoc(d.doc_id)}
                        onCreateChat={() => {
                            if (d.id) {
                                onCreateChatThread(d.id);
                                if (!isExpanded) toggleDocExpand(d.doc_id);
                            }
                        }}
                        draggable={!selectionMode}
                        onDragStart={(e) => onDragStartDoc(e, d.doc_id)}
                    />
                    {isExpanded && docChats.map(c => (
                        <ChatRow 
                            key={`chat-${c.id}`} 
                            chat={c}
                            chatsByParentId={chatsByParentId}
                            selectedChat={selectedChat}
                            selectionMode={selectionMode}
                            hasSelection={hasSelection}
                            toggleSelection={toggleSelection}
                            onSelectChat={onSelectChat}
                            onRenameChat={onRenameChat}
                            onDeleteChat={onDeleteChat}
                            onCreateChatThread={onCreateChatThread}
                            depth={1}
                        />
                    ))}
                </React.Fragment>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
