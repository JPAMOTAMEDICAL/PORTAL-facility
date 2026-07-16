"use client";

export function RouteLoading({ label = "Loading client workspace..." }: { label?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--muted)] shadow-[var(--shadow-card)]">
      {label}
    </div>
  );
}

export function RouteError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 shadow-[var(--shadow-card)]">
      <p>{message}</p>
      {onRetry ? (
        <button
          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 font-medium transition hover:bg-rose-100"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function RouteDenied({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-700 shadow-[var(--shadow-card)]">
      {message}
    </div>
  );
}
