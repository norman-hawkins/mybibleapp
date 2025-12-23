import Link from "next/link";

export default function Topbar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-semibold text-[var(--ink)]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {right}
        <Link
          href="/dashboard/commentary/new"
          className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm hover:bg-[#f6f6f4]"
        >
          New entry
        </Link>
        <Link
          href="/dashboard/review"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
        >
          Publish
        </Link>
      </div>
    </div>
  );
}