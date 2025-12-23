export const dynamic = "force-dynamic";
export const revalidate = 0;

import ReviewList from "@/components/dashboard/ReviewList";
import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Not signed in</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          Please sign in to access admin review.
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

  const role = (session.user as any).role as Role | undefined;
  if (role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Forbidden</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          You must be an admin to review submissions.
        </div>
      </div>
    );
  }

  const rows = await prisma.commentary.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      book: true,
      chapter: true,
      verse: true,
      content: true,
      createdAt: true,
      author: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <Topbar
        title="Review Queue"
        subtitle="Approve or reject contributor submissions"
        right={
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm hover:bg-[#f6f6f4]"
          >
            Back to Dashboard
          </Link>
        }
      />

      <ReviewList initialRows={rows} />
    </div>
  );
}