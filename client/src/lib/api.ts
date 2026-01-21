import { z } from "zod";

export const FolderSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});
export type Folder = z.infer<typeof FolderSchema>;

export const DocumentSchema = z.object({
  doc_id: z.string(),
  name: z.string(),
  status: z.string(),
  folder_id: z.number().nullable().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const UploadResponseSchema = z.object({
  doc_id: z.string(),
  created_new: z.boolean(),
  ingest_event_id: z.string(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

export const AgenticResultSchema = z.object({
// ... (keep as is)
  intent: z.enum(["qa", "summarize", "extract", "clarify"]),
  answer: z.string().optional().default(""),
  citations: z
    .array(
      z.object({
        chunk_id: z.string(),
        source: z.string(),
        quote: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  sources: z.array(z.string()).optional().default([]),
  needs_clarification: z.boolean().optional().default(false),
  clarifying_question: z.string().nullable().optional(),
  num_contexts: z.number().optional().default(0),
});
export type AgenticResult = z.infer<typeof AgenticResultSchema>;

export const JobStatusResponseSchema = z.object({
  status: z.string(),
  output: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.record(z.string(), z.unknown()).nullable().optional(),
  run_id: z.string().nullable().optional(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

export const QueryResponseSchema = z.object({
  query_event_id: z.string(),
});
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000";

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function listFolders(): Promise<Folder[]> {
  const res = await fetch(`${API_BASE_URL}/folders`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = await res.json();
  return z.array(FolderSchema).parse(data);
}

export async function createFolder(name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE_URL}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  const data = await res.json();
  return FolderSchema.parse(data);
}

export async function updateFolder(folderId: number, name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update folder");
  const data = await res.json();
  return FolderSchema.parse(data);
}

export async function deleteFolder(folderId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return z.array(DocumentSchema).parse(data);
}

export async function uploadDocuments(files: File[], folderId?: number, folderName?: string): Promise<UploadResponse[]> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  if (folderId) formData.append("folder_id", folderId.toString());
  if (folderName) formData.append("folder_name", folderName);

  const res = await fetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await safeJson(res);
    if (typeof err === "object" && err && "detail" in err) {
      throw new Error(
        String((err as { detail?: unknown }).detail ?? "Upload failed"),
      );
    }
    throw new Error("Failed to upload documents");
  }

  const data = await res.json();
  return z.array(UploadResponseSchema).parse(data);
}

export async function updateDocument(docId: string, updates: { name?: string; folder_id?: number | null }): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
  });
  if (!res.ok) {
      const err = await safeJson(res);
      if (typeof err === "object" && err && "detail" in err) {
        throw new Error(String((err as { detail?: unknown }).detail ?? "Update failed"));
      }
      throw new Error("Failed to update document");
  }
}

export async function postQuery(
  question: string,
  doc_id: string | null,
  top_k = 6,
  folder_id: number | null = null,
): Promise<QueryResponse> {
  const payload: { question: string; doc_id?: string | null; top_k?: number; folder_id?: number | null } =
    {
      question,
      top_k,
    };
  if (doc_id) payload.doc_id = doc_id;
  if (folder_id) payload.folder_id = folder_id;

  const res = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    if (typeof err === "object" && err && "detail" in err) {
      throw new Error(
        String((err as { detail?: unknown }).detail ?? "Query failed"),
      );
    }
    throw new Error("Failed to post query");
  }

  const data = await res.json();
  return QueryResponseSchema.parse(data);
}

export async function getJobStatus(
  eventId: string,
): Promise<JobStatusResponse> {
// ... (keep as is)
  const res = await fetch(`${API_BASE_URL}/jobs/${eventId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch job status");
  const data = await res.json();
  return JobStatusResponseSchema.parse(data);
}
