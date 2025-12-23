// app/api/commentary/item/route.ts
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as Role | undefined;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, action } = body ?? {};

  if (!id || !action) return NextResponse.json({ error: "Missing id/action" }, { status: 400 });

  let status: CommentaryStatus;
  if (action === "approve") status = "PUBLISHED";
  else if (action === "reject") status = "REJECTED";
  else if (action === "draft") status = "DRAFT";
  else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const updated = await prisma.commentary.update({
    where: { id: String(id) },
    data: { status },
    select: { id: true, status: true, book: true, chapter: true, verse: true },
  });

  return NextResponse.json({ ok: true, commentary: updated });
}
