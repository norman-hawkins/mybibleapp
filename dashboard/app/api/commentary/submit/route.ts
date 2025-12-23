import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Submit a draft for review OR publish directly if ADMIN
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as Role | undefined;

  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "Missing draft id" }, { status: 400 });
  }

  // Only allow submitting your own draft (admin can submit any draft, but we’ll keep it safe)
  const draft = await prisma.commentary.findUnique({
    where: { id: String(id) },
    select: { id: true, authorId: true, status: true },
  });

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (role !== "ADMIN" && draft.authorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (draft.status !== CommentaryStatus.DRAFT) {
    return NextResponse.json({ error: "Only drafts can be submitted" }, { status: 400 });
  }

  // Contributor submits → PENDING_REVIEW
  // Admin submits → PUBLISHED (and set review metadata)
  const nextStatus =
    role === "ADMIN" ? CommentaryStatus.PUBLISHED : CommentaryStatus.PENDING_REVIEW;

  const updated = await prisma.commentary.update({
    where: { id: draft.id },
    data:
      role === "ADMIN"
        ? {
            status: nextStatus,
            reviewedAt: new Date(),
            reviewedById: userId,
            rejectionReason: null,
          }
        : {
            status: nextStatus,
          },
    select: { id: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, row: updated });
}
