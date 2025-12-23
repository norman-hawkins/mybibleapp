import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as Role | undefined;
    const reviewerId = (session.user as any).id as string | undefined;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; // ✅ IMPORTANT (await params)
    if (!id) {
      return NextResponse.json({ error: "Missing id param" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "").toUpperCase();
    const reason = body?.reason ? String(body.reason).trim() : null;

    if (status !== "PUBLISHED" && status !== "REJECTED") {
      return NextResponse.json(
        { error: "Invalid status. Use PUBLISHED or REJECTED." },
        { status: 400 }
      );
    }

    const updated = await prisma.commentary.update({
      where: { id },
      data: {
        status: status as CommentaryStatus,
        reviewedAt: new Date(),
        reviewedById: reviewerId!,
        rejectionReason: status === "REJECTED" ? reason : null,
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        rejectionReason: true,
        reviewedById: true,
      },
    });

    return NextResponse.json({ ok: true, commentary: updated });
  } catch (err: any) {
    console.error("APPROVE/REJECT ERROR:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}