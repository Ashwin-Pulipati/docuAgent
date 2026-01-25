"use client";

import ThemeToggle from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Origami } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Header({ 
  userGender, 
  onUserGenderToggle 
}: { 
  readonly userGender: "male" | "female"; 
  readonly onUserGenderToggle: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 h-18 border-b border-border/50 bg-card/30 px-4 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between py-8">
        <div className="flex items-center gap-3">
            <SidebarTrigger />
          <div className="h-6 w-px bg-border/50 mx-1" />

          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl min-w-0"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-primary/20 via-secondary/20 to-accent/20 p-1.5 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onUserGenderToggle}
            className="hidden md:inline-flex h-10 w-10 rounded-full hover:bg-accent/10"
            aria-label={`Switch avatar (current: ${userGender})`}
          >
            <Avatar className="h-10 w-10 ring-1 ring-border/50">
              <AvatarImage src={`/${userGender}-user.png`} alt="User Avatar" />
              <AvatarFallback>
                 <Origami className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
