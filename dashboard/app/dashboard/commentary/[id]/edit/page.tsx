"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditDraftPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [book, setBook] = useState("john");
  const [chapter, setChapter] = useState<number>(1);
  const [verse, setVerse] = useState<string>("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("DRAFT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/commentary/${params.id}`);
    const json = await res.json();
    const row = json.row;
    setBook(row.book);
    setChapter(row.chapter);
    setVerse(row.verse ?? "");
    setContent(row.content);
    setStatus(row.status);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/commentary/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, chapter, verse, content }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      alert(json.error ?? "Save failed");
      return;
    }

    router.push("/dashboard/mine");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (status !== "DRAFT") return <div className="p-6">Only drafts can be edited.</div>;

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Edit Draft</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <div className="mb-1 text-zinc-600">Book</div>
          <input className="w-full rounded-lg border px-3 py-2" value={book} onChange={(e) => setBook(e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1 text-zinc-600">Chapter</div>
          <input className="w-full rounded-lg border px-3 py-2" type="number" value={chapter} onChange={(e) => setChapter(Number(e.target.value))} />
        </label>

        <label className="text-sm">
          <div className="mb-1 text-zinc-600">Verse (optional)</div>
          <input className="w-full rounded-lg border px-3 py-2" value={verse} onChange={(e) => setVerse(e.target.value)} />
        </label>
      </div>

      <label className="text-sm block">
        <div className="mb-1 text-zinc-600">Commentary</div>
        <textarea className="w-full min-h-[220px] rounded-lg border px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <button onClick={save} disabled={saving} className="rounded-lg bg-black px-4 py-2 text-white">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
