import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Document, Folder, ChatThread } from "@/lib/api";
import { SaveIcon } from "lucide-react";

interface RenameDocumentDialogProps {
  readonly document: Document | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly renameValue: string;
  readonly onRenameValueChange: (value: string) => void;
  readonly onSave: () => void;
}

export function RenameDocumentDialog({
  document,
  onOpenChange,
  renameValue,
  onRenameValueChange,
  onSave,
}: RenameDocumentDialogProps) {
  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="rename">Filename</Label>
          <Input
            id="rename"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameFolderDialogProps {
  readonly folder: Folder | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly renameValue: string;
  readonly onRenameValueChange: (value: string) => void;
  readonly onSave: () => void;
}

export function RenameFolderDialog({
  folder,
  onOpenChange,
  renameValue,
  onRenameValueChange,
  onSave,
}: RenameFolderDialogProps) {
  return (
    <Dialog open={!!folder} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="rename-folder">Folder Name</Label>
          <Input
            id="rename-folder"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameChatDialogProps {
  readonly chat: ChatThread | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly renameValue: string;
  readonly onRenameValueChange: (value: string) => void;
  readonly onSave: () => void;
}

export function RenameChatDialog({
  chat,
  onOpenChange,
  renameValue,
  onRenameValueChange,
  onSave,
}: RenameChatDialogProps) {
  return (
    <Dialog open={!!chat} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="text-gradient text-3xl font-bold">
            Rename Chat
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="rename-chat">Chat Title</Label>
          <Input
            id="rename-chat"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            className="rounded-full mt-4"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="lg"
            onClick={onSave}
            className="flex items-center justify-center gap-2 rounded-full bg-primary/10 text-primary"
          >
            <SaveIcon className="w-4 h-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}