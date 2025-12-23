import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as Role | undefined;

  const body = await req.json();
  const { book, chapter, verse, content, submit } = body ?? {};

  if (!book || !chapter || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const status: CommentaryStatus = submit
    ? role === "ADMIN"
      ? "PUBLISHED"
      : "PENDING_REVIEW"
    : "DRAFT";

  const row = await prisma.commentary.create({
    data: {
      book: String(book).toLowerCase(),
      chapter: Number(chapter),
      verse: verse === null || verse === undefined || verse === "" ? null : Number(verse),
      content: String(content),
      status,
      authorId: userId,
    },
    select: {
      id: true,
      status: true,
      book: true,
      chapter: true,
      verse: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, commentary: row });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // ✅ Edit-mode fetch by id (auth required)
  const id = searchParams.get("id");
  if (id) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const role = (session.user as any).role as Role | undefined;

    const row = await prisma.commentary.findUnique({
      where: { id },
      select: {
        id: true,
        book: true,
        chapter: true,
        verse: true,
        status: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ADMIN can load anything; otherwise only author can edit/view edit-mode
    if (role !== "ADMIN" && row.authorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, commentary: row });
  }

  // ✅ Existing behavior: published lookup by reference
  const book = (searchParams.get("book") ?? "").toLowerCase();
  const chapter = searchParams.get("chapter");
  const verse = searchParams.get("verse");

  if (!book || !chapter) {
    return NextResponse.json({ error: "Missing book/chapter" }, { status: 400 });
  }

  const rows = await prisma.commentary.findMany({
    where: {
      book,
      chapter: Number(chapter),
      verse: verse ? Number(verse) : null,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      author: { select: { name: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as Role | undefined;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.commentary.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role !== "ADMIN" && existing.authorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { book, chapter, verse, content, submit } = body ?? {};

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  const nextStatus: CommentaryStatus = submit
    ? role === "ADMIN"
      ? "PUBLISHED"
      : "PENDING_REVIEW"
    : "DRAFT";

  const updated = await prisma.commentary.update({
    where: { id },
    data: {
      book: book ? String(book).toLowerCase() : undefined,
      chapter: chapter ? Number(chapter) : undefined,
      verse: verse === null || verse === undefined || verse === "" ? null : Number(verse),
      content: String(content),
      status: nextStatus,
    },
    select: {
      id: true,
      status: true,
      book: true,
      chapter: true,
      verse: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, commentary: updated });
}
