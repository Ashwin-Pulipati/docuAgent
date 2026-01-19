import { z } from "zod";

export const DocumentSchema = z.object({
  doc_id: z.string(),
  name: z.string(),
  status: z.string(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const UploadResponseSchema = z.object({
  doc_id: z.string(),
  created_new: z.boolean(),
  ingest_event_id: z.string(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

export const AgenticResultSchema = z.object({
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

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return z.array(DocumentSchema).parse(data);
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

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
    throw new Error("Failed to upload document");
  }

  const data = await res.json();
  return UploadResponseSchema.parse(data);
}

export async function postQuery(
  question: string,
  doc_id: string | null,
  top_k = 6,
): Promise<QueryResponse> {
  const payload: { question: string; doc_id?: string | null; top_k?: number } =
    {
      question,
      top_k,
    };
  if (doc_id) payload.doc_id = doc_id;

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
  const res = await fetch(`${API_BASE_URL}/jobs/${eventId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch job status");
  const data = await res.json();
  return JobStatusResponseSchema.parse(data);
}
