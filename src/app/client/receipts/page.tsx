"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Controls, MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { useClientPortalData } from "@/lib/client-data";
import { printHtmlDocument } from "@/lib/client-workflows";
import { downloadDocument } from "@/lib/documents";
import { formatCurrency, formatDateTime } from "@/lib/portal";

export default function ClientReceiptsPage() {
  const { session, sessionLoading, loading, error, receipts, refresh } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    return receipts.filter((item) => {
      const matchesSearch = `${item.receiptNumber ?? item.reference} ${item.reference} ${item.invoice?.invoiceNo ?? ""}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || (item.receiptDelivery?.status ?? item.status) === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, receipts, search]);

  if (sessionLoading || (loading && !receipts.length && !error)) {
    return <RouteLoading label="Loading receipts..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open receipts." />;
  }

  if (error && !receipts.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  async function downloadReceipt(id: string, receiptNo: string) {
    if (!session?.accessToken) {
      return;
    }

    try {
      await downloadDocument(
        session.accessToken,
        `/documents/receipts/${id}/download`,
        `${receiptNo}.pdf`,
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to download the receipt PDF.",
      );
    }
  }

  return (
    <PageScaffold
      title="Receipts"
      description="Track generated receipts, download confirmations, and verify delivery from the live finance system."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Receipts" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]" type="button">
            <Download className="h-4 w-4" />
            <span>Download receipt pack</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh receipts</span>
          </button>
        </div>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {actionError ? <RouteError message={actionError} onRetry={() => setActionError("")} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Generated Receipts"
          value={String(receipts.length)}
          detail="Verified receipts from the finance center"
        />
        <MetricCard
          title="Receipt Value"
          value={formatCurrency(receipts.reduce((sum, item) => sum + Number(item.amount), 0))}
          detail="Total value represented in receipt history"
        />
        <MetricCard
          title="Latest Receipt"
          value={receipts[0] ? formatDateTime(receipts[0].paymentDate) : "N/A"}
          detail="Most recent receipt issue date"
        />
      </section>

      <Controls
        filterOptions={["All", "SENT", "PENDING", "VERIFIED"]}
        filterValue={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipt number or invoice"
        searchValue={search}
      />

      <TableShell
        empty="No receipts match the current filter selection."
        head={["Receipt No", "Issued", "Invoice", "Amount", "Status", "Download"]}
        loading={loading && !receipts.length}
        rows={filtered.map((item) => [
          item.receiptNumber ?? item.reference,
          formatDateTime(item.paymentDate),
          item.invoice?.invoiceNo ?? "Invoice",
          formatCurrency(item.amount),
          item.receiptDelivery?.status ?? item.status,
          <div key={item.id} className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void downloadReceipt(
                  item.id,
                  item.receiptNumber ?? item.reference,
                )
              }
              className="text-sm font-medium text-[var(--primary)]"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() =>
                printHtmlDocument(
                  `Receipt ${item.receiptNumber ?? item.reference}`,
                  `<h1>${item.receiptNumber ?? item.reference}</h1><p>${item.invoice?.invoiceNo ?? "Invoice"}</p><p>${formatCurrency(item.amount)}</p>`,
                )
              }
              className="text-sm font-medium text-[var(--primary)]"
            >
              Print
            </button>
          </div>,
        ])}
      />
    </PageScaffold>
  );
}
