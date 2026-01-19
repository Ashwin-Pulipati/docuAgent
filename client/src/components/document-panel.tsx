"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAsyncFn, useInterval } from "react-use";
import { toast } from "sonner";

import type { Document } from "@/lib/api";
import { getJobStatus, listDocuments, uploadDocument } from "@/lib/api";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  FileUp,
  RefreshCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type IngestJob = { docId: string; eventId: string };

function normalizeStatus(s: string): string {
  return (s || "").toLowerCase();
}

function statusTone(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeStatus(status);
  if (s === "ingested" || s === "completed") return "secondary";
  if (s === "failed") return "destructive";
  if (s === "uploaded") return "outline";
  return "default";
}

function isDoneStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return (
    v.includes("completed") ||
    v.includes("success") ||
    v.includes("succeeded") ||
    v.includes("finished")
  );
}

function isFailedStatus(s: string): boolean {
  const v = normalizeStatus(s);
  return v.includes("failed") || v.includes("cancel");
}

export function DocumentPanel({
  selectedDocument,
  setSelectedDocument,
}: {
  selectedDocument: Document | null;
  setSelectedDocument: (d: Document | null) => void;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [ingestJobs, setIngestJobs] = useState<Map<string, IngestJob>>(
    new Map(),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [{ loading: loadingDocs }, refresh] = useAsyncFn(async () => {
    const data = await listDocuments();
    setDocs(data);

            if (selectedDocument) {
                const updated =
                    data.find((d) => d.doc_id === selectedDocument.doc_id) ?? null;
                if (updated && (updated.doc_id !== selectedDocument.doc_id || updated.status !== selectedDocument.status)) {
                    setSelectedDocument(updated);
                }
            }  }, [selectedDocument, setSelectedDocument]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [docs, query]);

  const [{ loading: pollingIngest }, pollIngest] = useAsyncFn(
    async (docId: string, eventId: string) => {
      const st = await getJobStatus(eventId);
      const done = isDoneStatus(st.status);
      const failed = isFailedStatus(st.status);

      if (!done && !failed) return;

      setIngestJobs((prev) => {
        const next = new Map(prev);
        next.delete(docId);
        return next;
      });

      await refresh();

      if (failed) toast.error("Ingestion failed.");
      if (done) toast.success("Ingestion complete.");
    },
    [refresh],
  );

  useInterval(
    () => {
      ingestJobs.forEach((job) => void pollIngest(job.docId, job.eventId));
    },
    ingestJobs.size > 0 ? 2000 : null,
  );

  const [{ loading: uploading }, doUpload] = useAsyncFn(
    async (file: File) => {
      const res = await uploadDocument(file);
      toast.success(
        res.created_new
          ? "Uploaded. Starting ingestion…"
          : "Already uploaded. Using existing document.",
      );

      await refresh();

      const doc =
        (await listDocuments()).find((d) => d.doc_id === res.doc_id) ?? null;
              if (doc && (selectedDocument?.doc_id !== doc.doc_id || selectedDocument?.status !== doc.status)) {
                  setSelectedDocument(doc);
              }
      if (
        res.created_new &&
        res.ingest_event_id &&
        res.ingest_event_id !== "already_exists"
      ) {
        setIngestJobs((prev) =>
          new Map(prev).set(res.doc_id, {
            docId: res.doc_id,
            eventId: res.ingest_event_id,
          }),
        );
      }
    },
    [refresh, setSelectedDocument],
  );

  const busy = uploading || loadingDocs || pollingIngest;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">Documents</CardTitle>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={busy}
              aria-label="Refresh documents"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              aria-label="Upload PDF"
            >
              <FileUp className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (
                  f.type !== "application/pdf" &&
                  !f.name.toLowerCase().endsWith(".pdf")
                ) {
                  toast.error("Only PDF uploads are supported.");
                  return;
                }
                void doUpload(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          disabled={busy}
          aria-label="Search documents"
        />
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText
                  className="h-10 w-10 text-muted-foreground mb-3"
                  aria-hidden="true"
                />
                <div className="text-sm font-medium">No documents yet</div>
                <div className="text-sm text-muted-foreground">
                  Upload a PDF to start.
                </div>
              </div>
            ) : (
              filtered.map((d) => {
                const selected = selectedDocument?.doc_id === d.doc_id;
                const ingesting = ingestJobs.has(d.doc_id);

                return (
                  <button
                    key={d.doc_id}
                    type="button"
                    onClick={() => setSelectedDocument(d)}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-3 transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "bg-muted" : "hover:bg-muted/60",
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{d.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={statusTone(d.status)}
                            className="rounded-full"
                          >
                            {d.status}
                          </Badge>

                          {ingesting && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                              ingesting…
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 mt-0.5">
                        {normalizeStatus(d.status) === "failed" ? (
                          <AlertCircle
                            className="h-4 w-4 text-destructive"
                            aria-hidden="true"
                          />
                        ) : normalizeStatus(d.status) === "ingested" ||
                          normalizeStatus(d.status) === "completed" ? (
                          <CheckCircle2
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {docs.length} total • {filtered.length} shown
        </div>
        {busy ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            working…
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Ready</div>
        )}
      </CardFooter>
    </Card>
  );
}
