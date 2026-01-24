import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus } from "lucide-react";

interface CreateFolderDialogProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly newFolderName: string;
  readonly onNameChange: (value: string) => void;
  readonly onCreate: () => void;
  readonly disabled?: boolean;
}

export function CreateFolderDialog({
  isOpen,
  onOpenChange,
  newFolderName,
  onNameChange,
  onCreate,
  disabled,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9rounded-full"
          disabled={disabled}
          aria-label="Create new folder"
          title="Create new folder"
        >
          <FolderPlus className="size-4.5!" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="text-gradient font-bold text-3xl">
            Create New Folder
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={newFolderName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onCreate}
            variant="ghost"
            size="lg"
            className="rounded-full text-primary bg-primary/10 font-bold"
          >
            <FolderPlus className="mr-1 size-4.5!" aria-hidden="true" />Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
