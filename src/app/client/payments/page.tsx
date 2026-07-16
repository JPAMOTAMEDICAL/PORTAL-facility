"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Eye,
  Landmark,
  ReceiptText,
  RefreshCw,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
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
  buildDocumentUrl,
  deleteUploadedDocument,
  uploadDocument,
  type UploadedDocument,
} from "@/lib/documents";
import { apiFetch, formatCurrency, formatDateTime } from "@/lib/portal";

export default function ClientPayments() {
  const {
    session,
    sessionLoading,
    loading,
    error,
    payments,
    receipts,
    bankAccounts,
    invoices,
    refresh,
  } = useClientPortalData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<"BANK_TRANSFER" | "PAYSTACK">(
    "BANK_TRANSFER",
  );
  const [uploadedProof, setUploadedProof] = useState<UploadedDocument | null>(null);
  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    reference: "",
    notes: "",
  });

  const stats = useMemo(() => {
    const total = payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const verified = payments.filter((item) => item.status === "VERIFIED").length;
    const pending = payments.filter((item) => item.status !== "VERIFIED").length;
    return { total, verified, pending, receipts: receipts.length };
  }, [payments, receipts.length]);

  const rows = useMemo(() => {
    return payments.filter((item) => {
      const haystack =
        `${item.reference} ${item.method} ${item.invoice?.invoiceNo ?? ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, payments, search]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === form.invoiceId) ?? null,
    [form.invoiceId, invoices],
  );

  const verifiedTotalForInvoice = useMemo(() => {
    if (!selectedInvoice) {
      return 0;
    }

    return payments
      .filter(
        (payment) =>
          payment.invoiceId === selectedInvoice.id && payment.status === "VERIFIED",
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  }, [payments, selectedInvoice]);

  const remainingBalance = selectedInvoice
    ? Math.max(0, Number(selectedInvoice.amountDue) - verifiedTotalForInvoice)
    : 0;
  const amountValue = Number(form.amount || 0);
  const amountValidationError = form.amount
    ? getAmountValidationMessage(amountValue, remainingBalance)
    : null;

  if (sessionLoading || (loading && !payments.length && !error)) {
    return <RouteLoading label="Loading payments..." />;
  }

  if (!session) {
    return (
      <RouteDenied message="A client facility session is required to open payments." />
    );
  }

  if (error && !payments.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  async function handleProofSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session) {
      return;
    }

    setUploadingProof(true);
    setUploadProgress(0);
    setLocalError(null);

    try {
      const nextProof = await uploadDocument({
        token: session.accessToken,
        facilityId: session.user.facilityId,
        category: "PAYMENT_PROOF",
        file,
        onProgress: setUploadProgress,
      });

      const previousProof = uploadedProof;
      setUploadedProof(nextProof);

      if (
        previousProof?.storedName &&
        previousProof.storedName !== nextProof.storedName
      ) {
        await deleteUploadedDocument(session.accessToken, previousProof.storedName).catch(
          () => undefined,
        );
      }
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the proof of payment.",
      );
    } finally {
      setUploadingProof(false);
      setUploadProgress(0);
    }
  }

  async function removeProof() {
    if (!session || !uploadedProof) {
      return;
    }

    setLocalError(null);
    try {
      if (uploadedProof.storedName) {
        await deleteUploadedDocument(session.accessToken, uploadedProof.storedName);
      }
      setUploadedProof(null);
    } catch (removeError) {
      setLocalError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the uploaded proof.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    setMessage(null);
    setPaystackUrl(null);

    try {
      if (amountValidationError) {
        throw new Error(amountValidationError);
      }

      if (method === "BANK_TRANSFER" && !uploadedProof) {
        throw new Error("Upload a proof of payment before submitting a bank transfer.");
      }

      if (method === "PAYSTACK") {
        const response = await apiFetch<{ authorizationUrl: string }>(
          "/payments/paystack/initialize",
          {
            method: "POST",
            body: JSON.stringify({
              invoiceId: form.invoiceId,
              amount: amountValue,
              callbackUrl: window.location.href,
              notes: form.notes,
            }),
          },
          session.accessToken,
        );
        setPaystackUrl(response.authorizationUrl);
        setMessage("Paystack payment initialized successfully.");
      } else {
        await apiFetch(
          "/payments",
          {
            method: "POST",
            body: JSON.stringify({
              invoiceId: form.invoiceId,
              amount: amountValue,
              method: "BANK_TRANSFER",
              notes: form.notes,
              reference: form.reference,
              proofOfPayment: uploadedProof,
            }),
          },
          session.accessToken,
        );
        setMessage(
          "Bank transfer submitted successfully and is now pending finance verification.",
        );
      }

      setForm({
        invoiceId: "",
        amount: "",
        reference: "",
        notes: "",
      });
      setUploadedProof(null);
      await refresh();
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScaffold
      title="Payments"
      description="Choose Paystack or manual bank transfer, upload a real proof of payment, and submit only within the invoice balance."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Payments" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/client/receipts"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          >
            <ReceiptText className="h-4 w-4" />
            <span>Receipt center</span>
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh payments</span>
          </button>
        </div>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {localError ? <RouteError message={localError} /> : null}
      {message ? (
        <div className="rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-[var(--shadow-card)]">
          <div>{message}</div>
          {paystackUrl ? (
            <a
              className="mt-2 inline-flex text-sm font-semibold text-emerald-800 underline"
              href={paystackUrl}
              rel="noreferrer"
              target="_blank"
            >
              Continue to Paystack
            </a>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Paid"
          value={formatCurrency(stats.total)}
          detail={`${payments.length} payment records`}
        />
        <MetricCard
          title="Verified"
          value={String(stats.verified)}
          detail="Payments confirmed by finance"
        />
        <MetricCard
          title="Pending Review"
          value={String(stats.pending)}
          detail="Awaiting verification or receipt generation"
        />
        <MetricCard
          title="Receipts"
          value={String(stats.receipts)}
          detail="Verified payments with generated receipts"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Make Payment
            </h2>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Payment Method
            </span>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as "BANK_TRANSFER" | "PAYSTACK")
              }
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="PAYSTACK">Paystack</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Invoice
            </span>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              value={form.invoiceId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  invoiceId: event.target.value,
                  amount:
                    invoices.find((invoice) => invoice.id === event.target.value)?.id ===
                    event.target.value
                      ? current.amount
                      : current.amount,
                }))
              }
            >
              <option value="">Select invoice</option>
              {invoices
                .filter((invoice) => invoice.status !== "PAID")
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNo} - {formatCurrency(invoice.amountDue)}
                  </option>
                ))}
            </select>
          </label>

          {selectedInvoice ? (
            <div className="grid gap-3 rounded-[var(--radius-card)] border border-orange-100 bg-orange-50/70 p-4 text-sm text-orange-900 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-orange-700">
                  Invoice
                </div>
                <div className="mt-1 font-semibold">{selectedInvoice.invoiceNo}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-orange-700">
                  Verified Paid
                </div>
                <div className="mt-1 font-semibold">
                  {formatCurrency(verifiedTotalForInvoice)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-orange-700">
                  Remaining Balance
                </div>
                <div className="mt-1 font-semibold">
                  {formatCurrency(remainingBalance)}
                </div>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Payment Amount
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter payment amount"
            />
          </label>

          {amountValidationError ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{amountValidationError}</span>
            </div>
          ) : null}

          {method === "BANK_TRANSFER" ? (
            <>
              <div className="rounded-[var(--radius-card)] border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <Landmark className="h-4 w-4" />
                  Available Bank Accounts
                </div>
                <div className="mt-3 space-y-2 text-sm text-emerald-900">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-2xl border border-emerald-100 bg-white px-4 py-3"
                    >
                      <div className="font-medium">{account.bankName}</div>
                      <div>{account.accountName}</div>
                      <div>{account.accountNumber}</div>
                      {account.isDefault ? (
                        <div className="mt-1 text-xs text-emerald-700">
                          Default bank
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--foreground)]">
                  Transfer Reference
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Enter bank transfer reference"
                />
              </label>

              <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      Proof of Payment
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Upload an image or PDF receipt for finance review.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleProofSelected}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingProof}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{uploadedProof ? "Replace file" : "Upload file"}</span>
                  </button>
                </div>

                {uploadingProof ? (
                  <div className="space-y-2">
                    <div className="text-sm text-[var(--muted)]">
                      Uploading proof: {uploadProgress}%
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-strong)]">
                      <div
                        className="h-2 rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {uploadedProof ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[var(--foreground)]">
                          {uploadedProof.originalName}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {uploadedProof.mimeType} • {formatFileSize(uploadedProof.size)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={buildDocumentUrl(uploadedProof.previewUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </a>
                        <button
                          type="button"
                          onClick={() => void removeProof()}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                    No proof uploaded yet.
                  </div>
                )}
              </div>
            </>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">
              Notes
            </span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Optional payment notes"
            />
          </label>

          <button
            className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={
              submitting ||
              uploadingProof ||
              !form.invoiceId ||
              !form.amount ||
              Boolean(amountValidationError) ||
              (method === "BANK_TRANSFER" && !uploadedProof)
            }
          >
            {submitting
              ? "Submitting..."
              : method === "PAYSTACK"
                ? "Initialize Paystack"
                : "Submit Bank Transfer"}
          </button>
        </form>

        <div className="space-y-4">
          <Controls
            filterOptions={[
              "All",
              "VERIFIED",
              "PENDING",
              "FAILED",
              "REJECTED",
              "CONFIRMATION_REQUIRED",
            ]}
            filterValue={filter}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            searchPlaceholder="Search payment reference or invoice"
            searchValue={search}
          />

          <TableShell
            empty="No payments match the selected filters."
            head={["Reference", "Date", "Method", "Amount", "Status", "Receipt"]}
            loading={loading && !payments.length}
            rows={rows.map((item) => [
              item.reference,
              formatDateTime(item.paymentDate),
              item.method,
              formatCurrency(item.amount),
              item.status,
              item.receiptNumber ? (
                <span key={item.id} className="text-sm text-[var(--primary)]">
                  {item.receiptNumber}
                </span>
              ) : (
                <span key={item.id} className="text-sm text-[var(--muted)]">
                  Pending
                </span>
              ),
            ])}
          />
        </div>
      </section>
    </PageScaffold>
  );
}

function getAmountValidationMessage(amount: number, remainingBalance: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter a valid amount greater than zero.";
  }

  if (remainingBalance <= 0) {
    return "The selected invoice has no remaining balance.";
  }

  if (amount > remainingBalance) {
    return `Payment amount cannot exceed the remaining balance of ${formatCurrency(
      remainingBalance,
    )}.`;
  }

  return null;
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
