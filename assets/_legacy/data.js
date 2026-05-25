// Shared data — lab komputer/informatika context
window.LAB_DATA = {
  brand: 'Loka',
  brandLong: 'Loka Lab Suite',
  tagline: { id: 'Inventaris lab, hidup.', en: 'Lab inventory, alive.' },

  roles: [
    {
      id: 'kalab',
      title: 'Kepala Laboratorium',
      short: 'Kalab',
      action: 'Susun draf pengadaan',
      desc: 'Rencanakan kebutuhan tahunan — inventaris baru, BHP, dan penggantian aset lama.',
      tasks: ['Buat draf pengadaan tahunan', 'Tandai aset yang diganti', 'Lihat riwayat draf'],
      color: 'aurora',
    },
    {
      id: 'kaprodi',
      title: 'Ketua Program Studi',
      short: 'Kaprodi',
      action: 'Review & approval',
      desc: 'Tinjau draf, setujui atau tolak per item, finalisasi pengadaan untuk dilanjutkan.',
      tasks: ['Approve per item', 'Komentar revisi', 'Finalisasi (lock)'],
      color: 'azure',
    },
    {
      id: 'admin',
      title: 'Staf Administrasi',
      short: 'Admin',
      action: 'Receive & label',
      desc: 'Catat penerimaan, generate kode QR/Barcode, tempel label fisik ke aset.',
      tasks: ['Tanggal penerimaan', 'Generate QR', 'Penomoran label'],
      color: 'lime',
    },
    {
      id: 'staflab',
      title: 'Staf Laboratorium',
      short: 'Staf Lab',
      action: 'Maintenance & stok',
      desc: 'Log pemeliharaan, update kondisi, kelola stok BHP terpakai per sesi praktikum.',
      tasks: ['Log maintenance', 'Update kondisi', 'Decrement BHP otomatis'],
      color: 'amber',
    },
    {
      id: 'sysadmin',
      title: 'Administrator',
      short: 'Sys Admin',
      action: 'User & ruangan',
      desc: 'Kelola akun pengguna, ruangan lab, dan permission per role.',
      tasks: ['Manage users', 'Manage rooms', 'Access control'],
      color: 'slate',
    },
  ],

  // Draft pengadaan tahunan — komponen lab komputer / informatika
  draft: {
    code: 'PRC-2026-LK01',
    title: 'Pengadaan Lab Komputer · 2026',
    by: 'Dr. Pradipta Wirasena',
    role: 'Kepala Laboratorium · Informatika',
    submitted: '14 Mei 2026',
    items: [
      {
        id: 'I-01',
        kind: 'Inventaris',
        name: 'Workstation Dev — Ryzen 9 / 64GB / RTX 4070',
        qty: 12,
        unit: 'unit',
        price: 32_500_000,
        link: 'shopee.co.id/...',
        replaces: 'PC-LK-2019 (12 unit, kondisi rusak)',
        status: 'pending',
      },
      {
        id: 'I-02',
        kind: 'Inventaris',
        name: 'Monitor IPS 27" 1440p · 144Hz',
        qty: 12,
        unit: 'unit',
        price: 4_200_000,
        link: 'tokopedia.com/...',
        replaces: null,
        status: 'pending',
      },
      {
        id: 'I-03',
        kind: 'Inventaris',
        name: 'Managed Switch 24-Port Gigabit',
        qty: 2,
        unit: 'unit',
        price: 8_900_000,
        link: 'distributor-net.id/...',
        replaces: 'SW-LK-2017 (Cisco SG200, EOL)',
        status: 'pending',
      },
      {
        id: 'B-01',
        kind: 'BHP',
        name: 'Kabel UTP Cat6 Belden · 305m roll',
        qty: 3,
        unit: 'roll',
        price: 2_750_000,
        link: 'distributor-net.id/...',
        replaces: null,
        status: 'pending',
      },
      {
        id: 'B-02',
        kind: 'BHP',
        name: 'Konektor RJ45 Cat6 (100pcs)',
        qty: 10,
        unit: 'pack',
        price: 165_000,
        link: 'tokopedia.com/...',
        replaces: null,
        status: 'pending',
      },
      {
        id: 'I-04',
        kind: 'Inventaris',
        name: 'Oscilloscope Rigol DS1054Z',
        qty: 2,
        unit: 'unit',
        price: 5_800_000,
        link: 'rs-online.id/...',
        replaces: null,
        status: 'pending',
      },
      {
        id: 'B-03',
        kind: 'BHP',
        name: 'Thermal Paste Arctic MX-6 (8g)',
        qty: 6,
        unit: 'tube',
        price: 145_000,
        link: 'tokopedia.com/...',
        replaces: null,
        status: 'pending',
      },
    ],
  },

  // Inventory showcase items
  inventory: [
    { code: 'LK-WS-001', name: 'Workstation Dev #01', cat: 'Workstation', room: 'Lab Algoritma · R-301', cond: 'Baik', last: '2 hari lalu' },
    { code: 'LK-WS-002', name: 'Workstation Dev #02', cat: 'Workstation', room: 'Lab Algoritma · R-301', cond: 'Baik', last: '2 hari lalu' },
    { code: 'LK-SW-014', name: 'Switch Cisco Catalyst', cat: 'Networking', room: 'Lab Jaringan · R-303', cond: 'Perlu cek', last: '12 hari lalu' },
    { code: 'LK-OS-008', name: 'Oscilloscope Rigol', cat: 'Instrumen', room: 'Lab Elektro · R-205', cond: 'Maintenance', last: 'hari ini' },
    { code: 'LK-RB-002', name: 'Robot Arm Edu', cat: 'Robotika', room: 'Lab AI · R-401', cond: 'Baik', last: '1 minggu' },
    { code: 'LK-3D-001', name: 'Printer 3D Prusa MK4', cat: 'Fabrikasi', room: 'Maker Space · R-101', cond: 'Baik', last: '3 hari lalu' },
  ],

  rooms: [
    { code: 'R-301', name: 'Lab Algoritma', count: 24 },
    { code: 'R-303', name: 'Lab Jaringan', count: 18 },
    { code: 'R-205', name: 'Lab Elektro', count: 31 },
    { code: 'R-401', name: 'Lab AI & Robotika', count: 14 },
    { code: 'R-101', name: 'Maker Space', count: 22 },
  ],

  stats: {
    totalAssets: 287,
    activeDrafts: 3,
    bhpItems: 142,
    rooms: 9,
    inMaintenance: 7,
    pendingApproval: 14,
  },

  // Recent activity timeline
  activity: [
    { who: 'Dr. Pradipta', role: 'Kalab', act: 'mengajukan draf', target: 'PRC-2026-LK01', when: '2 jam lalu' },
    { who: 'Maharani', role: 'Staf Lab', act: 'log maintenance', target: 'LK-OS-008', when: '4 jam lalu' },
    { who: 'Faqih', role: 'Admin', act: 'menerima', target: '8× Workstation', when: 'kemarin' },
    { who: 'Prof. Hendra', role: 'Kaprodi', act: 'menyetujui', target: '5 item · PRC-2026-LK02', when: 'kemarin' },
    { who: 'Maharani', role: 'Staf Lab', act: 'mengurangi BHP', target: 'RJ45 −12pcs', when: '2 hari lalu' },
  ],
};

window.fmtRp = (n) => 'Rp ' + n.toLocaleString('id-ID');
window.fmtRpShort = (n) => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};
