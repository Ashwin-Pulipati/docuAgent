"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Upload,
  FileText,
  MessageSquare,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = Readonly<{
  id: string;
  title: string;
  description: React.ReactNode;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconClassName: string;
  iconWrapClassName: string;
}>;

const STEPS: readonly Step[] = [
  {
    id: "upload",
    title: "Upload documents",
    description: (
      <>
        Upload PDF documents or entire folders from the sidebar. DocuAgent will
        process and index them for fast retrieval.
      </>
    ),
    Icon: Upload,
    iconClassName: "h-4 w-4",
    iconWrapClassName: "bg-primary/10 text-primary",
  },
  {
    id: "context",
    title: "Select context",
    description: (
      <>
        Click a document to chat with it, or select a folder to start a{" "}
        <span className="font-semibold text-foreground">folder-level chat</span>{" "}
        across all documents inside.
      </>
    ),
    Icon: FileText,
    iconClassName: "h-4 w-4",
    iconWrapClassName: "bg-secondary/10 text-secondary",
  },
  {
    id: "manage",
    title: "Manage conversations",
    description: (
      <>
        Use the <span className="font-semibold text-foreground">(⋮) menu</span>{" "}
        to rename, organize, and switch between threads. Keep your workspace
        clean with the collapsible sidebar.
      </>
    ),
    Icon: MessageSquare,
    iconClassName: "h-4 w-4",
    iconWrapClassName: "bg-accent/10 text-accent",
  },
  {
    id: "citations",
    title: "Use citations & page numbers",
    description: (
      <>
        Answers include color-coded citations. Hover to preview the exact quote,
        and use the page number for quick reference.
      </>
    ),
    Icon: Quote,
    iconClassName: "h-4 w-4",
    iconWrapClassName: "bg-chart-4/10 text-chart-4",
  },
] as const;

function StepRow({
  step,
  index,
}: {
  readonly step: Step;
  readonly index: number;
}) {
  return (
    <li
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-border/50 bg-card/30 p-4",
        "shadow-sm backdrop-blur-sm",
        "focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
          step.iconWrapClassName,
          "ring-1 ring-border/50",
        )}
        aria-hidden="true"
      >
        <step.Icon className={cn(step.iconClassName)} />
      </div>

      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-semibold leading-none tracking-tight text-foreground">
          <span className="mr-2 text-muted-foreground">{index + 1}.</span>
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>
    </li>
  );
}

export function HowToUseDialog(): React.JSX.Element {
  const titleId = React.useId();
  const descId = React.useId();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            "neo-glass",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "hover:bg-accent/10 hover:text-accent",
          )}
          aria-label="How to use DocuAgent"
          title="How to use"
        >
          <HelpCircle className="size-4.5!" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "sm:max-w-2xl",
          "glass-card border-border/50 bg-card/95 backdrop-blur-xl",
          "rounded-2xl",
          "focus:outline-none",
        )}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle
            id={titleId}
            className="text-3xl font-bold text-gradient"
          >
            How to use DocuAgent
          </DialogTitle>
          <DialogDescription id={descId} className="text-muted-foreground">
            Get the most out of your AI-powered document assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <ul
            className="grid gap-3"
            role="list"
            aria-label="Getting started steps"
          >
            {STEPS.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} />
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}