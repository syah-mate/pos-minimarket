'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

type TabId = 'master' | 'transaksi' | 'back-office' | 'laporan';

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href?: string;
  colorKey?: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
  allowedRoles?: string[]; // if undefined, visible to all roles
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface NavTab {
  id: TabId;
  label: string;
  groups: MenuGroup[];
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconBarang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function IconJasa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconPelanggan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconCabang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconSupplier() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function IconKaryawan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconKas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function IconBeli() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function IconJual() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}

function IconReturnPembelian() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function IconTerimaReturn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
    </svg>
  );
}

function IconReturnPenjualan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  );
}

function IconKoreksiStok() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13V8l5 5h-4a1 1 0 01-1-1z" />
    </svg>
  );
}

function IconBayarHutang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconTerimaPiutang() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function IconLaporanPembelian() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconLaporanPenjualan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconLaporanStok() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconLaporanLabaRugi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  );
}

// ── Menu config ────────────────────────────────────────────────────────────

const TABS: NavTab[] = [
  {
    id: 'master',
    label: 'Master',
    groups: [
      {
        label: 'Data',
        items: [
          { label: 'Barang',    href: '/dashboard/master/barang',    icon: <IconBarang /> },
          { label: 'Jasa',      href: '/dashboard/master/jasa',      icon: <IconJasa /> },
          { label: 'Pelanggan', href: '/dashboard/master/pelanggan', icon: <IconPelanggan /> },
          { label: 'Cabang',    href: '/dashboard/master/cabang',    icon: <IconCabang /> },
          { label: 'Supplier',  href: '/dashboard/master/supplier',  icon: <IconSupplier /> },
          { label: 'Karyawan',  href: '/dashboard/master/karyawan',  icon: <IconKaryawan />, allowedRoles: ['admin'] },
          { label: 'Kas',       href: '/dashboard/master/kas',       icon: <IconKas /> },
        ],
      },
    ],
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    groups: [
      {
        label: 'Transaksi',
        items: [
          { label: 'Beli', href: '/dashboard/transaksi/beli', icon: <IconBeli /> },
          {
            label: 'Jual',
            colorKey: '/dashboard/transaksi/jual',
            icon: <IconJual />,
            subItems: [
              { label: 'Penjualan Toko',   href: '/dashboard/transaksi/jual/toko' },
              { label: 'Penjualan Partai', href: '/dashboard/transaksi/jual/partai' },
              { label: 'Penjualan Cabang', href: '/dashboard/transaksi/jual/cabang' },
            ],
          },
        ],
      },
      {
        label: 'Return',
        items: [
          { label: 'Return Pembelian',  href: '/dashboard/transaksi/return-pembelian',  icon: <IconReturnPembelian /> },
          { label: 'Terima Return',     href: '/dashboard/transaksi/terima-return',     icon: <IconTerimaReturn /> },
          { label: 'Return Penjualan',  href: '/dashboard/transaksi/return-penjualan',  icon: <IconReturnPenjualan /> },
        ],
      },
      {
        label: 'Hutang Piutang',
        items: [
          { label: 'Bayar Hutang',   href: '/dashboard/transaksi/bayar-hutang',   icon: <IconBayarHutang /> },
          { label: 'Terima Piutang', href: '/dashboard/transaksi/terima-piutang', icon: <IconTerimaPiutang /> },
        ],
      },
    ],
  },
  { id: 'back-office', label: 'Back Office', groups: [
      {
        label: 'Tools',
        items: [
          { label: 'Koreksi Stok', href: '/dashboard/back-office/koreksi-stok', icon: <IconKoreksiStok />, allowedRoles: ['admin'] },
        ],
      },
    ] },
  {
    id: 'laporan',
    label: 'Laporan',
    groups: [
      {
        label: 'Laporan',
        items: [
          {
            label: 'Pembelian',
            colorKey: '/dashboard/laporan/pembelian',
            icon: <IconLaporanPembelian />,
            subItems: [
              { label: 'By Barang',   href: '/dashboard/laporan/pembelian/by-barang' },
              { label: 'By Periode',  href: '/dashboard/laporan/pembelian/by-periode' },
              { label: 'By Supplier', href: '/dashboard/laporan/pembelian/by-supplier' },
            ],
          },
          {
            label: 'Penjualan',
            colorKey: '/dashboard/laporan/penjualan',
            icon: <IconLaporanPenjualan />,
            subItems: [
              { label: 'By Barang',   href: '/dashboard/laporan/penjualan/by-barang' },
              { label: 'By Kasir',    href: '/dashboard/laporan/penjualan/by-kasir' },
              { label: 'By Periode',  href: '/dashboard/laporan/penjualan/by-periode' },
              { label: 'By Supplier', href: '/dashboard/laporan/penjualan/by-supplier' },
            ],
          },
          { label: 'Stok',      href: '/dashboard/laporan/stok',      icon: <IconLaporanStok /> },
          { label: 'Laba Rugi', href: '/dashboard/laporan/laba-rugi', icon: <IconLaporanLabaRugi /> },
        ],
      },
    ],
  },
];

