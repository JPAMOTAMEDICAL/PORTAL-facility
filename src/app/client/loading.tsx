export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-strong)]" />
      <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--surface-strong)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}
