import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/session";
import connectDB from "@/lib/db";
import User from "@/models/User";

/**
 * Role-Based Access Control helper.
 *
 * Permission Matrix:
 * ==================
 * | Module            | GET (list/detail) | POST (create) | PUT (update) | DELETE     |
 * |-------------------|-------------------|---------------|--------------|------------|
 * | barang            | admin, kasir      | admin         | admin        | admin      |
 * | pelanggan         | admin, kasir      | admin, kasir  | admin, kasir | admin      |
 * | supplier          | admin, kasir      | admin         | admin        | admin      |
 * | karyawan          | admin             | admin         | admin        | admin      |
 * | kas               | admin, kasir      | admin         | admin        | admin      |
 * | cabang            | admin, kasir      | admin         | admin        | admin      |
 * | jasa              | admin, kasir      | admin         | admin        | admin      |
 * | transaksi-jual    | admin, kasir      | admin, kasir  | admin        | admin      |
 * | transaksi-beli    | admin, kasir      | admin         | admin        | admin      |
 * | return-penjualan  | admin, kasir      | admin, kasir  | admin        | admin      |
 * | return-pembelian  | admin, kasir      | admin         | admin        | admin      |
 * | terima-piutang    | admin, kasir      | admin, kasir  | admin        | admin      |
 * | bayar-hutang      | admin, kasir      | admin         | admin        | admin      |
 * | terima-return     | admin, kasir      | admin, kasir  | admin        | admin      |
 * | koreksi-stok      | admin             | admin         | admin        | admin      |
 */

export type RequireRoleResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

/**
 * Validate session exists AND user has one of the allowed roles.
 * Also checks that the user account is still active in the database.
 * Returns the session payload on success, or a 401/403 response on failure.
 */
export async function requireRole(
  allowedRoles: SessionPayload["role"][]
): Promise<RequireRoleResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Forbidden - akses ditolak" },
        { status: 403 }
      ),
    };
  }

  // Quick DB check: pastikan user masih aktif
  try {
    await connectDB();
    const user = await User.findById(session.userId).select("isActive").lean();
    if (!user || !user.isActive) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Akun telah dinonaktifkan" },
          { status: 403 }
        ),
      };
    }
  } catch {
    // If DB check fails (e.g. connection issue), allow through —
    // session JWT is still valid and expires in 2h max.
    // This is a graceful degradation.
  }

  return { ok: true, session };
}
