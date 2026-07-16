"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, RefreshCw } from "lucide-react";
import {
  Controls,
  MetricCard,
  PageScaffold,
  TableShell,
} from "@/components/client/Scaffold";
import {
  RouteDenied,
  RouteError,
  RouteLoading,
} from "@/components/client/RouteState";
import { useClientPortalData } from "@/lib/client-data";
import {
  downloadDocument,
  fetchDocumentBlob,
  type FacilityDocument,
} from "@/lib/documents";
import { apiFetch, formatDateTime } from "@/lib/portal";

export default function ClientDocumentsPage() {
  const { session, sessionLoading, loading, error, refresh } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [documents, setDocuments] = useState<FacilityDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!session?.user.facilityId) {
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);
    try {
      const response = await apiFetch<FacilityDocument[]>(
        `/documents?facilityId=${encodeURIComponent(session.user.facilityId)}`,
        undefined,
        session.accessToken,
      );
      setDocuments(response);
      setSelectedDocumentId((current) => current ?? response[0]?.id ?? null);
      setDocumentsError(null);
    } catch (requestError) {
      setDocumentsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the document center.",
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDocuments, session]);

  const filtered = useMemo(() => {
    return documents.filter((item) => {
      const haystack =
        `${item.type} ${item.title} ${item.fileName} ${item.detail}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [documents, filter, search]);

  const selectedDocument = useMemo(
    () => filtered.find((item) => item.id === selectedDocumentId) ?? filtered[0] ?? null,
    [filtered, selectedDocumentId],
  );

  useEffect(() => {
    if (!session?.accessToken || !selectedDocument?.previewUrl) {
      setPreviewError(null);
      setPreviewLoading(false);
      setPreviewUrl((current) => {
        if (current) {
          window.URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let active = true;
    let nextObjectUrl: string | null = null;

    setPreviewLoading(true);
    setPreviewError(null);

    void fetchDocumentBlob(session.accessToken, selectedDocument.previewUrl)
      .then((blob) => {
        if (!active) {
          return;
        }

        nextObjectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl((current) => {
          if (current) {
            window.URL.revokeObjectURL(current);
          }
          return nextObjectUrl;
        });
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setPreviewUrl((current) => {
          if (current) {
            window.URL.revokeObjectURL(current);
          }
          return null;
        });
        setPreviewError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to preview the selected document.",
        );
      })
      .finally(() => {
        if (active) {
          setPreviewLoading(false);
        }
      });

    return () => {
      active = false;
      if (nextObjectUrl) {
        window.URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [selectedDocument?.previewUrl, session?.accessToken]);

  const handleDownload = useCallback(
    async (document: FacilityDocument) => {
      if (!session?.accessToken) {
        return;
      }

      try {
        await downloadDocument(
          session.accessToken,
          document.downloadUrl,
          document.fileName,
        );
      } catch (requestError) {
        setDocumentsError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to download the selected document.",
        );
      }
    },
    [session?.accessToken],
  );

  const handleOpenPreview = useCallback(() => {
    if (!previewUrl) {
      return;
    }

    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      invoices: documents.filter((item) => item.type === "INVOICE").length,
      receipts: documents.filter((item) => item.type === "RECEIPT").length,
      uploads: documents.filter(
        (item) =>
          item.type === "PAYMENT_PROOF" || item.type === "COMPLAINT_EVIDENCE",
      ).length,
    };
  }, [documents]);

  if (sessionLoading || (loading && !session)) {
    return <RouteLoading label="Loading documents..." />;
  }

  if (!session) {
    return (
      <RouteDenied message="A client facility session is required to open documents." />
    );
  }

  if (error && !documents.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Documents"
      description="Browse invoice PDFs, receipts, payment proofs, and complaint evidence from the backend document endpoints."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Documents" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {selectedDocument ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
              onClick={() => void handleDownload(selectedDocument)}
            >
              <Download className="h-4 w-4" />
              <span>Download selected</span>
            </button>
          ) : null}
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            onClick={() => {
              void refresh();
              void loadDocuments();
            }}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh documents</span>
          </button>
        </div>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {documentsError ? (
        <RouteError message={documentsError} onRetry={() => void loadDocuments()} />
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Documents"
          value={String(stats.total)}
          detail="Records returned by the document API"
        />
        <MetricCard
          title="Invoices"
          value={String(stats.invoices)}
          detail="Generated invoice PDFs"
        />
        <MetricCard
          title="Receipts"
          value={String(stats.receipts)}
          detail="Verified receipt documents"
        />
        <MetricCard
          title="Uploads"
          value={String(stats.uploads)}
          detail="Payment proofs and complaint evidence"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Controls
            filterOptions={[
              "All",
              "INVOICE",
              "RECEIPT",
              "PAYMENT_PROOF",
              "COMPLAINT_EVIDENCE",
            ]}
            filterValue={filter}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, file name, or detail"
            searchValue={search}
          />

          <TableShell
            empty="No documents match the selected search or filter."
            head={["Type", "Title", "Created", "Detail", "Status", "Action"]}
            loading={documentsLoading}
            rows={filtered.map((item) => [
              item.type,
              item.title,
              formatDateTime(item.createdAt),
              item.detail,
              item.status,
              <div key={item.id} className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocumentId(item.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(item)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>,
            ])}
          />
        </div>

        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Preview</h2>
          {selectedDocument ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">
                  {selectedDocument.fileName}
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {selectedDocument.type} • {selectedDocument.detail}
                </div>
              </div>

              {previewError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {previewError}
                </div>
              ) : previewLoading ? (
                <div className="flex h-[32rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--muted)]">
                  Loading preview...
                </div>
              ) : selectedDocument.mimeType.startsWith("image/") && previewUrl ? (
                <img
                  alt={selectedDocument.fileName}
                  className="max-h-[28rem] w-full rounded-2xl border border-[var(--border)] object-contain"
                  src={previewUrl}
                />
              ) : (
                <iframe
                  title={selectedDocument.fileName}
                  src={previewUrl ?? ""}
                  className="h-[32rem] w-full rounded-2xl border border-[var(--border)] bg-white"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={!previewUrl}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                >
                  <Eye className="h-4 w-4" />
                  Open in new tab
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(selectedDocument)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)]"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
              Select a document to preview it here.
            </div>
          )}
        </article>
      </section>
    </PageScaffold>
  );
}
