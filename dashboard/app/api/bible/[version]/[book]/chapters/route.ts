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
  // Keep your dataset format (lowercase, no spaces)
  return String(input || "").trim().toLowerCase();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ version: string; book: string }> }
) {
  const { version: rawVersion, book: rawBook } = await ctx.params;
  const version = normalizeVersion(rawVersion);
  const book = normalizeBook(rawBook);

  if (!version) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }
  if (!book) {
    return NextResponse.json({ error: "Invalid book" }, { status: 400 });
  }

  const root = process.cwd();
  const bookDir = path.join(root, "bible-data", version, book);

  try {
    const entries = await fs.readdir(bookDir, { withFileTypes: true });

    const chapters = entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => e.name.replace(".json", ""))
      .map((name) => Number(name))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    return NextResponse.json({ ok: true, version, book, chapters });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Book folder not found",
        detail: err?.message ?? String(err),
        bookDir,
      },
      { status: 404 }
    );
  }
}