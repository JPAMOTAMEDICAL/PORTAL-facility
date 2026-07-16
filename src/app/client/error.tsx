"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 shadow-[var(--shadow-card)]">
      <p>{error.message || "A client route error occurred."}</p>
      <button
        className="rounded-2xl border border-rose-200 bg-white px-4 py-2 font-medium transition hover:bg-rose-100"
        onClick={reset}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
