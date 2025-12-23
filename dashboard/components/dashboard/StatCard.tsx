import Link from "next/link";

export default function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const CardInner = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:shadow-md">
      <div className="text-xs font-semibold text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{value}</div>
      {hint ? (
        <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div>
      ) : null}
      {href ? (
        <div className="mt-3 text-xs font-semibold text-[var(--muted)]">
          View →
        </div>
      ) : null}
    </div>
  );

  if (!href) return CardInner;

  return (
    <Link
      href={href}
      className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10"
    >
      {CardInner}
    </Link>
  );
}