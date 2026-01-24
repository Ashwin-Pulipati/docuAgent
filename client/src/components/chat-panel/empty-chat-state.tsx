"use client";

import { FileText, MessageSquarePlus } from "lucide-react";
import type { Document, Folder } from "@/lib/api";
import { Button } from "../ui/button";

type Props = {
  selectedDocument?: Document | null;
  selectedFolder?: Folder | null;
  onCreateChat?: () => void;
  disabled?: boolean;
};

export function EmptyChatState({ selectedDocument, selectedFolder, onCreateChat, disabled }: Props) {
  const target = selectedDocument || selectedFolder;
  
  if (target) {
    return (
      <div className="glass-panel flex h-full flex-col items-center justify-center border border-border/50 p-8 text-center">
        <div className="mb-4 rounded-2xl bg-muted/50 p-4 bg-gradient">
           <MessageSquarePlus className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-display font-semibold text-transparent md:text-3xl">
          {disabled ? "Processing..." : "Ready to Chat?"}
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {disabled ? (
            `Please wait while ${target.name} is being processed.`
          ) : (
            <>
              Create a new chat thread to start analyzing{" "}
              <span className="font-medium text-foreground">{target.name}</span>
              .
            </>
          )}
        </p>
        {onCreateChat && (
          <Button 
            variant="ghost"
            size="lg"
                onClick={onCreateChat} 
                disabled={disabled}
                className="mt-6 text-primary font-bold bg-primary/10 rounded-full"
            >
                {disabled ? "Please Wait" : "Create New Chat"}
            </Button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col items-center justify-center border border-border/50 p-8 text-center">
      <div className="mb-4 rounded-2xl bg-muted/50 p-4 bg-gradient">
        <FileText className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-2xl font-display font-semibold text-transparent md:text-3xl">
        Select a document or folder
      </h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Choose a document or an entire folder to start analyzing and chatting
        with your data.
      </p>
    </div>
  );
}
