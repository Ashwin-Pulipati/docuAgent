"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Readonly<{
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled: boolean;
  canAsk: boolean;
  isGenerating: boolean;
  placeholder: string;
}>;

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  canAsk,
  isGenerating,
  placeholder,
}: Props) {
  return (
    <div className="flex w-full items-center gap-2 border border-border/50 bg-background/40 px-2 py-2 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring rounded-full">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="border-none bg-transparent px-4 shadow-none focus-visible:ring-0 rounded-full"
        aria-disabled={disabled}
        aria-label="Chat input"
      />

      {isGenerating ? (
        <Button
          onClick={onStop}
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Stop generating"
        >
          <Square className="h-4 w-4 fill-current" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          onClick={onSend}
          disabled={!canAsk || disabled || !value.trim()}
          size="icon"
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 rounded-2xl bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 text-muted-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
