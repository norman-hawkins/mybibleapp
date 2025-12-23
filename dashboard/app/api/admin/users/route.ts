import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = body?.name ? String(body.name).trim() : null;
  const password = String(body?.password ?? "");
  const nextRole = String(body?.role ?? "CONTRIBUTOR").toUpperCase() as Role;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }

  if (!["ADMIN", "CONTRIBUTOR", "USER"].includes(nextRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name ?? undefined,
      role: nextRole,
      passwordHash,
    },
    create: {
      email,
      name,
      role: nextRole,
      passwordHash,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user });
}
