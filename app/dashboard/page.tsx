import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Selamat Datang</h1>
      <p className="text-gray-500 text-sm">
        Halo, <span className="font-semibold text-blue-700">{session.name}</span>. Pilih menu di atas untuk memulai.
      </p>
    </div>
  );
}
