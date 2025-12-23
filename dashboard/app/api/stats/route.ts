import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentaryStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as Role | undefined;
  const userId = (session.user as any).id as string;

  // Admin sees global counts, contributor sees only their own.
  const whereBase = role === "ADMIN" ? {} : { authorId: userId };

  const [draft, pending, published, rejected] = await Promise.all([
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.DRAFT } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.PENDING_REVIEW } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.PUBLISHED } }),
    prisma.commentary.count({ where: { ...whereBase, status: CommentaryStatus.REJECTED } }),
  ]);

  const contributors =
    role === "ADMIN"
      ? await prisma.user.count({ where: { role: Role.CONTRIBUTOR } })
      : null;

  return NextResponse.json({
    ok: true,
    role,
    counts: {
      draft,
      pending,
      published,
      rejected,
      contributors,
    },
  });
}
