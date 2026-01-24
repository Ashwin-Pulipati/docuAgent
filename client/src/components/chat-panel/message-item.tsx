import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getStringColor } from "@/lib/utils";
import { Check, Copy, Edit2, Origami, Smile } from "lucide-react";
import * as React from "react";
import type { Message } from "../../lib/types";
import EmojiPicker, { Theme } from "emoji-picker-react";

type Props = Readonly<{
  msg: Message;
  isUser: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onEdit?: () => void;
  onReaction?: (msgId: string, emoji: string) => void;
}>;

export const MessageItem = React.memo(function MessageItem({
  msg,
  isUser,
  isCopied,
  onCopy,
  onEdit,
  onReaction,
}: Props) {
  const showTools = msg.status !== "pending";
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  return (
    <li
      className={cn(
        "group flex items-start gap-3 pb-8 relative",
        isUser && "justify-end",
      )}
    >
      {!isUser && (
        <Avatar
          aria-label="AI Assistant"
          className="h-9 w-9 bg-linear-to-t from-primary/50 via-transparent to-primary/50 mt-1 shrink-0"
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

      <div
        className={cn(
          "relative flex flex-col max-w-[65%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <article
          className={cn(
            "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm transition-colors break-words min-w-0 relative z-10",
            "border border-border/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isUser
              ? cn(
                  "bg-linear-to-br from-primary/10 via-secondary/10 to-accent/10",
                  "text-foreground hover:bg-primary/15 ",
                )
              : cn(
                  "bg-card/40 backdrop-blur-sm text-foreground hover:bg-card/50",
                ),
          )}
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
        </article>

        {msg.reactions && msg.reactions.length > 0 && (
          <div
            className={cn(
              "absolute -bottom-4 flex flex-wrap gap-1 z-20",
              isUser ? "right-2" : "left-2",
            )}
          >
            <TooltipProvider>
              {msg.reactions.map((r, i) => (
                <Tooltip key={`${r.emoji}-${i}`}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReaction?.(msg.id, r.emoji)}
                      className={cn(
                        "h-6 rounded-full px-1.5 py-0 text-[10px] font-bold gap-1 shadow-xs backdrop-blur-md transition-all active:scale-95",
                        r.user_reacted
                          ? "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 hover:text-primary"
                          : "bg-background/20 border-border/50 hover:bg-muted text-muted-foreground hover:text-muted-foreground",
                      )}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.count}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="text-[10px] px-2 py-1"
                  >
                    <p>
                      {r.user_reacted
                        ? r.count > 1
                          ? "You and others"
                          : "You"
                        : "AI assistant"}{" "}
                      reacted
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        )}

        {showTools && (
          <div
            className={cn(
              "absolute top-0 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100 px-2 py-1 rounded-full bg-background border border-border/50 shadow-sm z-10",
              isUser
                ? "-left-2 -translate-x-full -mr-4"
                : "-right-2 translate-x-full ml-4",
            )}
            aria-hidden={false}
          >
            <DropdownMenu open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-full hover:bg-accent hover:text-accent-foreground",
                    isPickerOpen && "bg-accent text-accent-foreground",
                  )}
                  aria-label="Add reaction"
                >
                  <Smile className="h-3 w-3" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-auto p-0 border-none bg-transparent shadow-none"
                side="top"
                align={isUser ? "end" : "start"}
              >
                <EmojiPicker
                  onEmojiClick={(e) => {
                    onReaction?.(msg.id, e.emoji);
                    setIsPickerOpen(false);
                  }}
                  theme={Theme.AUTO}
                  lazyLoadEmojis={true}
                  width={300}
                  height={350}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            {isUser && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-accent hover:text-accent-foreground"
                onClick={onEdit}
                aria-label="Edit message"
              >
                <Edit2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full hover:bg-accent hover:text-accent-foreground",
                isCopied && "text-green-500",
              )}
              onClick={onCopy}
              aria-label="Copy message"
            >
              {isCopied ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
          </div>
        )}
      </div>

      {isUser && (
        <Avatar aria-label="You" className="h-9 w-9 mt-1 shrink-0">
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
