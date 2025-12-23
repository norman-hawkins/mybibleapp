"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Version = "WEB" | "KJV";

type VerseRow = { v: number; t: string };
type ChapterPayload = { book: string; chapter: number; verses: VerseRow[] };

type CommentaryStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";

type CommentaryRow = {
  id: string;
  status: CommentaryStatus;
  content: string;
  updatedAt: string;
  authorId: string;
  author?: { name: string | null; email: string | null; role: string } | null;
};

function statusBadgeColor(s: CommentaryStatus) {
  switch (s) {
    case "DRAFT":
      return "bg-[#f6f6f4] text-[var(--muted)] border-[var(--border)]";
    case "PENDING_REVIEW":
      return "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]";
    case "PUBLISHED":
      return "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]";
    case "REJECTED":
      return "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]";
    default:
      return "bg-[#f6f6f4] text-[var(--muted)] border-[var(--border)]";
  }
}

const BOOKS = [
  "genesis","exodus","leviticus","numbers","deuteronomy",
  "joshua","judges","ruth","1samuel","2samuel","1kings","2kings",
  "1chronicles","2chronicles","ezra","nehemiah","esther","job","psalms",
  "proverbs","ecclesiastes","songofsolomon",
  "isaiah","jeremiah","lamentations","ezekiel","daniel",
  "hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk",
  "zephaniah","haggai","zechariah","malachi",
  "matthew","mark","luke","john","acts","romans",
  "1corinthians","2corinthians","galatians","ephesians","philippians","colossians",
  "1thessalonians","2thessalonians","1timothy","2timothy","titus","philemon",
  "hebrews","james","1peter","2peter","1john","2john","3john","jude","revelation",
];

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BibleExplorer() {
  const [version, setVersion] = useState<Version>("WEB");
  const [book, setBook] = useState<string>("john");
  const [chapter, setChapter] = useState<number>(1);

  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  // Commentaries for selected verse
  const [cLoading, setCLoading] = useState(false);
  const [cErr, setCErr] = useState<string | null>(null);
  const [commentaries, setCommentaries] = useState<CommentaryRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ChapterPayload | null>(null);

  const refLabel = useMemo(() => {
    const v = selectedVerse ? `:${selectedVerse}` : "";
    return `${book} ${chapter}${v} (${version})`;
  }, [book, chapter, selectedVerse, version]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({
        version,
        book,
        chapter: String(chapter),
      });

      const res = await fetch(`/api/bible?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as any;

      if (!res.ok) throw new Error(json?.error || "Failed to load chapter");
      setData(json as ChapterPayload);
      setSelectedVerse(null);
      setCommentaries([]);
      setCErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, book, chapter]);

  async function loadCommentaries(v: number) {
    setCLoading(true);
    setCErr(null);
    try {
      const qs = new URLSearchParams({
        book,
        chapter: String(chapter),
        verse: String(v),
      });

      const res = await fetch(`/api/commentary/verse?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as any;

      if (!res.ok) throw new Error(json?.error || "Failed to load commentaries");
      setCommentaries(Array.isArray(json?.rows) ? (json.rows as CommentaryRow[]) : []);
    } catch (e: any) {
      setCErr(e?.message ?? "Error");
      setCommentaries([]);
    } finally {
      setCLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedVerse) return;
    loadCommentaries(selectedVerse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVerse, book, chapter]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {/* Left controls */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="text-sm font-semibold text-[var(--ink)]">Browse</div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          Select version → book → chapter
        </div>

        <div className="mt-4 grid gap-3">
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
              {BOOKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted)]">Chapter</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChapter((c) => Math.max(1, c - 1))}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#f6f6f4]"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={chapter}
                onChange={(e) => setChapter(Math.max(1, Number(e.target.value || 1)))}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              />
              <button
                type="button"
                onClick={() => setChapter((c) => c + 1)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#f6f6f4]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
          <div className="text-xs font-semibold text-[var(--muted)]">Selected</div>
          <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{refLabel}</div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            Tip: click a verse to reveal “Add Commentary” on the right.
          </div>
        </div>
      </div>

      {/* Right: verses */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[var(--ink)]">
              {book} {chapter} <span className="text-[var(--muted)]">({version})</span>
            </div>
            {loading ? (
              <div className="text-xs font-semibold text-[var(--muted)]">Loading…</div>
            ) : null}
          </div>

          {err ? (
            <div className="mt-2 text-sm font-semibold text-[#991b1b]">{err}</div>
          ) : null}
        </div>

        {!data?.verses?.length ? (
          <div className="px-6 py-10 text-sm text-[var(--muted)]">
            {loading ? "Loading…" : "No verses found."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.verses.map((x) => {
              const active = selectedVerse === x.v;

              return (
                <div
                  key={x.v}
                  onClick={() => setSelectedVerse(x.v)}
                  className={cx(
                    "cursor-pointer px-6 py-4 transition",
                    active ? "bg-[#fbfbfa]" : "hover:bg-[#f6f6f4]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* left */}
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span
                          className={cx(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold",
                            active
                              ? "border-black bg-black text-white"
                              : "border-[var(--border)] bg-white text-[var(--muted)]"
                          )}
                        >
                          {x.v}
                        </span>

                        <div className="text-sm leading-6 text-[var(--ink)]">{x.t}</div>
                      </div>
                    </div>

                    {/* right: button only when selected */}
                    <div className="shrink-0">
                      {active ? (
                        <Link
                          href={`/dashboard/commentary/new?book=${book}&chapter=${chapter}&verse=${x.v}&version=${version}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                        >
                          + Add Commentary
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {active ? (
                    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-[var(--muted)]">
                          Commentaries
                        </div>
                        {cLoading ? (
                          <div className="text-xs font-semibold text-[var(--muted)]">
                            Loading…
                          </div>
                        ) : null}
                      </div>

                      {cErr ? (
                        <div className="mt-2 text-sm font-semibold text-[#991b1b]">
                          {cErr}
                        </div>
                      ) : null}

                      {!cLoading && !cErr && commentaries.length === 0 ? (
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          No commentaries found for this verse.
                        </div>
                      ) : null}

                      <div className="mt-3 space-y-3">
                        {commentaries.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border border-[var(--border)] bg-[#fbfbfa] p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cx(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  statusBadgeColor(c.status)
                                )}
                              >
                                {c.status === "PENDING_REVIEW" ? "PENDING" : c.status}
                              </span>

                              <div className="text-xs font-semibold text-[var(--muted)]">
                                {c.author?.name || c.author?.email || "Unknown"}
                              </div>

                              <div className="text-xs text-[var(--muted)]">
                                • {new Date(c.updatedAt).toLocaleString()}
                              </div>

                              <div className="ml-auto">
                                <Link
                                  href={`/dashboard/commentary/${c.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
                                >
                                  Open
                                </Link>
                              </div>
                            </div>

                            <div className="mt-2 line-clamp-3 text-sm text-[var(--ink)]">
                              {c.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}