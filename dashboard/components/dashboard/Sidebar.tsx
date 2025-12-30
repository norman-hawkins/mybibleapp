"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; roles?: string[] };

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
   { label: "Bible", href: "/dashboard/bible", roles: ["ADMIN", "CONTRIBUTOR"] },
  { label: "Entries", href: "/dashboard/mine", roles: ["ADMIN", "CONTRIBUTOR"] },
  { label: "Review Queue", href: "/dashboard/review", roles: ["ADMIN"] },
  { label: "Contributors", href: "/dashboard/contributors", roles: ["ADMIN"] },
      { label: "Ask AI", href: "/dashboard/ai", roles: ["ADMIN"] },

  { label: "Settings", href: "/dashboard/settings", roles: ["ADMIN"] },

 
];

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as any)?.role as string | undefined;
  const email = data?.user?.email ?? "";
  const name = data?.user?.name ?? "";

  const filtered = NAV.filter((i) => {
    if (!i.roles?.length) return true;
    if (!role) return false;
    return i.roles.includes(role);
  });

  return (
    <aside className="w-[300px] shrink-0">
      <div className="sticky top-6 h-[calc(100vh-3rem)] rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white shadow-sm">
            <span className="text-base font-semibold">B</span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-[var(--ink)]">
              Bible Dashboard
            </div>
            <div className="mt-0.5 inline-flex rounded-full border border-[var(--border)] bg-[#f6f6f4] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
              {role ? role.toLowerCase() : "user"}
            </div>
          </div>
        </div>

        <div className="px-5">
          <div className="h-px bg-[var(--border)]" />
        </div>

        {/* Nav */}
        <nav className="p-3">
          {filtered.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-black text-white shadow-sm"
                    : "text-[var(--ink)] hover:bg-[#f6f6f4]"
                )}
              >
                <span
                  className={cx(
                    "h-2 w-2 rounded-full",
                    active ? "bg-white" : "bg-[var(--border)] group-hover:bg-[#d7d7d2]"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tip card */}
        <div className="px-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
            <div className="text-xs font-semibold text-[var(--ink)]">Tip</div>
            <div className="mt-2 text-sm leading-5 text-[var(--muted)]">
              Keep entries as <span className="font-semibold">Draft</span> until ready.
              Contributors submit for review; admins approve & publish.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 px-5">
          <div className="h-px bg-[var(--border)]" />
        </div>

        <div className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--ink)]">
              {name || "Signed in"}
            </div>
            <div className="truncate text-xs text-[var(--muted)]">{email}</div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}