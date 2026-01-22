"use client";

import * as React from "react";
import type { Document, Folder } from "@/lib/api";
import { cn, friendlyStatus, normalizeStatus } from "@/lib/utils";
import { CardHeader, CardTitle } from "@/components/ui/card";

type Props = Readonly<{
  selectedDocument: Document | null;
  selectedFolder: Folder | null;
  targetName: string;
}>;

export function ChatHeader({
  selectedDocument,
  selectedFolder,
  targetName,
}: Props) {
  const docReady =
    selectedDocument &&
    (normalizeStatus(selectedDocument.status) === "ingested" ||
      normalizeStatus(selectedDocument.status) === "completed");

  return (
    <CardHeader className="sticky top-0 z-10 space-y-1 rounded-t-2xl border-b border-border/50 bg-card/40 px-6 pb-4 backdrop-blur-sm">
      <CardTitle className="mt-4 flex items-center gap-2 truncate">
        <span className="text-gradient text-3xl font-bold">{targetName}</span>
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
            <span className="font-medium text-foreground">Folder Context</span>
          </>
        )}
      </div>
    </CardHeader>
  );
}
