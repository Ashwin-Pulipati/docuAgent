"use client";

import * as React from "react";
import { FileText } from "lucide-react";

export function EmptyChatState() {
  return (
    <div className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-border/50 p-8 text-center">
      <div className="mb-4 rounded-2xl bg-muted/50 p-4 bg-gradient">
        <FileText
          className="h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        />
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
