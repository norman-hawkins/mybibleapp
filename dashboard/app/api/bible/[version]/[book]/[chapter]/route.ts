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
  // Your files are like 01.json, 02.json, etc.
  return String(n).padStart(2, "0");
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

  if (!version) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }
  if (!book) {
    return NextResponse.json({ error: "Invalid book" }, { status: 400 });
  }
  if (!chapterFile) {
    return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
  }

  const root = process.cwd();
  const filePath = path.join(root, "bible-data", version, book, `${chapterFile}.json`);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    return NextResponse.json({ ok: true, version, book, chapter: Number(rawChapter), data: json });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Chapter file not found",
        detail: err?.message ?? String(err),
        filePath,
      },
      { status: 404 }
    );
  }
}