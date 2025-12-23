import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const rows = await prisma.commentary.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      book: true,
      chapter: true,
      verse: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, rows });
}