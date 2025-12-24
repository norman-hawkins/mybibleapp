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
  ctx: { params: Promise<{ version: string }> }
) {
  const { version: rawVersion } = await ctx.params;
  const version = normalizeVersion(rawVersion);

  if (!version) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  try {
    const root = await resolveBibleRoot();
    const baseDir = path.join(root, version);

    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const books = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ ok: true, version, books });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Bible data not found" },
      { status: 500 }
    );
  }
}