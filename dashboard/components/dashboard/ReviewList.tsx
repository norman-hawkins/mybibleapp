"use client";

import { useMemo, useState, useTransition } from "react";

type Row = {
  id: string;
  book: string;
  chapter: number;
  verse: number | null;
  content: string;
  createdAt: string | Date;
  author: { email: string | null; name: string | null };
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function prettyRef(r: Row) {
  return `${r.book} ${r.chapter}${r.verse ? `:${r.verse}` : ""}`;
}

export default function ReviewList({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows ?? []);
  const [isPending, startTransition] = useTransition();

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const count = rows.length;

  async function patchStatus(id: string, status: "PUBLISHED" | "REJECTED", reason?: string) {
    const res = await fetch(`/api/commentary/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Request failed");
    }
    return json;
  }

  function approve(id: string) {
    setError(null);

    // optimistic remove
    const prev = rows;
    setRows((p) => p.filter((x) => x.id !== id));

    startTransition(async () => {
      try {
        await patchStatus(id, "PUBLISHED");
      } catch (e: any) {
        // rollback
        setRows(prev);
        setError(e?.message || "Approve failed");
      }
    });
  }

  function openReject(id: string) {
    setError(null);
    setRejectId(id);
    setReason("");
    setRejectOpen(true);
  }

  function submitReject() {
    if (!rejectId) return;
    const id = rejectId;

    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please enter a rejection reason.");
      return;
    }

    setRejectOpen(false);
    setError(null);

    // optimistic remove
    const prev = rows;
    setRows((p) => p.filter((x) => x.id !== id));

    startTransition(async () => {
      try {
        await patchStatus(id, "REJECTED", trimmed);
      } catch (e: any) {
        setRows(prev);
        setError(e?.message || "Reject failed");
      }
    });
  }

  const empty = useMemo(() => count === 0, [count]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#991b1b]">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
          <div className="text-sm font-semibold text-[var(--ink)]">
            Pending submissions{" "}
            <span className="text-[var(--muted)]">({count})</span>
          </div>

          <div className="text-xs font-semibold text-[var(--muted)]">
            {isPending ? "Updating…" : "Up to date"}
          </div>
        </div>

        {empty ? (
          <div className="px-6 py-12 text-sm text-[var(--muted)]">
            No items in the review queue.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <div key={r.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-semibold text-[var(--ink)]">
                        {prettyRef(r)}
                      </div>

                      <span className="inline-flex items-center rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-xs font-semibold text-[#9a3412]">
                        PENDING
                      </span>

                      <span className="text-xs text-[var(--muted)]">
                        by {r.author?.name || r.author?.email || "Unknown"}
                      </span>
                    </div>

                    <div className="mt-3 line-clamp-3 text-sm text-[var(--muted)]">
                      {r.content}
                    </div>

                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Submitted {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openReject(r.id)}
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm hover:bg-[#f6f6f4]"
                      disabled={isPending}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => approve(r.id)}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                      disabled={isPending}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setRejectOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <div className="text-lg font-semibold text-[var(--ink)]">Reject submission</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              Add a short reason so the contributor knows what to fix.
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Reason for rejection…"
              rows={5}
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                  "bg-black hover:opacity-95"
                )}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
