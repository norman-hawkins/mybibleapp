// app/dashboard/contributors/page.tsx
import Topbar from "@/components/dashboard/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function badgeClass(role: Role) {
  switch (role) {
    case "ADMIN":
      return "bg-black text-white border-black";
    case "CONTRIBUTOR":
      return "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]";
    case "USER":
    default:
      return "bg-[#f6f6f4] text-[var(--muted)] border-[var(--border)]";
  }
}

function formatDate(d: Date) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default async function ContributorsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Not signed in</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          Please sign in to view contributors.
        </div>
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Access denied</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          Only admins can manage contributors.
        </div>
      </div>
    );
  }

  // ✅ FIXED: Server Action re-fetches session inside the action (no closure over `session`)
  async function updateUserRole(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const myRole = (session?.user as any)?.role as Role | undefined;
    const myId = String((session?.user as any)?.id ?? "");

    if (!session?.user || myRole !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = String(formData.get("id") ?? "");
    const nextRole = String(formData.get("role") ?? "").toUpperCase();

    if (!id) return;

    if (!["ADMIN", "CONTRIBUTOR", "USER"].includes(nextRole)) {
      throw new Error("Invalid role");
    }

    // Optional safety: prevent self-demotion
    if (myId && id === myId && nextRole !== "ADMIN") {
      throw new Error("You can't demote yourself.");
    }

    await prisma.user.update({
      where: { id },
      data: { role: nextRole as Role },
    });

    // Important: refresh UI
    revalidatePath("/dashboard/contributors");
  }

  // ✅ Added: Create contributor (keeps your page’s existing flow; no separate page required)
  async function createContributor(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    const myRole = (session?.user as any)?.role as Role | undefined;

    if (!session?.user || myRole !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("That email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name: name || null,
        role: "CONTRIBUTOR",
        passwordHash,
      } as any,
    });

    revalidatePath("/dashboard/contributors");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const [adminCount, contributorCount, userCount] = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "CONTRIBUTOR" } }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  return (
    <div className="space-y-6">
      <Topbar title="Contributors" subtitle="Manage user roles (Admin / Contributor / User)" />

      {/* ✅ Create contributor */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--ink)]">Create Contributor</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              Adds a contributor account that can submit commentary for review.
            </div>
          </div>
          <div className="text-xs text-[var(--muted)]">
            Tip: password must be shared with the contributor.
          </div>
        </div>

        <form action={createContributor} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            name="name"
            placeholder="Name (optional)"
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
          />
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Create
          </button>
        </form>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[var(--muted)]">Admins</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{adminCount}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Full access</div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[var(--muted)]">Contributors</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{contributorCount}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Write + submit for review</div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[var(--muted)]">Users</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--ink)]">{userCount}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Read-only</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-[var(--ink)]">
              All Accounts <span className="text-[var(--muted)]">({users.length})</span>
            </div>
            <div className="text-xs text-[var(--muted)]">
              Change role → click <span className="font-semibold">Save</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {users.map((u) => (
            <div key={u.id} className="px-6 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Left */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="truncate text-sm font-semibold text-[var(--ink)]">
                      {u.name ?? "—"}
                    </div>

                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                        badgeClass(u.role),
                      ].join(" ")}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="mt-1 truncate text-sm text-[var(--muted)]">{u.email ?? "—"}</div>

                  <div className="mt-2 text-xs text-[var(--muted)]">
                    Created {formatDate(u.createdAt)} • Updated {formatDate(u.updatedAt)}
                  </div>
                </div>

                {/* Right - role editor */}
                <form action={updateUserRole} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />

                  <select
                    name="role"
                    defaultValue={u.role}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                    <option value="USER">USER</option>
                  </select>

                  <button
                    type="submit"
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  >
                    Save
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-5">
        <div className="text-sm font-semibold text-[var(--ink)]">Notes</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>Role changes update the database immediately.</li>
          <li>
            If you want role changes to reflect instantly for logged-in users, your
            NextAuth JWT callback should refresh role from DB (your setup can do that).
          </li>
        </ul>
      </div>
    </div>
  );
}