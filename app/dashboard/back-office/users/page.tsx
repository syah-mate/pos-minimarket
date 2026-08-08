'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  menuPermissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
}

interface UserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  menuPermissions: string[];
  isActive: boolean;
}

// ─── Menu definitions for permissions ─────────────────────────────────────────

interface MenuCheckItem {
  key: string;
  label: string;
}

interface MenuGroup {
  label: string;
  items: MenuCheckItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Master',
    items: [
      { key: '/dashboard/master/barang', label: 'Barang' },
      { key: '/dashboard/master/jasa', label: 'Jasa' },
      { key: '/dashboard/master/pelanggan', label: 'Pelanggan' },
      { key: '/dashboard/master/cabang', label: 'Cabang' },
      { key: '/dashboard/master/supplier', label: 'Supplier' },
      { key: '/dashboard/master/karyawan', label: 'Karyawan' },
      { key: '/dashboard/master/kas', label: 'Kas' },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { key: '/dashboard/transaksi/beli', label: 'Pembelian' },
      { key: '/dashboard/transaksi/jual', label: 'Penjualan' },
      { key: '/dashboard/transaksi/return-pembelian', label: 'Return Pembelian' },
      { key: '/dashboard/transaksi/terima-return', label: 'Terima Return' },
      { key: '/dashboard/transaksi/return-penjualan', label: 'Return Penjualan' },
      { key: '/dashboard/transaksi/bayar-hutang', label: 'Bayar Hutang' },
      { key: '/dashboard/transaksi/terima-piutang', label: 'Terima Piutang' },
    ],
  },
  {
    label: 'Back Office',
    items: [
      { key: '/dashboard/back-office/koreksi-stok', label: 'Koreksi Stok' },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { key: '/dashboard/laporan/pembelian', label: 'Laporan Pembelian' },
      { key: '/dashboard/laporan/penjualan', label: 'Laporan Penjualan' },
      { key: '/dashboard/laporan/stok', label: 'Laporan Stok' },
      { key: '/dashboard/laporan/laba-rugi', label: 'Laba Rugi' },
    ],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: UserInput = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'kasir',
  menuPermissions: [],
  isActive: true,
};

