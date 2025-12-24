// app/api/bible/manifest/route.ts
import { constants as FS_CONSTANTS } from "fs";
import { access, readdir, stat } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function exists(p: string) {
  try {
    await access(p, FS_CONSTANTS.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bible JSON data root resolver.
 * Supports both:
 * - repoRoot/shared/bible-data   (when cwd is repo root)
 * - dashboard/../shared/bible-data (when cwd is dashboard)
 */
async function resolveBibleRoot() {
  const cwd = process.cwd();

  const candidates = [
    path.join(cwd, "shared", "bible-data"),
    path.join(cwd, "..", "shared", "bible-data"),
  ];

  for (const p of candidates) {
    if (await exists(p)) return p;
  }

  // fallback (keeps old behavior if someone runs with legacy layout)
  const legacy = path.join(cwd, "bible-data");
  return legacy;
}

async function listDirs(p: string) {
  const items = await readdir(p);
  const dirs: string[] = [];
  for (const name of items) {
    const full = path.join(p, name);
    try {
      const s = await stat(full);
      if (s.isDirectory()) dirs.push(name);
    } catch {}
  }
  return dirs.sort();
}

export async function GET() {
  const root = await resolveBibleRoot();
  const versions = await listDirs(root);

  const res = NextResponse.json({
    ok: true,
    versions,
    // keep it simple; mobile only needs versions + base path
    chapterEndpoint: "/api/bible/{version}/{book}/{chapter}",
  });

  res.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  );
  return res;
}