import * as React from "react";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { cn, friendlyStatus, normalizeStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const contextLabel = selectedDocument
    ? friendlyStatus(selectedDocument.status)
    : selectedFolder
      ? "Folder Context"
      : "Chat Context";

  const contextVariant = selectedDocument
      ? (docReady ? "default" : "secondary")
      : "outline";

  return (
    <div className="mx-auto w-fit max-w-xl rounded-full border border-border/40 bg-background/60 px-4 py-1 shadow-sm backdrop-blur-xl transition-all hover:bg-background/80 hover:shadow-md">
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h2 className="bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-lg font-semibold text-transparent truncate cursor-default max-w-50 md:max-w-75">
                {targetName}
              </h2>
            </TooltipTrigger>
            <TooltipContent>
              <p>{targetName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1 shrink-0">
          {onRename && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setIsRenameOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
            </Button>
          )}

          <Badge variant={contextVariant} className="h-6 px-2 text-[10px] shadow-none font-normal">
            {selectedDocument && (
               <span
                 className={cn(
                   "mr-1.5 h-1.5 w-1.5 rounded-full animate-pulse",
                   docReady ? "bg-primary-foreground/50" : "bg-muted-foreground"
                 )}
                 aria-hidden="true"
               />
            )}
            {contextLabel}
          </Badge>
        </div>
      </div>

      {onRename && (
          <RenameChatDialog
            chat={isRenameOpen ? { id: 0, title: targetName, is_starred: false, created_at: "", updated_at: "", messages: [] } as ChatThread : null}
            onOpenChange={setIsRenameOpen}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onSave={handleSave}
          />
      )}
    </div>
  );
}
