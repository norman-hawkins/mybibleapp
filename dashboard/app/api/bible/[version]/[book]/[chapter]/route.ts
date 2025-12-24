import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

function normalizeVersion(input: string) {
  const v = String(input || "").trim().toUpperCase();
  if (v === "KJV") return "KJV";
  if (v === "WEB") return "WEB";
  return null;
}

function normalizeBook(input: string) {
  return String(input || "").trim().toLowerCase();
}

function normalizeChapter(input: string) {
  const n = Number(String(input || "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n).padStart(2, "0");
}

async function resolveBibleRoot() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "shared", "bible-data"),
    path.join(cwd, "..", "shared", "bible-data"),
  ];

  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }

  throw new Error("Bible data root not found");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ version: string; book: string; chapter: string }> }
) {
  const { version: rawVersion, book: rawBook, chapter: rawChapter } =
    await ctx.params;

  const version = normalizeVersion(rawVersion);
  const book = normalizeBook(rawBook);
  const chapterFile = normalizeChapter(rawChapter);

  if (!version || !book || !chapterFile) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const root = await resolveBibleRoot();
    const filePath = path.join(root, version, book, `${chapterFile}.json`);

    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw);

    return NextResponse.json({
      ok: true,
      version,
      book,
      chapter: Number(rawChapter),
      data: json,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Chapter not found" },
      { status: 404 }
    );
  }
}