export const dynamic = "force-dynamic";
export const revalidate = 0;

import StatCard from "@/components/dashboard/StatCard";
import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

function SectionCard({
  title,
  badge,
  children,
  right,
}: {
  title: string;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
          {badge ? (
            <span className="rounded-full border border-[var(--border)] bg-[#f6f6f4] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
              {badge}
            </span>
          ) : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  const showAdmin = role === "ADMIN";
  const showContributor = role === "CONTRIBUTOR" || role === "ADMIN";

  // Counts
  const whereBase =
    showAdmin ? {} : userId ? { authorId: userId } : { authorId: "__no_user__" };

  const [
    draftCount,
    pendingCount,
    publishedCount,
    rejectedCount,
    contributorsCount,
    latestPending,
  ] = await Promise.all([
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.DRAFT } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.PENDING_REVIEW } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.PUBLISHED } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.REJECTED } }),
    showAdmin ? prisma.user.count({ where: { role: Role.CONTRIBUTOR } }) : Promise.resolve(0),

    showAdmin
      ? prisma.commentary.findMany({
          where: { status: CommentaryStatus.PENDING_REVIEW },
          orderBy: { createdAt: "asc" },
          take: 5,
          select: {
            id: true,
            book: true,
            chapter: true,
            verse: true,
            createdAt: true,
            author: { select: { email: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Topbar
        title="Dashboard"
        subtitle="Manage commentary entries and publishing"
        right={
          showAdmin ? (
            <Link
              href="/dashboard/review"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm hover:bg-[#f6f6f4]"
            >
              Review Queue
            </Link>
          ) : null
        }
      />

      {/* Hero */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-sm text-[var(--muted)]">
              {showAdmin ? "Admin Console" : "Welcome back"}
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">
              Build commentary like a premium writing studio
            </div>
            <p className="mt-3 text-[var(--muted)]">
              Keep the pipeline clean: drafts → pending review → published.
            </p>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {showContributor ? (
              <Link
                href="/dashboard/commentary/new"
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                + Add Commentary
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Draft entries"
          value={draftCount}
          hint="Not yet submitted"
          href="/dashboard/mine?status=DRAFT"
        />

        <StatCard
          label="Pending review"
          value={pendingCount}
          hint={showAdmin ? "Needs admin action" : "Waiting for admin"}
          href={showAdmin ? "/dashboard/review" : "/dashboard/mine?status=PENDING_REVIEW"}
        />

        <StatCard
          label="Published"
          value={publishedCount}
          hint="Visible to users"
          href="/dashboard/mine?status=PUBLISHED"
        />

        {showAdmin ? (
          <StatCard
            label="Contributors"
            value={contributorsCount}
            hint="Active contributor accounts"
            href="/dashboard/admin/contributors"
          />
        ) : (
          <StatCard
            label="Rejected"
            value={rejectedCount}
            hint="Needs editing"
            href="/dashboard/mine?status=REJECTED"
          />
        )}
      </div>

      {/* Admin Queue Preview */}
      {showAdmin ? (
        <SectionCard
          title="Review Queue"
          badge="Admin"
          right={
            <Link
              href="/dashboard/review"
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
            >
              Open Review →
            </Link>
          }
        >
          {latestPending.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No pending submissions.</div>
          ) : (
            <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white">
              {latestPending.map((r) => {
                const ref = `${r.book} ${r.chapter}${r.verse ? `:${r.verse}` : ""}`;
                const who = r.author?.name || r.author?.email || "Unknown";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--ink)]">{ref}</div>
                      <div className="text-xs text-[var(--muted)]">
                        Submitted by {who} • {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/review`}
                      className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                    >
                      Review
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      {/* Workspace (keep your premium placeholders) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Bible Navigator" badge="Coming next">
          <div className="text-sm text-[var(--muted)]">
            Left panel: Book → Chapter → Verse. Select a verse to edit/add commentary.
          </div>

          <div className="mt-4 grid gap-2">
            {["John", "Romans", "Genesis"].map((b) => (
              <div
                key={b}
                className="rounded-xl border border-[var(--border)] bg-[#f6f6f4] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
              >
                {b}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Editor"
          right={
            showContributor ? (
              <div className="flex items-center gap-3">
                <button className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#f6f6f4]">
                  Save Draft
                </button>
                <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  Submit for Review
                </button>
              </div>
            ) : null
          }
        >
          <div className="text-sm font-semibold text-[var(--ink)]">
            Select a verse to start writing
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="text-sm font-semibold text-[var(--ink)]">John 1:1</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              In the beginning was the Word, and the Word was with God, and the Word was God.
            </div>

            <div className="mt-5 text-xs font-semibold text-[var(--muted)]">Commentary</div>
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[#fbfbfa] p-4 text-sm text-[var(--muted)]">
              Write commentary here…
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}