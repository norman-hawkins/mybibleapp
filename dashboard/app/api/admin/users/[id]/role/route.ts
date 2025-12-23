import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/admin/users/[id]/role
 * Body: { role: Role }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const role = body?.role as Role | undefined;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error("PATCH /admin/users/[id]/role failed:", error);

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}