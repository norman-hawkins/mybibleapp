import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE_KEY = "ken_raggio";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const book = (searchParams.get("book") ?? "").toLowerCase().trim();
  const chapter = Number(searchParams.get("chapter") ?? "");
  const verseParam = searchParams.get("verse");
  const verse =
    verseParam === null || verseParam === "" ? null : Number(verseParam);

  if (!book || !Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json(
      { error: "Missing/invalid book/chapter" },
      { status: 400 }
    );
  }
  if (verse !== null && (!Number.isFinite(verse) || verse < 1)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }

  // 1) Approved contributors (PUBLISHED only)
  const [verseNotes, chapterNotes] = await Promise.all([
    verse !== null
      ? prisma.commentary.findMany({
          where: { book, chapter, verse, status: "PUBLISHED" },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            status: true,
            content: true,
            updatedAt: true,
            author: { select: { name: true, email: true, role: true } },
          },
        })
      : Promise.resolve([]),
    prisma.commentary.findMany({
      where: { book, chapter, verse: null, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        content: true,
        updatedAt: true,
        author: { select: { name: true, email: true, role: true } },
      },
    }),
  ]);

  // 2) Ken Raggio segments:
  // - if verse is provided: include verse-matching OR chapter-wide (verseStart/end null)
  // - if verse is null: include chapter-wide only
  const kenWhere: any = {
    sourceKey: SOURCE_KEY,
    book,
    chapterStart: { lte: chapter },
    chapterEnd: { gte: chapter },
  };

  if (verse === null) {
    kenWhere.verseStart = null;
    kenWhere.verseEnd = null;
  } else {
    kenWhere.OR = [
      { verseStart: null, verseEnd: null }, // chapter-wise sections
      {
        AND: [{ verseStart: { lte: verse } }, { verseEnd: { gte: verse } }],
      },
    ];
  }

  const ken = await prisma.sourceSegment.findMany({
    where: kenWhere,
    orderBy: [{ orderIndex: "asc" }],
    take: 200,
    select: {
      id: true,
      sourceKey: true,
      book: true,
      chapterStart: true,
      chapterEnd: true,
      verseStart: true,
      verseEnd: true,
      heading: true,
      content: true,
      anchorRaw: true,
      orderIndex: true,
    },
  });

  return NextResponse.json({
    ok: true,
    book,
    chapter,
    verse,
    verseNotes,
    chapterNotes,
    ken,
  });
}