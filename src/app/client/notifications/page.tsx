"use client";

import { useMemo, useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";
import { Controls, MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { useClientPortalData } from "@/lib/client-data";
import { apiFetch, formatDateTime } from "@/lib/portal";

export default function ClientNotificationsPage() {
  const { session, sessionLoading, loading, error, notifications, refresh } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.readAt).length;
    return { unread };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      const haystack = `${item.title} ${item.message} ${item.channel}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter =
        filter === "All" ||
        (filter === "Unread" ? !item.readAt : Boolean(item.readAt));
      return matchesSearch && matchesFilter;
    });
  }, [filter, notifications, search]);

  async function markAsRead(id: string) {
    if (!session) {
      return;
    }

    setBusyId(id);
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" }, session.accessToken);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (sessionLoading || (loading && !notifications.length && !error)) {
    return <RouteLoading label="Loading notifications..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open notifications." />;
  }

  if (error && !notifications.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Notifications"
      description="A dedicated notification center with unread tracking, filters, and direct acknowledgement actions."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Notifications" },
      ]}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh notifications</span>
        </button>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Notifications"
          value={String(notifications.length)}
          detail="In-app and message-ready events"
        />
        <MetricCard
          title="Unread"
          value={String(stats.unread)}
          detail="Awaiting acknowledgement"
        />
        <MetricCard
          title="Latest Update"
          value={notifications[0] ? formatDateTime(notifications[0].createdAt) : "N/A"}
          detail="Most recent alert time"
        />
      </section>

      <Controls
        filterOptions={["All", "Unread", "Read"]}
        filterValue={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, message, or channel"
        searchValue={search}
      />

      <TableShell
        empty="No notifications match the current search or filter."
        head={["Title", "Message", "Channel", "Created", "Status", "Action"]}
        loading={loading && !notifications.length}
        rows={filtered.map((item) => [
          item.title,
          item.message,
          item.channel,
          formatDateTime(item.createdAt),
          item.readAt ? "Read" : "Unread",
          item.readAt ? (
            <span key={item.id} className="text-sm text-[var(--muted)]">
              Acknowledged
            </span>
          ) : (
            <button
              key={item.id}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyId === item.id}
              onClick={() => void markAsRead(item.id)}
              type="button"
            >
              <BellRing className="h-4 w-4" />
              <span>{busyId === item.id ? "Updating..." : "Mark read"}</span>
            </button>
          ),
        ])}
      />
    </PageScaffold>
  );
}
