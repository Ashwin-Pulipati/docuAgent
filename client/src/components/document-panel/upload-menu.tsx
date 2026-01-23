"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, FileUp, FolderUp } from "lucide-react";

type Props = Readonly<{
  busy: boolean;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
}>;

export function UploadMenu({ busy, onUploadFiles, onUploadFolder }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-gradient md:flex md:items-center md:px-12 px-0"
          disabled={busy}
          aria-label="Upload options"
          title="Upload options"
        >
          <FileUp className="size-4!" aria-hidden="true" />
          <span className="hidden md:flex">Upload</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="glass-card p-1">
        <DropdownMenuItem
          onClick={onUploadFiles}
          className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
        >
          <FileText className="mr-2 h-4 w-4 text-chart-5" aria-hidden="true" />
          Upload Files
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onUploadFolder}
          className="rounded-full transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
        >
          <FolderUp className="mr-2 h-4 w-4 text-chart-3" aria-hidden="true" />
          Upload Folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
