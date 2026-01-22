"use client";

import ThemeToggle from "@/components/theme-toggle";
import { HowToUseDialog } from "@/components/how-to-use-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-card/30 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        
          <SidebarTrigger />
        

        <div className="h-6 w-px bg-border/50 mx-1" />

        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        >
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 p-1.5 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
            <Image
              src="/logo.png"
              alt="DocuAgent Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-display font-bold leading-none tracking-tight text-gradient brightness-75">
              DocuAgent
            </h1>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Agentic RAG
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <HowToUseDialog />
        <ThemeToggle />
      </div>
    </header>
  );
}
