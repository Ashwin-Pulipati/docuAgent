import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { JobStatusResponse, AgenticResult } from "@/lib/api";
import { AgenticResultSchema } from "./api";

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

const colors = [
  "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20",
  "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
  "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20 hover:bg-lime-500/20",
  "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
  "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
  "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/20",
  "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 hover:bg-pink-500/20",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
];

export function getStringColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function isDoneStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return (
    v.includes("completed") ||
    v.includes("success") ||
    v.includes("succeeded") ||
    v.includes("finished")
  );
}

export function isFailedStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return v.includes("failed") || v.includes("cancel");
}

export function parseAgenticOutput(
  output: JobStatusResponse["output"],
): AgenticResult | null {
  if (!output || typeof output !== "object") return null;
  const parsed = AgenticResultSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}


export function statusTone(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeStatus(status);
  if (s === "ingested" || s === "completed") return "secondary";
  if (s === "failed") return "destructive";
  if (s === "uploaded") return "outline";
  return "default";
}

export function onlyPdfFiles(files: File[]): {
  valid: File[];
  skipped: number;
} {
  const valid = files.filter(
    (f) =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
  );
  return { valid, skipped: files.length - valid.length };
}

interface FileWithPath extends File {
  webkitRelativePath: string;
}

export function inferFolderName(files: File[]): string | undefined {
  const file = files.find(
    (f) => (f as FileWithPath).webkitRelativePath,
  ) as FileWithPath | undefined;
  
  const path = file?.webkitRelativePath;
  if (!path) return undefined;
  return path.split("/")[0];
}

