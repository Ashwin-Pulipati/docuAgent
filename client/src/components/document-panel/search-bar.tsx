"use client";

import * as React from "react";
import { SidebarInput } from "@/components/ui/sidebar";
import { Search } from "lucide-react";

type Props = Readonly<{
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}>;

export function SearchBar({ value, onChange, disabled }: Props) {
  return (
    <div className="relative flex-1">
      <Search
        className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
      <SidebarInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        disabled={disabled}
        className="pl-8"
        aria-label="Search documents and folders"
      />
    </div>
  );
}
