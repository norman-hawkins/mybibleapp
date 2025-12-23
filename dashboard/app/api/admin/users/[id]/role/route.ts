import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/admin/users/[id]/role
 * Admin-only: update user role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  const body = await req.json();
  const nextRole = body?.role as Role | undefined;

  if (!nextRole || !["ADMIN", "CONTRIBUTOR", "USER"].includes(nextRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: nextRole },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}