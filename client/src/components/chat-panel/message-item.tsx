"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getStringColor } from "@/lib/utils";
import { Check, Copy, Edit2, Origami } from "lucide-react";
import * as React from "react";
import type { Message } from "../../lib/types";

type Props = Readonly<{
  msg: Message;
  isUser: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit?: () => void;
}>;

export const MessageItem = React.memo(function MessageItem({
  msg,
  isUser,
  isCopied,
  onCopy,
  onEdit,
}: Props) {
  const showTools = msg.status !== "pending";

  return (
    <li className={cn("group flex items-start gap-3", isUser && "justify-end")}>
      {!isUser && (
        <Avatar
          aria-label="AI Assistant"
          className="h-9 w-9 bg-linear-to-t from-transparent to-primary/50"
        >
          <AvatarImage
            src="/ai.png"
            alt="AI Assistant"
            className="object-contain"
          />
          <AvatarFallback className="bg-gradient text-muted-foreground">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      <div className="relative max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm",
            "border border-border/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isUser
              ? cn(
                  "rounded-tr-none",
                  "bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20",
                  "text-foreground",
                )
              : cn(
                  "rounded-tl-none",
                  "bg-card/60 backdrop-blur-sm text-foreground",
                ),
          )}
          role="article"
          aria-label={isUser ? "Your message" : "Assistant message"}
        >
          {msg.text}

          {msg.status === "pending" && (
            <span
              className="ml-1 inline-flex items-center gap-1"
              aria-label="Typing"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse delay-75" />
              <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse delay-150" />
            </span>
          )}

          {!isUser &&
            msg.result?.citations &&
            msg.result.citations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/30 pt-2">
                {msg.result.citations.map((c, i) => (
                  <Badge
                    key={`${c.source}-${c.page_number ?? "na"}-${i}`}
                    variant="outline"
                    className={cn(
                      "text-[10px] transition-colors",
                      getStringColor(c.source),
                    )}
                    title={c.quote}
                  >
                    {c.source} {c.page_number ? `(p. ${c.page_number})` : ""}
                  </Badge>
                ))}
              </div>
            )}
        </div>

        {showTools && (
          <div
            className={cn(
              "absolute top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
              isUser ? "-left-20" : "-right-10",
            )}
            aria-hidden={false}
          >
            {isUser && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/50 shadow-sm backdrop-blur-sm hover:bg-accent/10"
                onClick={onEdit}
                aria-label="Edit message"
              >
                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full bg-background/50 shadow-sm backdrop-blur-sm hover:bg-accent/10",
                isCopied && "text-primary",
              )}
              onClick={onCopy}
              aria-label="Copy message"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        )}
      </div>

      {isUser && (
        <Avatar aria-label="You" className="h-9 w-9">
          <AvatarImage src="/user.png" alt="You" className="object-cover" />
          <AvatarFallback className="bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 text-muted-foreground brightness-105">
            <Origami
              className="h-5 w-5 scale-x-[-1] text-rosewater/80"
              aria-hidden="true"
            />
          </AvatarFallback>
        </Avatar>
      )}
    </li>
  );
});
