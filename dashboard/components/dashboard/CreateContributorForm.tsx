"use client";

import { useState } from "react";

export default function CreateContributorForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CONTRIBUTOR" | "USER" | "ADMIN">("CONTRIBUTOR");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");

      setMsg("✅ User created");
      setEmail("");
      setName("");
      setPassword("");
      setRole("CONTRIBUTOR");
      // refresh server list
      window.location.reload();
    } catch (err: any) {
      setMsg("❌ " + (err.message || "Request failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-[var(--muted)]">Name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            placeholder="Contributor name"
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-[var(--muted)]">Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            <option value="CONTRIBUTOR">CONTRIBUTOR</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-[var(--muted)]">Email</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          placeholder="email@example.com"
          required
        />
      </div>

      <div>
        <div className="text-xs font-semibold text-[var(--muted)]">Password</div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          placeholder="Set initial password"
          required
        />
      </div>

      <button
        disabled={loading}
        className="w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create user"}
      </button>

      {msg ? <div className="text-sm text-[var(--muted)]">{msg}</div> : null}
    </form>
  );
}
