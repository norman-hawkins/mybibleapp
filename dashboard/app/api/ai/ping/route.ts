import { requireAdmin } from "@/lib/requireAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { ok: false },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}