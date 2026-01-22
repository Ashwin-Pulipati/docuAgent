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
import type { Document, Folder } from "@/lib/api";

interface RenameDocumentDialogProps {
  document: Document | null;
  onOpenChange: (open: boolean) => void;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onSave: () => void;
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
  folder: Folder | null;
  onOpenChange: (open: boolean) => void;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onSave: () => void;
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
