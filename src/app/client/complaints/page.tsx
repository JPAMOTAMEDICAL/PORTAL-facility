"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Eye, PlusCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  Controls,
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
  buildDocumentUrl,
  deleteUploadedDocument,
  uploadDocument,
  type UploadedDocument,
} from "@/lib/documents";
import { apiFetch, formatDateTime } from "@/lib/portal";

export default function ClientComplaintsPage() {
  const { session, sessionLoading, loading, error, complaints, refresh } =
    useClientPortalData();
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedDocument[]>([]);
  const [form, setForm] = useState({
    type: "SERVICE",
    priority: "MEDIUM",
    description: "",
  });

  const filtered = useMemo(() => {
    return complaints.filter((item) => {
      const haystack =
        `${item.reference} ${item.type} ${item.description}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [complaints, filter, search]);

  async function handleEvidenceSelected(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!selectedFiles.length || !session?.user.facilityId) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setLocalError(null);

    try {
      const uploadedItems: UploadedDocument[] = [];

      for (const file of selectedFiles) {
        const uploaded = await uploadDocument({
          token: session.accessToken,
          facilityId: session.user.facilityId,
          category: "COMPLAINT_EVIDENCE",
          file,
          onProgress: setUploadProgress,
        });
        uploadedItems.push(uploaded);
      }

      setAttachments((current) => [...current, ...uploadedItems]);
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "Complaint evidence upload failed.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function removeAttachment(index: number) {
    if (!session) {
      return;
    }

    const target = attachments[index];
    if (!target) {
      return;
    }

    setLocalError(null);
    try {
      if (target.storedName) {
        await deleteUploadedDocument(session.accessToken, target.storedName);
      }
      setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } catch (removeError) {
      setLocalError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the selected evidence file.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.facilityId) {
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    setMessage(null);

    try {
      await apiFetch(
        "/complaints",
        {
          method: "POST",
          body: JSON.stringify({
            facilityId: session.user.facilityId,
            submittedById: session.user.id,
            type: form.type,
            priority: form.priority,
            description: form.description,
            attachments,
          }),
        },
        session.accessToken,
      );
      setForm({ type: "SERVICE", priority: "MEDIUM", description: "" });
      setAttachments([]);
      setMessage("Complaint submitted successfully with its uploaded evidence.");
      await refresh();
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Complaint submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || (loading && !complaints.length && !error)) {
    return <RouteLoading label="Loading complaints..." />;
  }

  if (!session) {
    return (
      <RouteDenied message="A client facility session is required to open complaints." />
    );
  }

  if (error && !complaints.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Complaints"
      description="Submit service issues with real supporting uploads, then track review status from the same workspace."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Complaints" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={() => evidenceInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span>{attachments.length ? "Add more evidence" : "Upload evidence"}</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh complaints</span>
          </button>
        </div>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {localError ? <RouteError message={localError} /> : null}
      {message ? (
        <div className="rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-[var(--shadow-card)]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Create Complaint
            </h2>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Complaint type
            </span>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value }))
              }
              value={form.type}
            >
              {["SERVICE", "BILLING", "STAFF", "ENVIRONMENTAL", "OTHER"].map(
                (option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Priority
            </span>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value,
                }))
              }
              value={form.priority}
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Description
            </span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Describe the issue, service date, and required action."
              value={form.description}
            />
          </label>

          <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">
                  Supporting Evidence
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Upload photos, PDFs, or screenshots related to the complaint.
                </p>
              </div>
              <input
                ref={evidenceInputRef}
                className="hidden"
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleEvidenceSelected}
              />
              <button
                type="button"
                onClick={() => evidenceInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                <span>{attachments.length ? "Replace or add" : "Upload files"}</span>
              </button>
            </div>

            {uploading ? (
              <div className="space-y-2">
                <div className="text-sm text-[var(--muted)]">
                  Uploading evidence: {uploadProgress}%
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-strong)]">
                  <div
                    className="h-2 rounded-full bg-[var(--primary)] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {attachments.length ? (
              <div className="space-y-3">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.storedName ?? attachment.originalName}-${index}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                  >
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        {attachment.originalName}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {attachment.mimeType} • {formatFileSize(attachment.size)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={buildDocumentUrl(attachment.previewUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => void removeAttachment(index)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                No evidence uploaded yet. You can still submit a complaint without files.
              </div>
            )}
          </div>

          <button
            className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || uploading || !form.description.trim()}
            type="submit"
          >
            {submitting ? "Submitting..." : "Submit complaint"}
          </button>
        </form>

        <div className="space-y-4">
          <Controls
            filterOptions={[
              "All",
              "OPEN",
              "IN_PROGRESS",
              "RESOLVED",
              "ESCALATED",
              "CLOSED",
            ]}
            filterValue={filter}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            searchPlaceholder="Search complaints by reference, type, or description"
            searchValue={search}
          />
          <TableShell
            empty="No complaints match the current search or filter."
            head={[
              "Reference",
              "Type",
              "Priority",
              "Assigned",
              "Created",
              "Status",
            ]}
            loading={loading && !complaints.length}
            rows={filtered.map((item) => [
              item.reference,
              item.type,
              item.priority ?? "MEDIUM",
              item.assignedTo?.fullName ?? "Pending assignment",
              formatDateTime(item.createdAt),
              item.status,
            ])}
          />
        </div>
      </section>
    </PageScaffold>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
