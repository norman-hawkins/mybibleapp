// app/dashboard/layout.tsx
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import SessionWrap from "@/components/auth/SessionWrap";
import Sidebar from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/signin");

  return (
    <SessionWrap session={session}>
      <div className="p-6">
        <div className="mx-auto flex max-w-7xl gap-6">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </SessionWrap>
  );
}