"use client";

import { useState } from "react";

export default function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: "ADMIN" | "CONTRIBUTOR" | "USER";
}) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  async function save(nextRole: typeof role) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setRole(nextRole);
    } catch (e: any) {
      alert(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={loading}
        onChange={(e) => {
          const next = e.target.value as any;
          setRole(next);
          save(next);
        }}
        className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
      >
        <option value="USER">USER</option>
        <option value="CONTRIBUTOR">CONTRIBUTOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </div>
  );
}
