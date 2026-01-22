import { Button } from "@/components/ui/button";
import { Github, Linkedin } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 border-t border-border/50 bg-card/30 px-6 py-4 backdrop-blur-sm md:flex-row z-20">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        >
          <h1 className="font-display font-bold text-2xl text-gradient">
            DocuAgent
          </h1>
        </Link>
        <span className="border-l border-border/50 pl-2 text-xs text-muted-foreground">
          Agentic RAG Platform
        </span>
      </div>

      <span className="text-sm font-medium text-muted-foreground text-center">
        &copy; {new Date().getFullYear()} DocuAgent. Built for intelligence 🧠.
        All rights reserved.
      </span>

      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full bg-primary/10 text-primary transition-colors hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link
            href="https://github.com/Ashwin-Pulipati/DocuAgent"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="mr-2 h-4 w-4" /> Github
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full bg-secondary/10 text-secondary transition-colors hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link
            href="https://www.linkedin.com/in/ashwinpulipati/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
          </Link>
        </Button>
      </div>
    </footer>
  );
};

export default Footer;
