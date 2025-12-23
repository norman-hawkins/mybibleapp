"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Props = {
  version: "WEB" | "KJV";
  book: string;
  chapter: number;
  verse: number | null;
};

type CommentaryRow = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  author?: { name?: string | null; email?: string | null; role?: string | null };
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function VerseCommentary({ version, book, chapter, verse }: Props) {
  const { data } = useSession();
  const role = (data?.user as any)?.role as string | undefined;

  const canWrite = role === "ADMIN" || role === "CONTRIBUTOR";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CommentaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    if (!book || !chapter || !verse) return "";
    const sp = new URLSearchParams();
    sp.set("book", book);
    sp.set("chapter", String(chapter));
    sp.set("verse", String(verse));
    return sp.toString();
  }, [book, chapter, verse]);

  useEffect(() => {
    if (!query) {
      setRows([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/commentary?${query}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Request failed");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setRows((json?.rows as CommentaryRow[]) || []);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  const addHref =
    verse && book && chapter
      ? `/dashboard/commentary/new?version=${encodeURIComponent(version)}&book=${encodeURIComponent(
          book
        )}&chapter=${chapter}&verse=${verse}`
      : "/dashboard/commentary/new";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-[var(--ink)]">Commentary</div>

          <div className="flex items-center gap-2">
            {canWrite ? (
              <Link
                href={addHref}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                + Add Commentary
              </Link>
            ) : (
              <div className="text-xs text-[var(--muted)]">Read-only</div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {!verse ? (
          <div className="text-sm text-[var(--muted)]">Select a verse to view commentary.</div>
        ) : loading ? (
          <div className="text-sm text-[var(--muted)]">Loading commentary…</div>
        ) : error ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
            <div className="text-sm font-semibold text-[var(--ink)]">No published commentary yet</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {canWrite
                ? "Create a draft, then submit for review (contributors) or publish (admin)."
                : "Check back later."}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-[var(--muted)]">
                    {r.author?.name || r.author?.email || "Unknown author"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mt-2 text-sm leading-6 text-[var(--ink)] whitespace-pre-wrap">
                  {r.content}
                </div>

                <div className="mt-3 text-xs text-[var(--muted)]">
                  Status: <span className="font-semibold">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
