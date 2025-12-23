export const dynamic = "force-dynamic";
export const revalidate = 0;

import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
      <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
      <div className="text-sm text-[var(--muted)]">{value}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Not signed in</div>
        <div className="mt-2 text-sm text-[var(--muted)]">Please sign in.</div>
        <Link
          href="/signin"
          className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Forbidden</div>
        <div className="mt-2 text-sm text-[var(--muted)]">Admin access required.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="Settings"
        subtitle="Admin settings and environment info"
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Environment</div>
        <div className="mt-4 grid gap-3">
          <Row label="NextAuth URL" value={process.env.NEXTAUTH_URL ?? "—"} />
          <Row label="Database" value={process.env.DATABASE_URL ? "Connected (env set)" : "—"} />
        </div>

        <div className="mt-6 text-sm text-[var(--muted)]">
          Next step: add app-level settings (default status on submit, editor rules, etc.)
        </div>
      </div>
    </div>
  );
}
