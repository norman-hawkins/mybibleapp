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

  const book = (searchParams.get("book") ?? "").toLowerCase().trim();
  const chapter = Number(searchParams.get("chapter") ?? "");
  const verseParam = searchParams.get("verse");
  const debug = (searchParams.get("debug") ?? "") === "1";

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
    select: {
      id: true,
      book: true,
      chapterStart: true,
      chapterEnd: true,
      verseStart: true,
      verseEnd: true,
      anchorsJson: true,
      heading: true,
      content: true,
      anchorRaw: true,
      orderIndex: true,
      updatedAt: true,
    },
  });

  const filtered = rows.filter((r) => {
    if (verse === null) {
      return r.verseStart === null && r.verseEnd === null;
    }

    const vs = r.verseStart;
    const ve = r.verseEnd;

    // Case 1: proper range
    if (vs !== null && ve !== null) return verse >= vs && verse <= ve;

    // Case 2: from chapter start → verseEnd
    if (vs === null && ve !== null) return verse <= ve;

    // Case 3: chapter-wide -> optionally allow anchorsJson match
    const anchors = parseAnchors(r.anchorsJson);
    return anchors.some((a: any) => Number(a?.chapter) === chapter && Number(a?.verse) === verse);
  });

  if (debug) {
    return NextResponse.json({
      ok: true,
      debug: {
        input: { book, chapter, verse },
        rowsCount: rows.length,
        filteredCount: filtered.length,
        sampleRows: rows.slice(0, 10).map((r) => ({
          id: r.id,
          book: r.book,
          chapterStart: r.chapterStart,
          verseStart: r.verseStart,
          verseEnd: r.verseEnd,
          orderIndex: r.orderIndex,
          anchorRaw: r.anchorRaw?.slice(0, 120) ?? null,
        })),
      },
    });
  }

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