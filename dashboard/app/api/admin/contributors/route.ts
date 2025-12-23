import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.user.findMany({
    where: { role: "CONTRIBUTOR" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Email + password (min 6 chars) required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "CONTRIBUTOR", passwordHash },
    create: { email, role: "CONTRIBUTOR", passwordHash },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user });
}
