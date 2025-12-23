"use client";

import Topbar from "@/components/dashboard/Topbar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "ADMIN" | "CONTRIBUTOR" | "USER";
type CommentaryStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
type Version = "WEB" | "KJV";

type EditRow = {
  id: string;
  book: string;
  chapter: number;
  verse: number | null;
  status: CommentaryStatus;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
};

type VerseRow = { v: number; t: string };
type BibleResp =
  | { ok: true; book: string; chapter: number; verse?: number; text?: string; verses?: VerseRow[] }
  | { error: string };

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

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i >= 1 ? i : null;
}

type InitialState = {
  book: string;
  chapter: number;
  verse: number | null;
  version: Version;
};

export default function NewCommentaryPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session } = useSession();

  const role = ((session?.user as any)?.role as Role | undefined) ?? "USER";
  const signedIn = Boolean(session?.user);

  const editId = sp.get("edit") ?? "";
  const isEdit = Boolean(editId);

  const initial = useMemo<InitialState>(() => {
    const qBook = (sp.get("book") ?? "").toLowerCase();
    const qChapter = toInt(sp.get("chapter"));
    const qVerse = toInt(sp.get("verse"));

    const rawV = (sp.get("version") ?? "WEB").toUpperCase();
    const version: Version = rawV === "KJV" ? "KJV" : "WEB";

    return {
      book: BOOKS.includes(qBook) ? qBook : "john",
      chapter: qChapter ?? 1,
      verse: qVerse ?? null,
      version,
    };
  }, [sp]);

  const [book, setBook] = useState<string>(initial.book);
  const [chapter, setChapter] = useState<number>(initial.chapter);
  const [verse, setVerse] = useState<number | "">(initial.verse ?? "");
  const [version, setVersion] = useState<Version>(initial.version);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // when editing, we load the row (and use its book/chapter/verse/status)
  const [editRow, setEditRow] = useState<EditRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [content, setContent] = useState("");
  const status = editRow?.status ?? "DRAFT";

  const isEditable = useMemo(() => {
    if (!signedIn) return false;
    if (!isEdit) return role !== "USER";
    if (status === "DRAFT") return role !== "USER";
    if (status === "PENDING_REVIEW") return false;
    if (status === "PUBLISHED") return role === "ADMIN";
    if (status === "REJECTED") return role !== "USER";
    return false;
  }, [signedIn, isEdit, role, status]);

  // Load edit row when editId exists
  useEffect(() => {
    let alive = true;

    async function loadEdit() {
      if (!isEdit) return;

      setEditLoading(true);
      setMsg(null);

      try {
        const res = await fetch(`/api/commentary?id=${encodeURIComponent(editId)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Failed to load commentary");

        if (!alive) return;
        const row = json?.commentary as EditRow;

        setEditRow(row);

        // sync form with row
        setBook(row.book);
        setChapter(row.chapter);
        setVerse(row.verse ?? "");
        setContent(row.content ?? "");
      } catch (e: any) {
        if (!alive) return;
        setEditRow(null);
        setMsg(e?.message ?? "Error");
      } finally {
        if (!alive) return;
        setEditLoading(false);
      }
    }

    loadEdit();
    return () => {
      alive = false;
    };
  }, [isEdit, editId]);

  // Bible preview panel
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [refText, setRefText] = useState<string>("");

  const refLabel = useMemo(() => {
    const v = verse !== "" ? `:${verse}` : "";
    return `${book} ${chapter}${v} (${version})`;
  }, [book, chapter, verse, version]);

  useEffect(() => {
    let alive = true;

    async function loadReference() {
      setRefLoading(true);
      setRefError(null);

      try {
        const qs = new URLSearchParams();
        qs.set("version", version);
        qs.set("book", book);
        qs.set("chapter", String(chapter));
        if (verse !== "") qs.set("verse", String(verse));

        const res = await fetch(`/api/bible?${qs.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as BibleResp;

        if (!res.ok) throw new Error((json as any)?.error || "Failed to load reference");

        if (!alive) return;

        if (verse !== "" && (json as any)?.text) {
          setRefText(String((json as any).text));
          return;
        }

        const versesArr: VerseRow[] = Array.isArray((json as any)?.verses)
          ? ((json as any).verses as VerseRow[])
          : [];

        const preview = versesArr.slice(0, 6).map((x) => `${x.v}. ${x.t}`).join("\n\n");
        setRefText(preview || "No verses found for this chapter.");
      } catch (e: any) {
        if (!alive) return;
        setRefError(e?.message ?? "Error");
        setRefText("");
      } finally {
        if (!alive) return;
        setRefLoading(false);
      }
    }

    loadReference();
    return () => {
      alive = false;
    };
  }, [book, chapter, verse, version]);

  async function createOrUpdate(submit: boolean) {
    setBusy(true);
    setMsg(null);

    try {
      const payload = {
        book,
        chapter,
        verse: verse === "" ? null : Number(verse),
        content,
        submit,
      };

      const url = isEdit ? `/api/commentary?id=${encodeURIComponent(editId)}` : "/api/commentary";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");

      if (!isEdit) {
        const newId = json?.commentary?.id as string | undefined;
        if (newId) {
          setMsg(submit ? "Created & submitted ✅" : "Draft saved ✅");
          router.replace(`/dashboard/commentary/new?edit=${encodeURIComponent(newId)}`);
          return;
        }
      }

      const updated = json?.commentary as Partial<EditRow> | undefined;
      if (updated?.status && editRow) {
        setEditRow({ ...editRow, ...updated, content });
      }

      setMsg(
        submit
          ? role === "ADMIN"
            ? "Updated & published ✅"
            : "Submitted for review ✅"
          : "Draft saved ✅"
      );
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  const lockedReason = useMemo(() => {
    if (!signedIn) return "Sign in to write commentary.";
    if (!isEdit) return null;

    if (status === "PENDING_REVIEW") return "This entry is under review. Move it back to Draft to edit.";
    if (status === "PUBLISHED" && role !== "ADMIN") return "Published entries are locked.";
    return null;
  }, [signedIn, isEdit, status, role]);

  return (
    <div className="space-y-6">
      <Topbar
        title={isEdit ? "Edit Commentary" : "New Commentary"}
        subtitle={
          isEdit
            ? "Update your entry based on its current status"
            : "Select a passage → write → save or submit"
        }
        right={
          <Link
            href="/dashboard/mine"
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#f6f6f4]"
          >
            Back to My Entries
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Left: Reference */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Reference</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Version → book → chapter → verse (optional)
              </div>
            </div>

            {isEdit ? (
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                  statusBadgeColor(status)
                )}
              >
                {status === "PENDING_REVIEW" ? "PENDING" : status}
              </span>
            ) : null}
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
                disabled={isEdit && !isEditable && role !== "ADMIN"}
                className={cx(
                  "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]",
                  isEdit && !isEditable && role !== "ADMIN" && "opacity-70"
                )}
              >
                {BOOKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--muted)]">Chapter</div>
                <input
                  type="number"
                  min={1}
                  value={chapter}
                  onChange={(e) => setChapter(Math.max(1, Number(e.target.value || 1)))}
                  disabled={isEdit && !isEditable && role !== "ADMIN"}
                  className={cx(
                    "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]",
                    isEdit && !isEditable && role !== "ADMIN" && "opacity-70"
                  )}
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--muted)]">Verse</div>
                <input
                  type="number"
                  min={1}
                  value={verse}
                  onChange={(e) => setVerse(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={isEdit && !isEditable && role !== "ADMIN"}
                  className={cx(
                    "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]",
                    isEdit && !isEditable && role !== "ADMIN" && "opacity-70"
                  )}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
            <div className="text-xs font-semibold text-[var(--muted)]">Selected</div>
            <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{refLabel}</div>

            {isEdit ? (
              <div className="mt-2 text-xs text-[var(--muted)]">
                Editing ID: <span className="font-semibold">{editId}</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-[var(--muted)]">
                Tip: save as Draft until ready. Submit sends to Review Queue.
              </div>
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Commentary</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Write notes/exegesis in your preferred style.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!signedIn ? (
                <Link
                  href="/signin"
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Sign in
                </Link>
              ) : isEdit && status === "PENDING_REVIEW" ? (
                <button
                  disabled={busy}
                  onClick={() => createOrUpdate(false)}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                >
                  Move back to Draft
                </button>
              ) : isEdit && status === "PUBLISHED" && role !== "ADMIN" ? null : (
                <>
                  <button
                    disabled={busy || !content.trim() || role === "USER"}
                    onClick={() => createOrUpdate(false)}
                    className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[#f6f6f4] disabled:opacity-60"
                  >
                    Save Draft
                  </button>

                  <button
                    disabled={busy || !content.trim() || role === "USER" || !isEditable}
                    onClick={() => createOrUpdate(true)}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {role === "ADMIN" ? "Publish" : "Submit for Review"}
                  </button>
                </>
              )}
            </div>
          </div>

          {lockedReason ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">Locked</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{lockedReason}</div>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-[var(--muted)]">Reference</div>
              {refLoading ? (
                <div className="text-xs font-semibold text-[var(--muted)]">Loading…</div>
              ) : null}
            </div>

            {refError ? (
              <div className="mt-2 text-sm font-semibold text-[#991b1b]">{refError}</div>
            ) : (
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
                {refText || "Select a valid Book/Chapter/Verse to preview the Bible text."}
              </div>
            )}
          </div>

          <div className="mt-4">
            {editLoading ? (
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
                Loading entry…
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write exegesis / notes here…"
                disabled={!isEditable}
                className={cx(
                  "min-h-[340px] w-full rounded-2xl border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--ink)] outline-none",
                  !isEditable && "bg-[#f6f6f4] text-[var(--muted)]"
                )}
              />
            )}
          </div>

          {msg ? (
            <div className="mt-3 text-sm font-semibold text-[var(--ink)]">{msg}</div>
          ) : null}

          <div className="mt-4 text-xs text-[var(--muted)]">
            {isEdit ? (
              <>
                Status-based editing rules apply:
                <span className="ml-1 font-semibold">
                  Draft editable • Pending locked • Published admin-only
                </span>
              </>
            ) : (
              <>
                After you save, this page will switch into <span className="font-semibold">edit mode</span>.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
