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

  try {
    const root = await resolveBibleRoot();
    const bookDir = path.join(root, version, book);

    const entries = await fs.readdir(bookDir, { withFileTypes: true });

    const chapters = entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => Number(e.name.replace(".json", "")))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    return NextResponse.json({ ok: true, version, book, chapters });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Book not found" },
      { status: 404 }
    );
  }
}