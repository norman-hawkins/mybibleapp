export const dynamic = "force-dynamic";
export const revalidate = 0;

import MineFilters from "@/components/dashboard/MineFilters";
import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

type StatusFilter = "ALL" | "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";
type SortFilter = "newest" | "oldest";

function safeStatus(v: any): StatusFilter {
  const x = String(v ?? "ALL").toUpperCase();
  if (x === "DRAFT") return "DRAFT";
  if (x === "PENDING_REVIEW") return "PENDING_REVIEW";
  if (x === "PUBLISHED") return "PUBLISHED";
  return "ALL";
}

function safeSort(v: any): SortFilter {
  const x = String(v ?? "newest").toLowerCase();
  return x === "oldest" ? "oldest" : "newest";
}

function toDbStatus(s: StatusFilter): CommentaryStatus | null {
  if (s === "ALL") return null;
  return s as CommentaryStatus;
}

function statusBadgeColor(s: CommentaryStatus) {
  switch (s) {
    case "DRAFT":
      return "bg-[#f6f6f4] text-[var(--muted)] border-[var(--border)]";
    case "PENDING_REVIEW":
      return "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]";
    case "PUBLISHED":
      return "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]";
    case "REJECTED":
      return "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]";
    default:
      return "bg-[#f6f6f4] text-[var(--muted)] border-[var(--border)]";
  }
}

export default async function MinePage(props: {
  searchParams?: { status?: string; sort?: string } | Promise<{ status?: string; sort?: string }>;
}) {
  const searchParams = await Promise.resolve(props.searchParams ?? {});
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Not signed in</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          Please sign in to view your commentary.
        </div>
        <Link
          href="/signin"
          className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  const userId = (session.user as any).id as string;

  const statusFilter = safeStatus(searchParams.status);
  const sort = safeSort(searchParams.sort);
  const dbStatus = toDbStatus(statusFilter);

  const orderBy =
    sort === "oldest"
      ? ({ updatedAt: "asc" } as const)
      : ({ updatedAt: "desc" } as const);

  const [allCount, draftCount, pendingCount, publishedCount] = await Promise.all([
    prisma.commentary.count({ where: { authorId: userId } }),
    prisma.commentary.count({ where: { authorId: userId, status: "DRAFT" } }),
    prisma.commentary.count({ where: { authorId: userId, status: "PENDING_REVIEW" } }),
    prisma.commentary.count({ where: { authorId: userId, status: "PUBLISHED" } }),
  ]);

  const rows = await prisma.commentary.findMany({
    where: {
      authorId: userId,
      ...(dbStatus ? { status: dbStatus } : {}),
    },
    orderBy,
    take: 200,
    select: {
      id: true,
      book: true,
      chapter: true,
      verse: true,
      status: true,
      updatedAt: true,
      content: true,
    },
  });

  return (
    <div className="space-y-6">
      <Topbar
        title="My Commentary"
        subtitle="Your drafts, submissions, and published entries"
        right={
          <Link
            href="/dashboard/commentary/new"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            + Add Commentary
          </Link>
        }
      />

      <MineFilters
        counts={{
          all: allCount,
          draft: draftCount,
          pending: pendingCount,
          published: publishedCount,
        }}
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="text-sm font-semibold text-[var(--ink)]">
            Entries <span className="text-[var(--muted)]">({rows.length})</span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--muted)]">
            No entries found for this filter.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {rows.map((r) => {
              const ref = `${r.book} ${r.chapter}${r.verse ? `:${r.verse}` : ""}`;
              return (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-[var(--ink)]">{ref}</div>
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                            statusBadgeColor(r.status),
                          ].join(" ")}
                        >
                          {r.status === "PENDING_REVIEW" ? "PENDING" : r.status}
                        </span>
                      </div>

                      <div className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                        {r.content}
                      </div>

                      <div className="mt-2 text-xs text-[var(--muted)]">
                        Updated {new Date(r.updatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* ✅ FIX: Open goes to editor in edit mode */}
                      <Link
                        href={`/dashboard/commentary/new?edit=${r.id}`}
                        className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
