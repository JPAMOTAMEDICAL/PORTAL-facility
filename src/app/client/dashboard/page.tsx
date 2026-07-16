"use client";

import { useMemo, useState } from "react";
import { Bell, RefreshCw, Sparkles } from "lucide-react";
import { MetricCard, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/portal";
import { useClientPortalData } from "@/lib/client-data";

export default function ClientDashboardPage() {
  const {
    session,
    loading,
    sessionLoading,
    error,
    facility,
    collections,
    invoices,
    payments,
    notifications,
    serviceMonitoring,
    recentActivity,
    refresh,
  } = useClientPortalData();
  const [activityFilter, setActivityFilter] = useState("All");

  const dashboardStats = useMemo(() => {
    const totalDue = invoices.reduce((sum, invoice) => sum + Number(invoice.amountDue), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalKg = collections.reduce((sum, collection) => sum + Number(collection.weightKg), 0);
    const unread = notifications.filter((item) => !item.readAt).length;
    const overdue = invoices.filter((item) => item.status === "OVERDUE").length;

    return { totalDue, totalPaid, totalKg, unread, overdue };
  }, [collections, invoices, notifications, payments]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === "All") {
      return recentActivity;
    }

    return recentActivity.filter((item) => item.status === activityFilter);
  }, [activityFilter, recentActivity]);

  const aiRecommendations = useMemo(() => {
    const suggestions = [];

    if ((serviceMonitoring?.missedCollections ?? 0) > 0) {
      suggestions.push("Schedule an immediate follow-up because your service monitoring shows a missed collection.");
    }
    if (dashboardStats.overdue > 0) {
      suggestions.push("Review overdue invoices and notify the finance contact to avoid service escalation.");
    }
    if (dashboardStats.unread > 0) {
      suggestions.push("Open unread notifications to stay current on delivery, complaint, and billing updates.");
    }
    if (!suggestions.length) {
      suggestions.push("Operations are stable. Keep monitoring invoices, collections, and notifications from this dashboard.");
    }

    return suggestions;
  }, [dashboardStats.overdue, dashboardStats.unread, serviceMonitoring?.missedCollections]);

  if (sessionLoading || (loading && !facility)) {
    return <RouteLoading label="Loading client dashboard..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open the dashboard." />;
  }

  if (error && !facility) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Client Dashboard"
      description="A dedicated overview page for KPIs, charts, recent activity, AI recommendations, and notifications."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Dashboard" },
      ]}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh dashboard</span>
        </button>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Outstanding Balance"
          value={formatCurrency(facility?.outstandingBalance)}
          detail={`${invoices.length} invoices in your billing view`}
          tone="red"
        />
        <MetricCard
          title="Collections"
          value={formatNumber(dashboardStats.totalKg)}
          detail={`${collections.length} logged collection records`}
          tone="green"
        />
        <MetricCard
          title="Payments"
          value={formatCurrency(dashboardStats.totalPaid)}
          detail={`${payments.length} payments recorded`}
          tone="green"
        />
        <MetricCard
          title="Service Score"
          value={`${serviceMonitoring?.slaScore ?? 0}%`}
          detail={`${serviceMonitoring?.serviceStatus ?? "UNKNOWN"} compliance state`}
          tone="orange"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Trend Overview</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Dedicated dashboard chart area for service, billing, and payment trends.
          </p>
          <div className="mt-5 space-y-4">
            {[
              { label: "Collections", value: collections.length, tone: "bg-[#0B5D3B]" },
              { label: "Invoices", value: invoices.length, tone: "bg-[#F97316]" },
              { label: "Payments", value: payments.length, tone: "bg-[#0B5D3B]" },
              { label: "Notifications", value: notifications.length, tone: "bg-[#111827]" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={`h-3 rounded-full ${item.tone}`}
                    style={{ width: `${Math.max(18, Math.min(item.value * 16, 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">AI Recommendations</h2>
          </div>
          <div className="mt-4 space-y-3">
            {aiRecommendations.map((item) => (
              <div key={item} className="rounded-2xl border border-orange-100 bg-gradient-to-r from-emerald-50 via-white to-orange-50 p-4 text-sm text-[var(--foreground)]">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Activity</h2>
            <select
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) => setActivityFilter(event.target.value)}
              value={activityFilter}
            >
              {["All", "SYNCED", "PENDING", "PAID", "OPEN", "RESOLVED", "GREEN", "AMBER", "RED"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <TableShell
            empty="No recent activity is available yet."
            head={["Activity", "Detail", "When", "Status"]}
            rows={filteredActivity.map((item) => [
              item.label,
              item.detail,
              formatDateTime(item.timestamp),
              item.status,
            ])}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Notifications</h2>
          </div>
          <TableShell
            empty="No notifications are currently available."
            head={["Title", "Channel", "Created", "Read"]}
            rows={notifications.slice(0, 6).map((item) => [
              item.title,
              item.channel,
              formatDateTime(item.createdAt),
              item.readAt ? "Read" : "Unread",
            ])}
          />
        </div>
      </section>
    </PageScaffold>
  );
}
