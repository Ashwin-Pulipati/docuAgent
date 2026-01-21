import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeStatus(s: string): string {
  return (s || "").toLowerCase();
}

export function friendlyStatus(status: string): string {
  const s = normalizeStatus(status);
  if (s === "ingested" || s === "completed") return "Ready";
  if (s === "ingesting" || s === "processing") return "Processing";
  if (s === "uploaded") return "Queued";
  if (s === "failed") return "Error";
  return s;
}