const ICON_COLORS: Record<string, string> = {
  '/dashboard/master/barang':    'text-blue-600',
  '/dashboard/master/jasa':      'text-green-600',
  '/dashboard/master/pelanggan': 'text-purple-600',
  '/dashboard/master/cabang':    'text-indigo-600',
  '/dashboard/master/supplier':  'text-orange-500',
  '/dashboard/master/karyawan':  'text-teal-600',
  '/dashboard/master/kas':                     'text-yellow-600',
  '/dashboard/transaksi/beli':                  'text-blue-700',
  '/dashboard/transaksi/jual':                  'text-green-600',
  '/dashboard/transaksi/jual/toko':              'text-green-600',
  '/dashboard/transaksi/jual/partai':            'text-green-600',
  '/dashboard/transaksi/jual/cabang':            'text-green-600',
  '/dashboard/transaksi/return-pembelian':      'text-orange-500',
  '/dashboard/transaksi/terima-return':         'text-purple-600',
  '/dashboard/transaksi/return-penjualan':      'text-red-500',
  '/dashboard/transaksi/bayar-hutang':          'text-red-700',
  '/dashboard/transaksi/terima-piutang':        'text-teal-600',
  '/dashboard/back-office/koreksi-stok':        'text-indigo-600',
  '/dashboard/laporan/pembelian':               'text-blue-700',
  '/dashboard/laporan/pembelian/by-barang':     'text-blue-700',
  '/dashboard/laporan/pembelian/by-periode':    'text-blue-700',
  '/dashboard/laporan/pembelian/by-supplier':   'text-blue-700',
  '/dashboard/laporan/penjualan':               'text-green-600',
  '/dashboard/laporan/penjualan/by-barang':     'text-green-600',
  '/dashboard/laporan/penjualan/by-kasir':      'text-green-600',
  '/dashboard/laporan/penjualan/by-periode':    'text-green-600',
  '/dashboard/laporan/penjualan/by-supplier':   'text-green-600',
  '/dashboard/laporan/stok':                    'text-amber-600',
  '/dashboard/laporan/laba-rugi':               'text-rose-600',
};

function getTabFromPath(pathname: string): TabId {
  if (pathname.startsWith('/dashboard/master'))      return 'master';
  if (pathname.startsWith('/dashboard/transaksi'))   return 'transaksi';
  if (pathname.startsWith('/dashboard/back-office')) return 'back-office';
  if (pathname.startsWith('/dashboard/laporan'))     return 'laporan';
  return 'master';
}

// ── Props ──────────────────────────────────────────────────────────────────

interface NavbarProps {
  user: { name: string; role: string };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromPath(pathname));
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
    setOpenSubmenu(null);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="select-none shadow-md">
      {/* ── Tab bar ── */}
      <div className="flex items-end bg-linear-to-b from-blue-200 to-blue-100 border-b border-blue-400 px-2 pt-1">
        {/* Tabs */}
        <div className="flex items-end gap-px">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-1.5 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${
                  isActive
                    ? 'bg-white border-blue-400 text-blue-800 -mb-px z-10 relative'
                    : 'bg-blue-50 border-blue-300 text-gray-600 hover:bg-blue-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* User info + logout */}
        <div className="ml-auto flex items-center gap-3 pb-1.5">
          <div className="text-xs text-gray-600 leading-tight text-right">
            <p className="font-semibold text-gray-800">{user.name}</p>
            <p className="capitalize text-gray-500">{user.role}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1.5 rounded font-medium transition"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>

      {/* ── Ribbon ── */}
      <div className="bg-white border-b border-blue-300 flex items-stretch min-h-19" ref={submenuRef}>
        {currentTab.groups.length > 0 ? (
          currentTab.groups.map((group, gi) => (
            <div key={gi} className="flex items-stretch">
              {/* Group separator */}
              {gi > 0 && (
                <div className="w-px bg-blue-200 my-2 mx-1" />
              )}

              <div className="flex flex-col">
                {/* Buttons */}
                <div className="flex items-start gap-0.5 px-2 pt-1.5 flex-1">
                  {group.items
                    .filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role))
                    .map((item) => {
                    const colorKey = item.href ?? item.colorKey ?? '';
                    const isActiveItem = item.href
                      ? pathname.startsWith(item.href)
                      : item.subItems?.some(s => pathname.startsWith(s.href)) ?? false;
                    const colorClass = ICON_COLORS[colorKey] ?? 'text-blue-600';
                    const itemKey = item.href ?? item.label;

                    if (item.subItems) {
                      return (
                        <div key={itemKey} className="relative">
                          <button
                            onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)}
                            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors min-w-15 ${
                              isActiveItem
                                ? 'bg-blue-100 ring-1 ring-blue-300'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <span className={`w-8 h-8 ${colorClass}`}>{item.icon}</span>
                            <span className="text-[11px] text-gray-700 font-medium leading-none flex items-center gap-0.5">
                              {item.label} <span className="text-[8px] mt-px">▼</span>
                            </span>
                          </button>
                          {openSubmenu === item.label && (
                            <div className="absolute top-full left-0 z-50 bg-white border border-gray-300 shadow-lg rounded min-w-40 py-0.5">
                              {item.subItems.map(sub => (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  className="block px-4 py-1.5 text-xs hover:bg-green-100 whitespace-nowrap"
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={itemKey}
                        href={item.href!}
                        className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors min-w-15 ${
                          isActiveItem
                            ? 'bg-blue-100 ring-1 ring-blue-300'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className={`w-8 h-8 ${colorClass}`}>
                          {item.icon}
                        </span>
                        <span className="text-[11px] text-gray-700 font-medium leading-none">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Group label */}
                <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 mx-2 pt-0.5 pb-1">
                  {group.label}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center px-6 text-sm text-gray-400 italic">
            Menu <span className="font-semibold mx-1 not-italic text-gray-500">{currentTab.label}</span> akan segera tersedia.
          </div>
        )}
      </div>
    </div>
  );
}
