import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [draft, pending, published, contributors] = await Promise.all([
    prisma.commentary.count({ where: { status: "DRAFT" } }),
    prisma.commentary.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.commentary.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count({ where: { role: "CONTRIBUTOR" } }),
  ]);

  return NextResponse.json({
    ok: true,
    stats: { draft, pending, published, contributors },
  });
}
