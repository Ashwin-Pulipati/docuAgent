"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Upload, FileText, MessageSquare, Quote } from "lucide-react";

export function HowToUseDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="How to use">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl glass-card border-border/50 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-gradient font-bold">How to use DocuAgent</DialogTitle>
          <DialogDescription>
            Get the most out of your AI-powered document assistant.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">1. Upload Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload your PDF documents or entire folders using the sidebar. 
                DocuAgent will process and index them for quick retrieval.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">2. Select Context</h3>
              <p className="text-sm text-muted-foreground">
                Click on a document or a folder in the sidebar to set the context. 
                The AI will focus its answers on the selected content.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">3. Ask Questions</h3>
              <p className="text-sm text-muted-foreground">
                Chat naturally with your documents. Ask regarding specific details, 
                summaries, or comparisons.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
              <Quote className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">4. Citations & Page Numbers</h3>
              <p className="text-sm text-muted-foreground">
                Answers include color-coded citations. Hover over them to see the exact 
                quote, and check the page number for easy reference.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
