"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyPanel, MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { formatCurrency, formatDateTime } from "@/lib/portal";
import { useClientPortalData } from "@/lib/client-data";

export default function ClientProfilePage() {
  const { session, sessionLoading, loading, error, facility, serviceMonitoring, recentActivity, refresh } =
    useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const rows = useMemo(() => {
    return recentActivity.filter((item) => {
      const matchesSearch = `${item.label} ${item.detail}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, recentActivity, search]);

  if (sessionLoading || (loading && !facility)) {
    return <RouteLoading label="Loading client profile..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open the profile page." />;
  }

  if (error && !facility) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Facility Profile"
      description="An independent profile page for facility information, service health, and recent account activity."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Profile" },
      ]}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh profile</span>
        </button>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Facility Code"
          value={facility?.code ?? "N/A"}
          detail={facility?.type ?? "Facility type unavailable"}
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency(facility?.outstandingBalance)}
          detail={facility?.billingType ?? "Billing model unavailable"}
        />
        <MetricCard
          title="Compliance Rate"
          value={`${serviceMonitoring?.complianceRate ?? 0}%`}
          detail={`${serviceMonitoring?.serviceStatus ?? "UNKNOWN"} service state`}
        />
        <MetricCard
          title="Collection Frequency"
          value={facility?.collectionFrequency ?? "N/A"}
          detail={`Last service ${formatDateTime(serviceMonitoring?.lastCollectionDate)}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Facility Information</h2>
          {facility ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoTile label="Facility name" value={facility.name} />
              <InfoTile label="Contact person" value={facility.contactPerson} />
              <InfoTile label="Email" value={facility.email} />
              <InfoTile label="Phone" value={facility.phone} />
              <InfoTile label="Address" value={facility.address || "Not supplied"} />
              <InfoTile
                label="Location"
                value={[facility.city, facility.state, facility.lga].filter(Boolean).join(", ") || "Not supplied"}
              />
            </div>
          ) : (
            <EmptyPanel text="Facility profile details are not available." />
          )}
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Service Monitoring</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoTile label="SLA score" value={`${serviceMonitoring?.slaScore ?? 0}%`} />
            <InfoTile label="Compliance rate" value={`${serviceMonitoring?.complianceRate ?? 0}%`} />
            <InfoTile label="Missed collections" value={String(serviceMonitoring?.missedCollections ?? 0)} />
            <InfoTile label="Service status" value={serviceMonitoring?.serviceStatus ?? "UNKNOWN"} />
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search profile activity"
            value={search}
          />
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
            onChange={(event) => setFilter(event.target.value)}
            value={filter}
          >
            {["All", "SYNCED", "PAID", "OPEN", "PENDING", "RESOLVED"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <TableShell
          empty="No profile activity is available."
          head={["Activity", "Detail", "When", "Status"]}
          rows={rows.map((item) => [
            item.label,
            item.detail,
            formatDateTime(item.timestamp),
            item.status,
          ])}
        />
      </section>
    </PageScaffold>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}
