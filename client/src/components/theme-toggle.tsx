"use client";

import { Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMedia } from "react-use";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;

type ThemeId = (typeof THEME_OPTIONS)[number]["id"];
type ThemeOption = Readonly<(typeof THEME_OPTIONS)[number]>;

type ThemeToggleButtonProps = Readonly<{
  id: ThemeId;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onSelect: (id: ThemeId) => void;
}>;

function ThemeToggleButton({
  id,
  label,
  Icon,
  active,
  onSelect,
}: ThemeToggleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          role="radio"
          aria-checked={active}
          aria-label={`Switch to ${label} theme`}
          onClick={() => onSelect(id)}
          className={cn(
            "h-9 w-9 rounded-full focus-visible:ring-2 focus-visible:ring-ring",
            active && "bg-primary/10 text-primary transition-colors",
          )}
        >
          <Icon className="h-4 w-4 text-current" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="rounded-full text-xs font-medium"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();
  const { isMobile, state } = useSidebar();
  const isMd = useMedia("(min-width: 768px) and (max-width: 1024px)", false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const currentTheme = useMemo<ThemeId>(() => {
    const resolved = (theme ?? systemTheme ?? "system") as ThemeId;
    return THEME_OPTIONS.some((o) => o.id === resolved) ? resolved : "system";
  }, [theme, systemTheme]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const index = THEME_OPTIONS.findIndex((opt) => opt.id === currentTheme);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (index + delta + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    setTheme(THEME_OPTIONS[nextIndex].id);
  };

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-2" aria-hidden="true">
        {THEME_OPTIONS.map((o) => (
          <div
            key={o.id}
            className="h-9 w-9 rounded-full bg-muted-foreground/15 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isMobile || (isMd && state === "expanded")) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Change theme"
            className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Palette className="h-5 w-5 text-current" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-44 p-1 glass-card">
          {THEME_OPTIONS.map(({ id, label, Icon }: ThemeOption) => {
            const active = currentTheme === id;

            return (
              <DropdownMenuItem
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "group cursor-pointer rounded-md transition-colors",
                  active
                    ? "bg-primary/10 text-primary focus:bg-primary focus:text-primary"
                    : "bg-transparent text-foreground hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent",
                )}
              >
                <Icon
                  className={cn(
                    "mr-2 h-4 w-4",
                    active
                      ? "text-current"
                      : "text-muted-foreground group-hover:text-current",
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm">{label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div
        role="radiogroup"
        aria-label="Theme selection"
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center gap-1 rounded-full p-1 gradient-border",
        )}
      >
        {THEME_OPTIONS.map(({ id, label, Icon }: ThemeOption) => (
          <ThemeToggleButton
            key={id}
            id={id}
            label={label}
            Icon={Icon}
            active={currentTheme === id}
            onSelect={setTheme}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
