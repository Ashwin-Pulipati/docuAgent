"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canAsk && !disabled && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="flex w-full items-end gap-2 border border-border/50 bg-background/40 p-2 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring rounded-3xl">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 max-h-48 min-h-[40px] w-full resize-none border-none bg-transparent px-4 py-2.5 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground"
        aria-disabled={disabled}
        aria-label="Chat input"
      />

      {isGenerating ? (
        <Button
          onClick={onStop}
          size="icon"
          variant="ghost"
          className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
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
            "mb-0.5 h-9 w-9 shrink-0 rounded-full bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 text-muted-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring transition-all",
            value.trim() && "text-primary bg-primary/20"
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
