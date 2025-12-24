import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseAnchors(anchorsJson?: string | null) {
  if (!anchorsJson) return [];
  try {
    const a = JSON.parse(anchorsJson);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const book = (searchParams.get("book") ?? "").toLowerCase();
  const chapter = Number(searchParams.get("chapter") ?? "");
  const verseParam = searchParams.get("verse");

  if (!book || !Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Missing/invalid book/chapter" }, { status: 400 });
  }

  const verse = verseParam ? Number(verseParam) : null;
  if (verseParam && (!Number.isFinite(verse!) || verse! < 1)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }

  const rows = await prisma.sourceSegment.findMany({
    where: {
      sourceKey: "ken_raggio",
      book,
      chapterStart: { lte: chapter },
      chapterEnd: { gte: chapter },
    },
    orderBy: [{ orderIndex: "asc" }],
    take: 200,
  });

  // Filter in-memory for verse matches including anchorsJson
  const filtered = rows.filter((r) => {
    if (verse === null) return r.verseStart === null && r.verseEnd === null; // chapter-only request
    if (r.verseStart !== null && r.verseEnd !== null) {
      if (verse >= r.verseStart && verse <= r.verseEnd) return true;
    }
    const anchors = parseAnchors(r.anchorsJson);
    return anchors.some((a: any) => Number(a?.chapter) === chapter && Number(a?.verse) === verse);
  });

  return NextResponse.json({
    ok: true,
    source: "ken_raggio",
    rows: filtered.map((r) => ({
      id: r.id,
      heading: r.heading,
      content: r.content,
      anchorRaw: r.anchorRaw,
      updatedAt: r.updatedAt,
    })),
  });
}