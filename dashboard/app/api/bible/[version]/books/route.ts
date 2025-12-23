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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ version: string }> }
) {
  const { version: rawVersion } = await ctx.params;
  const version = normalizeVersion(rawVersion);

  if (!version) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const root = process.cwd();
  const baseDir = path.join(root, "bible-data", version);

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const books = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ ok: true, version, books });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Bible data folder not found",
        detail: err?.message ?? String(err),
        baseDir,
      },
      { status: 500 }
    );
  }
}