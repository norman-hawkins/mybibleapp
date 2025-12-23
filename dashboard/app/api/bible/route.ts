// app/api/bible/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

const ALLOWED_VERSIONS = new Set(["WEB", "KJV"]);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}

async function readChapterFile(opts: { version: string; book: string; chapter: number }) {
  const base = path.join(process.cwd(), "bible-data", opts.version, opts.book);

  // Try common naming patterns: 01.json, 001.json, 1.json
  const candidates = [
    path.join(base, `${pad2(opts.chapter)}.json`),
    path.join(base, `${pad3(opts.chapter)}.json`),
    path.join(base, `${opts.chapter}.json`),
  ];

  let lastErr: any = null;

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("Chapter file not found");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const version = String(searchParams.get("version") ?? "WEB").toUpperCase();
    const book = String(searchParams.get("book") ?? "").toLowerCase();
    const chapter = Number(searchParams.get("chapter") ?? "");
    const verseParam = searchParams.get("verse");
    const verse = verseParam === null || verseParam === "" ? null : Number(verseParam);

    if (!ALLOWED_VERSIONS.has(version)) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }
    if (!book) {
      return NextResponse.json({ error: "Missing book" }, { status: 400 });
    }
    if (!Number.isFinite(chapter) || chapter < 1) {
      return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
    }
    if (verse !== null && (!Number.isFinite(verse) || verse < 1)) {
      return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
    }

    const chapterJson = await readChapterFile({ version, book, chapter });

    // Expected shape:
    // { book, chapter, verses: [{v, t}, ...] }
    const verses: Array<{ v: number; t: string }> = Array.isArray(chapterJson?.verses)
      ? chapterJson.verses
      : [];

    if (verse !== null) {
      const found = verses.find((x) => Number(x.v) === verse);
      if (!found) {
        return NextResponse.json({ error: "Verse not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        version,
        book,
        chapter,
        verse,
        text: String(found.t ?? ""),
      });
    }

    return NextResponse.json({
      ok: true,
      version,
      book,
      chapter,
      verses: verses.map((x) => ({ v: Number(x.v), t: String(x.t ?? "") })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
