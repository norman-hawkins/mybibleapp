import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: fetch "my draft for this verse" (continue draft)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const { searchParams } = new URL(req.url);
  const book = (searchParams.get("book") ?? "").toLowerCase();
  const chapter = Number(searchParams.get("chapter") ?? "");
  const verseParam = searchParams.get("verse");

  if (!book || !Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Missing/invalid book/chapter" }, { status: 400 });
  }

  const verse =
    verseParam === null || verseParam === "" ? null : Number(verseParam);

  if (verseParam !== null && verseParam !== "" && (!Number.isFinite(verse!) || verse! < 1)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }

  const row = await prisma.commentary.findFirst({
    where: {
      authorId: userId,
      book,
      chapter,
      verse: verse ?? null,
      status: CommentaryStatus.DRAFT,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      content: true,
      updatedAt: true,
      book: true,
      chapter: true,
      verse: true,
    },
  });

  return NextResponse.json({ ok: true, draft: row ?? null });
}

// POST: upsert draft (autosave + manual save)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as Role | undefined;

  // Only Contributor/Admin can write
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, book, chapter, verse, content } = body ?? {};

  if (!book || !chapter) {
    return NextResponse.json({ error: "Missing book/chapter" }, { status: 400 });
  }

  const b = String(book).toLowerCase();
  const c = Number(chapter);
  const v =
    verse === null || verse === undefined || verse === "" ? null : Number(verse);

  if (!b || !Number.isFinite(c) || c < 1) {
    return NextResponse.json({ error: "Invalid book/chapter" }, { status: 400 });
  }
  if (v !== null && (!Number.isFinite(v) || v < 1)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }

  const text = String(content ?? "");
  if (!text.trim()) {
    return NextResponse.json({ error: "Content is empty" }, { status: 400 });
  }

  // If client passed a draft id, update that draft (must belong to me)
  if (id) {
    const updated = await prisma.commentary.update({
      where: { id: String(id) },
      data: {
        content: text,
        status: CommentaryStatus.DRAFT,
        // keep the reference in sync
        book: b,
        chapter: c,
        verse: v,
        authorId: userId,
      },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, draft: updated });
  }

  // Otherwise: find existing draft for this verse, update if exists, else create
  const existing = await prisma.commentary.findFirst({
    where: {
      authorId: userId,
      book: b,
      chapter: c,
      verse: v,
      status: CommentaryStatus.DRAFT,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const draft = existing
    ? await prisma.commentary.update({
        where: { id: existing.id },
        data: { content: text },
        select: { id: true, status: true, updatedAt: true },
      })
    : await prisma.commentary.create({
        data: {
          authorId: userId,
          book: b,
          chapter: c,
          verse: v,
          content: text,
          status: CommentaryStatus.DRAFT,
        },
        select: { id: true, status: true, updatedAt: true },
      });

  return NextResponse.json({ ok: true, draft });
}
