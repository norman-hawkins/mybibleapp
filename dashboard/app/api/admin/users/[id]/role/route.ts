// app/api/admin/users/[id]/role/route.ts
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const meRole = (session?.user as any)?.role as Role | undefined;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (meRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = ctx.params.id;
  const body = await req.json().catch(() => null);
  const role = String(body?.role ?? "").toUpperCase();

  if (!["ADMIN", "CONTRIBUTOR", "USER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // (Optional safety) prevent self-demotion if you want:
  // const meId = (session.user as any).id as string;
  // if (id === meId && role !== "ADMIN") {
  //   return NextResponse.json({ error: "You can't demote yourself" }, { status: 400 });
  // }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: role as Role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}