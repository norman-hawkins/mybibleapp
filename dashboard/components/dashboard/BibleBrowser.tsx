"use client";

import { useEffect, useMemo, useState } from "react";

type Version = "KJV" | "WEB";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BibleBrowser() {
  const [version, setVersion] = useState<Version>("WEB");
  const [books, setBooks] = useState<string[]>([]);
  const [book, setBook] = useState<string>("");
  const [chapters, setChapters] = useState<number[]>([]);
  const [chapter, setChapter] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // Load books when version changes
  useEffect(() => {
    let alive = true;
    setErr("");
    setBooks([]);
    setBook("");
    setChapters([]);
    setData(null);

    (async () => {
      try {
        const res = await fetch(`/api/bible/${version}/books`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json?.error ?? "Failed to load books");
        setBooks(json.books ?? []);
        setBook((json.books?.[0] as string) ?? "");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load books");
      }
    })();

    return () => {
      alive = false;
    };
  }, [version]);

  // Load chapters when book changes
  useEffect(() => {
    if (!book) return;
    let alive = true;
    setErr("");
    setChapters([]);
    setData(null);

    (async () => {
      try {
        const res = await fetch(`/api/bible/${version}/${book}/chapters`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json?.error ?? "Failed to load chapters");
        const ch = (json.chapters ?? []) as number[];
        setChapters(ch);
        setChapter(ch?.[0] ?? 1);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load chapters");
      }
    })();

    return () => {
      alive = false;
    };
  }, [version, book]);

  // Load chapter JSON when chapter changes
  useEffect(() => {
    if (!book || !chapter) return;
    let alive = true;
    setErr("");
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/bible/${version}/${book}/${chapter}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json?.error ?? "Failed to load chapter");
        setData(json.data);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load chapter");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [version, book, chapter]);

  const verses = useMemo(() => (data?.verses ?? []) as Array<{ v: number; t: string }>, [data]);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold text-[var(--muted)]">Version</div>
            <div className="mt-2 flex gap-2">
              {(["WEB", "KJV"] as Version[]).map((v) => {
                const active = v === version;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVersion(v)}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "border-black bg-black text-white"
                        : "border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[#f6f6f4]"
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted)]">Book</div>
            <select
              value={book}
              onChange={(e) => setBook(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              {books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted)]">Chapter</div>
            <select
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-[var(--muted)]">
          Source: <span className="font-semibold text-[var(--ink)]">/dashboard/bible-data</span>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[var(--ink)]">
            {book ? `${book} ${chapter}` : "—"}
          </div>
          {loading ? (
            <div className="text-xs font-semibold text-[var(--muted)]">Loading…</div>
          ) : null}
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#991b1b]">
            {err}
          </div>
        ) : null}

        {!err && verses.length === 0 ? (
          <div className="mt-4 text-sm text-[var(--muted)]">No verses found.</div>
        ) : (
          <div className="mt-5 space-y-3">
            {verses.map((v) => (
              <div key={v.v} className="flex gap-3">
                <div className="w-10 shrink-0 text-right text-xs font-semibold text-[var(--muted)]">
                  {v.v}
                </div>
                <div className="text-sm leading-6 text-[var(--ink)]">{v.t}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
