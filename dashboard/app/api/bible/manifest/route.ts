// app/api/bible/manifest/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { readdir, stat } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const root = path.join(process.cwd(), "bible-data");
  const versions = await listDirs(root);

  const res = NextResponse.json({
    ok: true,
    versions,
    // keep it simple; mobile only needs versions + base path
    chapterEndpoint: "/api/bible/{version}/{book}/{chapter}",
  });

  res.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return res;
}
