import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <Navbar user={{ name: session.name, role: session.role, menuPermissions: session.menuPermissions ?? [] }} />
      <main className="flex-1 overflow-hidden p-4">{children}</main>
    </div>
  );
}
