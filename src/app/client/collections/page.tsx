"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Controls, MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { formatDateTime, formatNumber } from "@/lib/portal";
import { useClientPortalData } from "@/lib/client-data";

export default function ClientCollectionsPage() {
  const { session, sessionLoading, loading, error, collections, refresh } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const summary = useMemo(() => {
    const totalKg = collections.reduce((sum, item) => sum + Number(item.weightKg), 0);
    const totalBins = collections.reduce((sum, item) => sum + Number(item.binCount || 0), 0);
    const lastCollection = collections[0]?.collectionTime;

    return { totalKg, totalBins, lastCollection };
  }, [collections]);

  const rows = useMemo(() => {
    return collections.filter((item) => {
      const haystack = `${item.manifestNo} ${item.wasteType} ${item.notes ?? ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.syncStatus === filter;
      return matchesSearch && matchesFilter;
    });
  }, [collections, filter, search]);

  if (sessionLoading || (loading && !collections.length && !error)) {
    return <RouteLoading label="Loading collection history..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open collections." />;
  }

  if (error && !collections.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Collections"
      description="A dedicated collection history page with search, status filters, and an operational record table."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Collections" },
      ]}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh collections</span>
        </button>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total KG"
          value={formatNumber(summary.totalKg)}
          detail={`${collections.length} collection records`}
        />
        <MetricCard
          title="Total Bins"
          value={formatNumber(summary.totalBins)}
          detail="Captured from completed service entries"
        />
        <MetricCard
          title="Last Collection"
          value={summary.lastCollection ? formatDateTime(summary.lastCollection) : "N/A"}
          detail="Most recent collection timestamp"
        />
      </section>

      <Controls
        filterOptions={["All", "SYNCED", "PENDING", "FAILED"]}
        filterValue={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        searchPlaceholder="Search by manifest, waste type, or notes"
        searchValue={search}
      />

      <TableShell
        empty="No collection records match the current filters."
        head={["Manifest", "Date", "KG", "Bins", "Waste Type", "Sync Status", "Notes"]}
        loading={loading && !collections.length}
        rows={rows.map((item) => [
          item.manifestNo,
          formatDateTime(item.collectionTime),
          formatNumber(item.weightKg),
          formatNumber(item.binCount),
          item.wasteType,
          item.syncStatus,
          item.notes || "No notes",
        ])}
      />
    </PageScaffold>
  );
}
