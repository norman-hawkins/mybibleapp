"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StatusFilter = "ALL" | "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function MineFilters({
  counts,
}: {
  counts: { all: number; draft: number; pending: number; published: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const active = (sp.get("status") ?? "ALL").toUpperCase() as StatusFilter;
  const sort = sp.get("sort") ?? "newest";

  function setStatus(status: StatusFilter) {
    const next = new URLSearchParams(sp.toString());

    // preserve sort
    if (sort) next.set("sort", sort);

    if (status === "ALL") next.delete("status");
    else next.set("status", status);

    const url = next.toString() ? `${pathname}?${next.toString()}` : pathname;

    // Important: querystring navigation sometimes won't refetch server data without refresh
    router.push(url);
    router.refresh();
  }

  const items: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: "ALL", label: "All", count: counts.all },
    { key: "DRAFT", label: "Draft", count: counts.draft },
    { key: "PENDING_REVIEW", label: "Pending Review", count: counts.pending },
    { key: "PUBLISHED", label: "Published", count: counts.published },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const isActive =
            (it.key === "ALL" && (!sp.get("status") || active === "ALL")) || active === it.key;

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setStatus(it.key)}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-black bg-black text-white"
                  : "border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[#f6f6f4]"
              )}
            >
              <span>{it.label}</span>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  isActive ? "bg-white/15 text-white" : "bg-[#f6f6f4] text-[var(--muted)]"
                )}
              >
                {it.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}