import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
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

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as Role | undefined;

  // Visibility rules:
  // - No session: only PUBLISHED
  // - ADMIN: all statuses
  // - CONTRIBUTOR/USER: PUBLISHED + own entries (any status)
  let where: any = { book, chapter, verse: verse ?? null };

  if (!session?.user) {
    where.status = "PUBLISHED";
  } else if (role === "ADMIN") {
    // all statuses, no extra filter
  } else {
    // non-admin signed in: show published + own
    where.OR = [{ status: "PUBLISHED" }, { authorId: userId }];
  }

  const rows = await prisma.commentary.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      status: true,
      content: true,
      updatedAt: true,
      authorId: true,
      author: { select: { name: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, rows });
}
