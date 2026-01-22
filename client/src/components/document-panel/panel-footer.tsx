"use client";

import * as React from "react";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";

type Props = Readonly<{
  docsCount: number;
  foldersCount: number;
  busy: boolean;
}>;

export function PanelFooter({ docsCount, foldersCount, busy }: Props) {
  return (
    <SidebarFooter className="border-t border-border/50 p-4 bg-card/10 backdrop-blur-sm">
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>
          {docsCount} DOCS • {foldersCount} FOLDERS
        </span>
        {busy && (
          <div className="flex items-center gap-1 text-primary">
            <Loader2 className="h-2 w-2 animate-spin" aria-hidden="true" />{" "}
            SYNCING
          </div>
        )}
      </div>
    </SidebarFooter>
  );
}
