"use client";

import * as React from "react";
import { SidebarFooter } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { HowToUseDialog } from "@/components/how-to-use-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Origami } from "lucide-react";

type Props = Readonly<{
  docsCount: number;
  foldersCount: number;
  busy: boolean;
  userGender?: "male" | "female";
  onUserGenderToggle?: () => void;
}>;

export function PanelFooter({ docsCount, foldersCount, busy, userGender = "female", onUserGenderToggle }: Props) {
  return (
    <SidebarFooter className="border-t border-border/50 p-4 bg-card/10 backdrop-blur-sm">
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <div className="flex flex-col gap-1">
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
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={onUserGenderToggle}
                className="h-10 w-10 rounded-full hover:bg-accent/10 md:hidden"
                aria-label={`Switch avatar (current: ${userGender})`}
            >
                <Avatar className="h-10 w-10 ring-1 ring-border/50">
                    <AvatarImage src={`/${userGender}-user.png`} alt="User Avatar" />
                    <AvatarFallback>
                        <Origami className="h-3 w-3" />
                    </AvatarFallback>
                </Avatar>
            </Button>
            <HowToUseDialog />
        </div>
      </div>
    </SidebarFooter>
  );
}
