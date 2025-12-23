import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.commentary.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      book: true,
      chapter: true,
      verse: true,
      content: true,
      createdAt: true,
      author: { select: { email: true, name: true, role: true } },
    },
    take: 200,
  });

  return NextResponse.json({ ok: true, rows });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = body?.action as string | undefined;

  if (action === "approve_all") {
    await prisma.commentary.updateMany({
      where: { status: "PENDING_REVIEW" },
      data: { status: "PUBLISHED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject_all") {
    await prisma.commentary.updateMany({
      where: { status: "PENDING_REVIEW" },
      data: { status: "REJECTED" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}