import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/authz';

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  try {
    const { name, username, password, role, menuPermissions, isActive, mustChangePassword } = body;

    // Build update object
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (menuPermissions !== undefined) update.menuPermissions = menuPermissions;
    if (isActive !== undefined) update.isActive = isActive;
    if (mustChangePassword !== undefined) update.mustChangePassword = mustChangePassword;

    // Check duplicate username if changed
    if (username !== undefined) {
      const trimmed = username.toLowerCase().trim();
      const dup = await User.findOne({ username: trimmed, _id: { $ne: id } });
      if (dup) {
        return NextResponse.json(
          { message: 'Username sudah digunakan oleh user lain' },
          { status: 409 }
        );
      }
      update.username = trimmed;
    }

    // Hash password if provided
    if (password && password.trim() !== '') {
      update.password = await bcrypt.hash(password, 12);
    }

    const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
    if (!updated) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;

  // Prevent deleting own account
  if (id === auth.session.userId) {
    return NextResponse.json(
      { message: 'Tidak dapat menghapus akun sendiri' },
      { status: 400 }
    );
  }

  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ message: 'Berhasil dihapus' });
}
