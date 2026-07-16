"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function PageScaffold({
  title,
  description,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  description?: string;
  breadcrumb: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-[var(--muted)]">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {item.href ? (
                <Link className="transition hover:text-[var(--foreground)] hover:underline" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              {index < breadcrumb.length - 1 ? <span className="mx-2">/</span> : null}
            </span>
          ))}
        </nav>
        {actions}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Controls({
  searchPlaceholder = "Search records",
  searchValue,
  onSearchChange,
  filterLabel = "Filter",
  filterValue,
  filterOptions,
  onFilterChange,
}: {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterLabel?: string;
  filterValue: string;
  filterOptions: string[];
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      <input
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        value={searchValue}
      />
      <label className="block">
        <span className="sr-only">{filterLabel}</span>
        <select
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
          onChange={(event) => onFilterChange(event.target.value)}
          value={filterValue}
        >
          {filterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  tone = "green",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "green" | "orange" | "red" | "neutral";
}) {
  const toneStyles = {
    green: "from-emerald-50 to-white border-emerald-100",
    orange: "from-orange-50 to-white border-orange-100",
    red: "from-rose-50 to-white border-rose-100",
    neutral: "from-slate-50 to-white border-slate-200",
  }[tone];

  return (
    <article className={`rounded-[var(--radius-card)] border bg-gradient-to-br ${toneStyles} p-5 shadow-[var(--shadow-card)]`}>
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{value}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}

export function TableShell({
  head,
  rows,
  loading,
  empty,
}: {
  head: string[];
  rows: Array<ReactNode[]>;
  loading?: boolean;
  empty?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-strong)]" />
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded bg-[var(--surface-strong)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-5 py-8 text-sm text-[var(--muted)]">
        {empty || "No records available."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
              {head.map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <tr key={rowIndex} className="border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-muted)]/70">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-[var(--foreground)]">
                    {renderTableCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
        <span>Page 1 of 1</span>
        <div className="flex gap-2">
          <button className="rounded-2xl border border-[var(--border)] px-3 py-1.5 transition hover:bg-[var(--surface-muted)]" type="button">
            Prev
          </button>
          <button className="rounded-2xl border border-[var(--border)] px-3 py-1.5 transition hover:bg-[var(--surface-muted)]" type="button">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-5 py-8 text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function renderTableCell(value: ReactNode) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  const statusStyles: Record<string, string> = {
    SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    GREEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-orange-200 bg-orange-50 text-orange-700",
    OPEN: "border-orange-200 bg-orange-50 text-orange-700",
    AMBER: "border-orange-200 bg-orange-50 text-orange-700",
    IN_PROGRESS: "border-orange-200 bg-orange-50 text-orange-700",
    DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
    ARCHIVED: "border-slate-200 bg-slate-100 text-slate-700",
    READ: "border-slate-200 bg-slate-100 text-slate-700",
    UNREAD: "border-violet-200 bg-violet-50 text-violet-700",
    OVERDUE: "border-rose-200 bg-rose-50 text-rose-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
    RED: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const style = statusStyles[normalized];
  if (!style) {
    return value;
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      {value}
    </span>
  );
}