const TABLE_COLS = [
  { key: 'name', label: 'NAMA', cls: 'min-w-48' },
  { key: 'username', label: 'USERNAME', cls: 'min-w-36' },
  { key: 'email', label: 'EMAIL', cls: 'min-w-48' },
  { key: 'role', label: 'ROLE', cls: 'min-w-20' },
  { key: 'status', label: 'STATUS', cls: 'min-w-20' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  initialData: UserInput;
  onClose: () => void;
  onSave: (data: UserInput) => Promise<void>;
  saving: boolean;
}

function UserModal({ mode, initialData, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<UserInput>(initialData);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function set<K extends keyof UserInput>(field: K, value: UserInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMenu(key: string) {
    setForm((prev) => {
      const perms = prev.menuPermissions.includes(key)
        ? prev.menuPermissions.filter((k) => k !== key)
        : [...prev.menuPermissions, key];
      return { ...prev, menuPermissions: perms };
    });
  }

  function toggleAllGroup(items: MenuCheckItem[]) {
    setForm((prev) => {
      const keys = items.map((i) => i.key);
      const allChecked = keys.every((k) => prev.menuPermissions.includes(k));
      let newPerms: string[];
      if (allChecked) {
        newPerms = prev.menuPermissions.filter((k) => !keys.includes(k));
      } else {
        const toAdd = keys.filter((k) => !prev.menuPermissions.includes(k));
        newPerms = [...prev.menuPermissions, ...toAdd];
      }
      return { ...prev, menuPermissions: newPerms };
    });
  }

  function selectAll() {
    setForm((prev) => {
      const allKeys = MENU_GROUPS.flatMap((g) => g.items.map((i) => i.key));
      const allChecked = allKeys.every((k) => prev.menuPermissions.includes(k));
      return { ...prev, menuPermissions: allChecked ? [] : allKeys };
    });
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white';
  const lbl = 'block text-xs text-gray-600 mb-0.5';

  const title =
    mode === 'edit'
      ? `Edit User — ${initialData.name} (${initialData.username})`
      : 'Tambah User Baru';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F8') {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form]);

  const allKeys = MENU_GROUPS.flatMap((g) => g.items.map((i) => i.key));
  const allChecked = allKeys.length > 0 && allKeys.every((k) => form.menuPermissions.includes(k));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-2xl w-[600px] max-h-[90vh] flex flex-col border border-gray-300">
        {/* Title */}
        <div className="bg-indigo-100 border-b border-indigo-300 px-4 py-2 rounded-t flex justify-between items-center">
          <span className="font-semibold text-sm text-gray-700">{title}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-lg leading-none">&times;</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {/* User Identity */}
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">Identitas User</legend>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <label className={lbl}>Nama</label>
                  <input className={inp} value={form.name}
                    onChange={(e) => set('name', e.target.value)} required placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className={lbl}>Username</label>
                  <input className={inp} value={form.username}
                    onChange={(e) => set('username', e.target.value)} required placeholder="Username login" />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input className={inp} value={form.email}
                    onChange={(e) => set('email', e.target.value)} required type="email" placeholder="email@example.com" />
                </div>
                <div>
                  <label className={lbl}>
                    Password {mode === 'edit' && <span className="text-gray-400">(kosongkan jika tidak diubah)</span>}
                  </label>
                  <div className="relative">
                    <input className={inp} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required={mode === 'add'}
                      placeholder={mode === 'edit' ? '••••••' : 'Minimal 6 karakter'} />
                    <button type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Role</label>
                  <select className={inp} value={form.role}
                    onChange={(e) => set('role', e.target.value)}>
                    <option value="kasir">Kasir</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isActive}
                      onChange={(e) => set('isActive', e.target.checked)}
                      className="w-3.5 h-3.5 accent-green-600" />
                    Akun Aktif
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Menu Permissions */}
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">Hak Akses Menu</legend>
              <div className="mt-1 mb-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={allChecked}
                    onChange={selectAll}
                    className="w-3.5 h-3.5 accent-indigo-600" />
                  <strong>Pilih Semua</strong>
                </label>
                <span className="text-xs text-gray-400">
                  ({form.menuPermissions.length} menu dipilih)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MENU_GROUPS.map((group) => {
                  const groupKeys = group.items.map((i) => i.key);
                  const groupAllChecked = groupKeys.length > 0 && groupKeys.every((k) => form.menuPermissions.includes(k));
                  const groupSomeChecked = groupKeys.some((k) => form.menuPermissions.includes(k));
                  return (
                    <div key={group.label} className="border border-gray-200 rounded p-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer select-none mb-1.5 pb-1.5 border-b border-gray-100">
                        <input type="checkbox"
                          checked={groupAllChecked}
                          ref={(el) => { if (el) el.indeterminate = !groupAllChecked && groupSomeChecked; }}
                          onChange={() => toggleAllGroup(group.items)}
                          className="w-3 h-3 accent-indigo-600" />
                        {group.label}
                      </label>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <label key={item.key}
                            className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none hover:text-gray-900">
                            <input type="checkbox" checked={form.menuPermissions.includes(item.key)}
                              onChange={() => toggleMenu(item.key)}
                              className="w-3 h-3 accent-indigo-600" />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-5 py-2 rounded shadow">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
              {saving ? 'Menyimpan...' : 'Simpan [F8]'}
            </button>
            <button type="button" onClick={onClose}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-5 py-2 rounded shadow">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Keluar [ESC]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [list, setList] = useState<IUser[]>([]);
  const [filtered, setFiltered] = useState<IUser[]>([]);
  const [selected, setSelected] = useState<IUser | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setList(data);
      setFiltered(data);
    } catch {
      setError('Gagal memuat data. Pastikan koneksi database aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    );
  }, [search, list]);

  async function handleSave(formData: UserInput) {
    setSaving(true);
    setError('');
    try {
      const url = modalMode === 'edit' && selected ? `/api/users/${selected._id}` : '/api/users';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      // Don't send empty password on edit
      const body: Record<string, unknown> = { ...formData };
      if (modalMode === 'edit' && !body.password) {
        delete body.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Gagal menyimpan');
      setModalMode(null);
      setSelected(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Hapus user "${selected.name}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/users/${selected._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Gagal menghapus');
      setSelected(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data');
    }
  }

  const initialFormData: UserInput =
    modalMode === 'edit' && selected
      ? {
          name: selected.name,
          username: selected.username,
          email: selected.email ?? '',
          password: '',
          role: selected.role,
          menuPermissions: selected.menuPermissions ?? [],
          isActive: selected.isActive,
        }
      : EMPTY_FORM;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-md border border-indigo-200 bg-white"
      style={{ height: 'calc(100vh - 185px)' }}
    >
      {/* Title bar */}
      <div className="bg-indigo-700 text-white px-4 py-2 font-bold text-sm shrink-0">
        MANAJEMEN USER
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Cari:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama, username, email, atau role..."
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-72"
        />
        <span className="text-xs text-gray-400">{filtered.length} user</span>
        {error && (
          <span className="text-red-500 text-xs ml-auto bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '500px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-indigo-600 text-white">
              <th className="w-5 border-r border-indigo-500 px-1" />
              {TABLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.cls} px-2 py-2 font-semibold border-r border-indigo-500 whitespace-nowrap text-left last:border-r-0`}
                >
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 font-semibold whitespace-nowrap text-left">MENU</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 2} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memuat data...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 2} className="text-center py-12 text-gray-400 italic">
                  {search ? 'Tidak ada user yang sesuai pencarian.' : 'Belum ada data user. Klik Tambah untuk menambahkan.'}
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => {
                const isSelected = selected?._id === u._id;
                const menuCount = u.menuPermissions?.length ?? 0;
                return (
                  <tr
                    key={u._id}
                    onClick={() => setSelected(isSelected ? null : u)}
                    onDoubleClick={() => { setSelected(u); setModalMode('edit'); }}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-indigo-200 text-indigo-900'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-indigo-50'
                        : 'bg-gray-50 hover:bg-indigo-50'
                    }`}
                  >
                    <td className="border-r border-gray-100 text-center text-gray-300 select-none w-5">≡</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">{u.name}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap font-mono">{u.username}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap text-gray-600">{u.email}</td>
                    <td className="px-2 py-1 border-r border-gray-100">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-100">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-gray-500">
                      {u.role === 'admin' ? (
                        <span className="text-purple-600 font-medium">Semua Menu</span>
                      ) : menuCount === 0 ? (
                        <span className="text-red-400 italic">Tidak ada</span>
                      ) : (
                        <span>{menuCount} menu</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => { setSelected(null); setModalMode('add'); }}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah
        </button>
        <button
          onClick={() => selected && setModalMode('edit')}
          disabled={!selected}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selected}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Hapus
        </button>

        {selected && (
          <span className="ml-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
            Dipilih: <strong>{selected.name}</strong>
          </span>
        )}

        <div className="ml-auto">
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          initialData={initialFormData}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
