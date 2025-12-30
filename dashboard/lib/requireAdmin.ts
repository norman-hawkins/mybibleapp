import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }

  return session;
}