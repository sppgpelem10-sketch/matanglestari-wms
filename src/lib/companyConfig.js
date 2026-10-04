// src/lib/companyConfig.js
// ============================================
// Konfigurasi Perusahaan — UD Matang Lestari
// ============================================

export const COMPANY = {
  // Identitas
  name: 'UD Matang Lestari',
  shortName: 'Matang Lestari',
  initials: 'ML',
  tagline: 'Segar dari Kebun Nusantara',   // ← GANTI DI SINI
  legalForm: 'Usaha Dagang',

  // Kontak
  address: 'Desa Klanderan, Kec. Plosoklaten, Kab. Kediri 64175',
  addressShort: 'Klanderan, Plosoklaten, Kediri',
  phone: '0857-8499-3160',
  phoneRaw: '085784993160',
  whatsapp: '6285784993160',
  email: 'admin@matanglestari.co.id',
  website: 'www.matanglestari.co.id',
  npwp: '',

  // Logo
  logoFull: '/logos/logo-full.png',
  logoIcon: '/logos/logo-icon.png',
  logoMono: '/logos/logo-mono.png',
  logoUrl: '/logos/logo-full.png',

  // Warna brand
  colorPrimary: '#1B4332',
  colorAccent: '#C9A961',

  // Penandatangan dokumen
  printedBy: {
    name: 'Admin Utama',
    role: 'Manajer Operasional',
  },

  bankAccount: {
    bank: 'BRI',
    accountNumber: '',
    accountName: 'UD Matang Lestari',
  },
};

export const WAREHOUSE = {
  name: 'Gudang Utama Kediri',
  address: 'Desa Klanderan, Kec. Plosoklaten, Kab. Kediri 64175',
  phone: '0857-8499-3160',
};

export const WAREHOUSE_LIST = [
  {
    id: 'WH-KDR',
    name: 'Gudang Utama Kediri',
    address: 'Desa Klanderan, Kec. Plosoklaten, Kab. Kediri 64175',
    isPrimary: true,
  },
];

export const DEFAULT_COURIER = {
  name: 'Armada Matang Lestari',
  contact: 'Bagian Pengiriman',
  phone: '0857-8499-3160',
};

export const APP = {
  name: 'Matang Lestari WMS',
  shortName: 'ML WMS',
  description: 'Sistem Manajemen Gudang & Absensi',
  version: '1.0.0',
  copyright: `© ${new Date().getFullYear()} UD Matang Lestari`,
};