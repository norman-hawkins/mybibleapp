import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContributorsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Forbidden</div>
        <div className="mt-2 text-sm text-[var(--muted)]">Admins only.</div>
      </div>
    );
  }

  const contributors = await prisma.user.findMany({
    where: { role: Role.CONTRIBUTOR },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <Topbar
        title="Contributors"
        subtitle="Manage contributor accounts"
        right={
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm hover:bg-[#f6f6f4]"
          >
            Back
          </Link>
        }
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="text-sm font-semibold text-[var(--ink)]">
            Accounts <span className="text-[var(--muted)]">({contributors.length})</span>
          </div>
        </div>

        {contributors.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--muted)]">
            No contributors yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {contributors.map((u) => (
              <div key={u.id} className="px-6 py-4">
                <div className="text-sm font-semibold text-[var(--ink)]">
                  {u.name ?? "Contributor"}
                </div>
                <div className="text-sm text-[var(--muted)]">{u.email}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Created {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
