"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Mail, RefreshCw } from "lucide-react";
import { Controls, MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { useClientPortalData } from "@/lib/client-data";
import { sendMail } from "@/lib/client-workflows";
import { downloadDocument } from "@/lib/documents";
import { formatCurrency, formatDate } from "@/lib/portal";

export default function ClientInvoices() {
  const { session, sessionLoading, loading, error, invoices, refresh } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [actionError, setActionError] = useState("");

  const stats = useMemo(() => {
    const outstanding = invoices.reduce((sum, item) => sum + Number(item.amountDue), 0);
    const overdue = invoices.filter((item) => item.status === "OVERDUE").length;
    const open = invoices.filter((item) => item.status === "OPEN" || item.status === "SENT").length;
    const paid = invoices.filter((item) => item.status === "PAID").length;
    return { outstanding, overdue, open, paid };
  }, [invoices]);

  const rows = useMemo(() => {
    return invoices.filter((item) => {
      const matchesSearch = item.invoiceNo.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, invoices, search]);

  if (sessionLoading || (loading && !invoices.length && !error)) {
    return <RouteLoading label="Loading invoices..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open invoices." />;
  }

  if (error && !invoices.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Invoices"
      description="A dedicated invoice page with searchable billing records, status filters, and export-ready actions."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Invoices" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={() =>
              sendMail(
                "Invoice summary",
                `Current outstanding total: ${formatCurrency(stats.outstanding)}`,
              )
            }
          >
            <Mail className="h-4 w-4" />
            <span>Email invoice summary</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh invoices</span>
          </button>
        </div>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {actionError ? <RouteError message={actionError} onRetry={() => setActionError("")} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Outstanding Total"
          value={formatCurrency(stats.outstanding)}
          detail={`${invoices.length} invoices in view`}
        />
        <MetricCard
          title="Open Invoices"
          value={String(stats.open)}
          detail="Awaiting payment confirmation"
        />
        <MetricCard
          title="Overdue Invoices"
          value={String(stats.overdue)}
          detail="Requires finance follow-up"
        />
        <MetricCard
          title="Paid Invoices"
          value={String(stats.paid)}
          detail="Already settled in the finance center"
        />
      </section>

      <Controls
        filterOptions={["All", "OPEN", "SENT", "PAID", "OVERDUE", "CANCELLED"]}
        filterValue={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice number"
        searchValue={search}
      />

      <TableShell
        empty="No invoices match the selected filters."
        head={["Invoice", "Period", "Due Date", "Amount", "Status", "Action"]}
        loading={loading && !invoices.length}
        rows={rows.map((item) => [
          item.invoiceNo,
          item.periodStart && item.periodEnd
            ? `${formatDate(item.periodStart)} to ${formatDate(item.periodEnd)}`
            : "Billing period recorded",
          formatDate(item.dueDate),
          formatCurrency(item.amountDue),
          item.status,
          <div key={item.id} className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!session?.accessToken) {
                  return;
                }

                void downloadDocument(
                  session.accessToken,
                  `/documents/invoices/${item.id}/download`,
                  `${item.invoiceNo}.pdf`,
                ).catch((requestError) => {
                  setActionError(
                    requestError instanceof Error
                      ? requestError.message
                      : "Unable to download the invoice PDF.",
                  );
                });
              }}
              className="inline-flex items-center gap-1 text-sm text-[var(--primary)]"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <Link href="/client/payments" className="text-sm text-[var(--primary)]">
              Pay now
            </Link>
          </div>,
        ])}
      />
    </PageScaffold>
  );
}
