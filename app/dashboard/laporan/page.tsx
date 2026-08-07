import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LaporanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Laporan</h1>
      <p className="text-gray-500 text-sm">
        Pilih menu laporan di atas untuk melihat laporan.
      </p>
    </div>
  );
}
