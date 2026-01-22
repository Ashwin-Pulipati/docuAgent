import * as React from "react";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { cn, friendlyStatus, normalizeStatus } from "@/lib/utils";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { RenameChatDialog } from "../document-panel/rename-dialogs";

type Props = Readonly<{
  selectedDocument: Document | null;
  selectedFolder: Folder | null;
  targetName: string;
  onRename?: (newTitle: string) => void;
}>;

export function ChatHeader({
  selectedDocument,
  selectedFolder,
  targetName,
  onRename,
}: Props) {
  const docReady =
    selectedDocument &&
    (normalizeStatus(selectedDocument.status) === "ingested" ||
      normalizeStatus(selectedDocument.status) === "completed");

  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");

  React.useEffect(() => {
      if (isRenameOpen) setRenameValue(targetName);
  }, [isRenameOpen, targetName]);

  const handleSave = () => {
      if (onRename && renameValue.trim()) {
          onRename(renameValue);
          setIsRenameOpen(false);
      }
  };

  return (
    <CardHeader className="sticky top-0 z-10 space-y-1 rounded-t-2xl border-b border-border/50 bg-card/40 px-6 pb-4 backdrop-blur-sm">
      <CardTitle className="mt-4 flex items-center gap-2 truncate">
        <span className="text-gradient text-3xl font-bold">{targetName}</span>
        {onRename && (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-purple-500 dark:text-purple-400"
                onClick={() => setIsRenameOpen(true)}
            >
                <Pencil className="h-3 w-3" />
            </Button>
        )}
      </CardTitle>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {selectedDocument ? (
          <>
            <span
              className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                docReady ? "bg-primary" : "bg-secondary",
              )}
              aria-hidden="true"
            />
            <span>Status:</span>
            <span className="font-medium text-foreground">
              {friendlyStatus(selectedDocument.status)}
            </span>
          </>
        ) : (
          <>
            <span
              className="h-2 w-2 rounded-full bg-secondary animate-pulse"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
                {selectedFolder ? "Folder Context" : "Chat Context"}
            </span>
          </>
        )}
      </div>

      {onRename && (
          <RenameChatDialog
            chat={isRenameOpen ? { id: 0, title: targetName, created_at: "", updated_at: "", messages: [] } as ChatThread : null}
            onOpenChange={setIsRenameOpen}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onSave={handleSave}
          />
      )}
    </CardHeader>
  );
}
