// Loka — extended state for the full interactive dashboard.
// All data is seeded with realistic Indonesian lab-komputer/informatika context.


  const me = {
    sysadmin: { name: 'Anindita Hartono', initials: 'AH', email: 'anindita@kampus.id' },
    kalab:    { name: 'Dr. Pradipta Wirasena', initials: 'PW', email: 'pradipta@kampus.id' },
    kaprodi:  { name: 'Prof. Hendra Saputra', initials: 'HS', email: 'hendra@kampus.id' },
    admin:    { name: 'Faqih Ramadhan', initials: 'FR', email: 'faqih@kampus.id' },
    staflab:  { name: 'Maharani Larasati', initials: 'ML', email: 'maharani@kampus.id' },
  };

  const roles = [
    { id: 'sysadmin', title: 'Administrator', short: 'Sys Admin', accent: '#94a3b8' },
    { id: 'kalab',    title: 'Kepala Laboratorium', short: 'Kalab', accent: '#b794ff' },
    { id: 'kaprodi',  title: 'Ketua Program Studi', short: 'Kaprodi', accent: '#7eebd8' },
    { id: 'admin',    title: 'Staf Administrasi', short: 'Admin', accent: '#a3e635' },
    { id: 'staflab',  title: 'Staf Laboratorium', short: 'Staf Lab', accent: '#f5d27e' },
  ];

  // Nav menu per role
  const nav = {
    sysadmin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'users',     label: 'Pengguna', icon: 'users' },
      { id: 'rooms',     label: 'Ruangan', icon: 'room' },
      { id: 'audit',     label: 'Audit log', icon: 'log' },
    ],
    kalab: [
      { id: 'dashboard',  label: 'Dashboard', icon: 'grid' },
      { id: 'pengadaan',  label: 'Pengadaan', icon: 'cart', badge: 1 },
      { id: 'inventaris', label: 'Inventaris', icon: 'box' },
      { id: 'bhp',        label: 'BHP', icon: 'flask' },
    ],
    kaprodi: [
      { id: 'dashboard',  label: 'Dashboard', icon: 'grid' },
      { id: 'review',     label: 'Review pengadaan', icon: 'check', badge: 'NEW' },
      { id: 'history',    label: 'Riwayat draf', icon: 'history' },
      { id: 'inventaris', label: 'Inventaris', icon: 'box' },
    ],
    admin: [
      { id: 'dashboard',  label: 'Dashboard', icon: 'grid' },
      { id: 'receiving',  label: 'Penerimaan', icon: 'truck', badge: 8 },
      { id: 'inventaris', label: 'Inventaris', icon: 'box' },
      { id: 'labels',     label: 'Cetak label', icon: 'qr' },
    ],
    staflab: [
      { id: 'dashboard',   label: 'Dashboard', icon: 'grid' },
      { id: 'maintenance', label: 'Maintenance', icon: 'wrench' },
      { id: 'bhp',         label: 'Stok BHP', icon: 'flask', badge: 2 },
      { id: 'inventaris',  label: 'Inventaris', icon: 'box' },
    ],
  };

  // Rooms
  const rooms = [
    { code: 'R-301', name: 'Lab Algoritma', floor: 3, capacity: 30, assets: 24, pic: 'ML' },
    { code: 'R-302', name: 'Lab Basis Data', floor: 3, capacity: 30, assets: 26, pic: 'ML' },
    { code: 'R-303', name: 'Lab Jaringan', floor: 3, capacity: 24, assets: 18, pic: 'ML' },
    { code: 'R-205', name: 'Lab Elektro', floor: 2, capacity: 20, assets: 31, pic: 'ML' },
    { code: 'R-204', name: 'Lab Embedded', floor: 2, capacity: 16, assets: 19, pic: 'ML' },
    { code: 'R-202', name: 'Studio UI/UX', floor: 2, capacity: 20, assets: 14, pic: 'ML' },
    { code: 'R-401', name: 'Lab AI & Robotika', floor: 4, capacity: 24, assets: 14, pic: 'ML' },
    { code: 'R-101', name: 'Maker Space', floor: 1, capacity: 30, assets: 22, pic: 'ML' },
    { code: 'R-102', name: 'Server Room', floor: 1, capacity: 8, assets: 12, pic: 'ML' },
  ];

  // Users (sysadmin manages)
  const users = [
    { id: 'u01', name: 'Anindita Hartono', role: 'sysadmin', email: 'anindita@kampus.id', status: 'active', lastLogin: 'baru saja' },
    { id: 'u02', name: 'Dr. Pradipta Wirasena', role: 'kalab', email: 'pradipta@kampus.id', status: 'active', lastLogin: '12 menit lalu' },
    { id: 'u03', name: 'Dr. Sari Wulandari', role: 'kalab', email: 'sari@kampus.id', status: 'active', lastLogin: '2 jam lalu' },
    { id: 'u04', name: 'Prof. Hendra Saputra', role: 'kaprodi', email: 'hendra@kampus.id', status: 'active', lastLogin: 'kemarin' },
    { id: 'u05', name: 'Faqih Ramadhan', role: 'admin', email: 'faqih@kampus.id', status: 'active', lastLogin: '38 menit lalu' },
    { id: 'u06', name: 'Tirta Halim', role: 'admin', email: 'tirta@kampus.id', status: 'active', lastLogin: 'kemarin' },
    { id: 'u07', name: 'Maharani Larasati', role: 'staflab', email: 'maharani@kampus.id', status: 'active', lastLogin: '4 jam lalu' },
    { id: 'u08', name: 'Daud Saputra', role: 'staflab', email: 'daud@kampus.id', status: 'active', lastLogin: 'hari ini' },
    { id: 'u09', name: 'Eggy Pratama', role: 'staflab', email: 'eggy@kampus.id', status: 'paused', lastLogin: '12 hari lalu' },
  ];

  // Inventory (extended)
  const inventory = [
    { code: 'LK-WS-001', name: 'Workstation Dev #01', cat: 'Workstation', room: 'R-301', cond: 'Baik', last: '2 hari lalu', acquired: '2024-08', value: 28000000, serial: 'WS001-Z4', specs: 'Ryzen 7 / 32GB / RTX 3060' },
    { code: 'LK-WS-002', name: 'Workstation Dev #02', cat: 'Workstation', room: 'R-301', cond: 'Baik', last: '2 hari lalu', acquired: '2024-08', value: 28000000, serial: 'WS002-Z4', specs: 'Ryzen 7 / 32GB / RTX 3060' },
    { code: 'LK-WS-003', name: 'Workstation Dev #03', cat: 'Workstation', room: 'R-301', cond: 'Perlu cek', last: '5 hari lalu', acquired: '2024-08', value: 28000000, serial: 'WS003-Z4', specs: 'Ryzen 7 / 32GB / RTX 3060' },
    { code: 'LK-SW-014', name: 'Switch Cisco Catalyst 2960', cat: 'Networking', room: 'R-303', cond: 'Perlu cek', last: '12 hari lalu', acquired: '2022-01', value: 9500000, serial: 'CSC-2960-24', specs: '24-port Gigabit, managed' },
    { code: 'LK-SW-015', name: 'Router Mikrotik CCR2004', cat: 'Networking', room: 'R-303', cond: 'Baik', last: '3 hari lalu', acquired: '2024-03', value: 15500000, serial: 'MT-CCR2004', specs: '16-port SFP+, 4×2.5G' },
    { code: 'LK-OS-008', name: 'Oscilloscope Rigol DS1054Z', cat: 'Instrumen', room: 'R-205', cond: 'Maintenance', last: 'hari ini', acquired: '2023-05', value: 5800000, serial: 'RIG-1054-22', specs: '50MHz, 4-ch, 1GSa/s' },
    { code: 'LK-OS-009', name: 'Function Gen Siglent SDG1032X', cat: 'Instrumen', room: 'R-205', cond: 'Baik', last: '1 minggu', acquired: '2023-05', value: 6200000, serial: 'SIG-1032X', specs: '30MHz, dual-ch' },
    { code: 'LK-RB-002', name: 'Robot Arm Edu UR3-mini', cat: 'Robotika', room: 'R-401', cond: 'Baik', last: '1 minggu', acquired: '2024-11', value: 32000000, serial: 'UR3-MINI-04', specs: '6-DOF, 3kg payload' },
    { code: 'LK-RB-003', name: 'TurtleBot 3 Burger', cat: 'Robotika', room: 'R-401', cond: 'Baik', last: '3 hari lalu', acquired: '2024-11', value: 7500000, serial: 'TB3-B-12', specs: 'Raspberry Pi 4, LiDAR' },
    { code: 'LK-3D-001', name: 'Printer 3D Prusa MK4', cat: 'Fabrikasi', room: 'R-101', cond: 'Baik', last: '3 hari lalu', acquired: '2024-06', value: 18000000, serial: 'PRUSA-MK4-01', specs: '250×210×220 mm, PLA/PETG' },
    { code: 'LK-3D-002', name: 'Printer 3D Bambu X1C', cat: 'Fabrikasi', room: 'R-101', cond: 'Baik', last: 'kemarin', acquired: '2025-02', value: 22000000, serial: 'BAMBU-X1C-02', specs: '256×256×256, multi-mat' },
    { code: 'LK-LC-001', name: 'Laser Cutter K40', cat: 'Fabrikasi', room: 'R-101', cond: 'Perlu cek', last: '8 hari lalu', acquired: '2023-08', value: 14500000, serial: 'K40-AX-01', specs: '40W CO2, 300×200mm' },
  ];

  // BHP (consumables) — Staf Lab manages
  const bhp = [
    { id: 'B-001', name: 'Kabel UTP Cat6 Belden', unit: 'm', stock: 187, min: 50, lastIn: '2026-03-12', cat: 'Networking' },
    { id: 'B-002', name: 'Konektor RJ45 Cat6', unit: 'pcs', stock: 24, min: 100, lastIn: '2026-02-08', cat: 'Networking' },
    { id: 'B-003', name: 'Thermal Paste Arctic MX-6', unit: 'tube', stock: 7, min: 4, lastIn: '2026-04-02', cat: 'Workstation' },
    { id: 'B-004', name: 'Filament PLA Polymaker · putih', unit: 'kg', stock: 12.4, min: 5, lastIn: '2026-04-21', cat: 'Fabrikasi' },
    { id: 'B-005', name: 'Filament PETG · hitam', unit: 'kg', stock: 3.1, min: 5, lastIn: '2026-03-30', cat: 'Fabrikasi' },
    { id: 'B-006', name: 'Solder Tin 0.8mm Goot', unit: 'roll', stock: 8, min: 3, lastIn: '2026-04-05', cat: 'Instrumen' },
    { id: 'B-007', name: 'Header Pin 2.54mm 40p', unit: 'strip', stock: 64, min: 30, lastIn: '2026-04-05', cat: 'Embedded' },
    { id: 'B-008', name: 'Microcontroller Arduino Uno R3', unit: 'pcs', stock: 28, min: 20, lastIn: '2026-04-21', cat: 'Embedded' },
    { id: 'B-009', name: 'Cleaning Alcohol IPA 99% · 1L', unit: 'btl', stock: 5, min: 3, lastIn: '2026-04-15', cat: 'General' },
    { id: 'B-010', name: 'Microfiber Cloth (pack 10)', unit: 'pack', stock: 1, min: 2, lastIn: '2026-02-20', cat: 'General' },
  ];

  // Draft pengadaan
  const draftItems = [
    { id: 'I-01', kind: 'Inventaris', name: 'Workstation Dev — Ryzen 9 / 64GB / RTX 4070', qty: 12, unit: 'unit', price: 32_500_000, link: 'shopee.co.id/tech-id', replaces: 'PC-LK-2019 (12 unit, rusak)' },
    { id: 'I-02', kind: 'Inventaris', name: 'Monitor IPS 27" 1440p · 144Hz', qty: 12, unit: 'unit', price: 4_200_000, link: 'tokopedia.com/dell', replaces: null },
    { id: 'I-03', kind: 'Inventaris', name: 'Managed Switch 24-port Gigabit Aruba', qty: 2, unit: 'unit', price: 8_900_000, link: 'distributor-net.id', replaces: 'SW-LK-2017 (Cisco SG200, EOL)' },
    { id: 'B-01', kind: 'BHP', name: 'Kabel UTP Cat6 Belden · roll 305m', qty: 3, unit: 'roll', price: 2_750_000, link: 'distributor-net.id', replaces: null },
    { id: 'B-02', kind: 'BHP', name: 'Konektor RJ45 Cat6 (pack 100)', qty: 10, unit: 'pack', price: 165_000, link: 'tokopedia.com', replaces: null },
    { id: 'I-04', kind: 'Inventaris', name: 'Oscilloscope Rigol DS1054Z', qty: 2, unit: 'unit', price: 5_800_000, link: 'rs-online.id', replaces: null },
    { id: 'B-03', kind: 'BHP', name: 'Thermal Paste Arctic MX-6 (8g)', qty: 6, unit: 'tube', price: 145_000, link: 'tokopedia.com', replaces: null },
  ];

  const drafts = [
    {
      code: 'PRC-2026-LK01',
      title: 'Pengadaan Lab Komputer · 2026',
      by: 'Dr. Pradipta Wirasena',
      byInit: 'PW',
      role: 'Kepala Laboratorium · Informatika',
      submitted: '14 Mei 2026',
      status: 'submitted',
      items: draftItems,
    },
    {
      code: 'PRC-2026-LK02',
      title: 'Pengadaan Lab AI & Robotika · Q3 2026',
      by: 'Dr. Sari Wulandari',
      byInit: 'SW',
      role: 'Kepala Laboratorium · AI',
      submitted: '8 Mei 2026',
      status: 'finalized',
      items: [
        { id: 'I-21', kind: 'Inventaris', name: 'Workstation AI — RTX 4090 / 96GB RAM', qty: 4, unit: 'unit', price: 65_000_000, link: 'distributor-id', replaces: null },
        { id: 'I-22', kind: 'Inventaris', name: 'NVIDIA Jetson Orin Nano Dev Kit', qty: 8, unit: 'unit', price: 8_500_000, link: 'nvidia-id', replaces: null },
        { id: 'B-21', kind: 'BHP', name: 'Wire Female Jumper 40p', qty: 12, unit: 'pack', price: 25_000, link: 'tokopedia.com', replaces: null },
      ],
    },
    {
      code: 'PRC-2025-LK04',
      title: 'Pengadaan Lab Jaringan · 2025',
      by: 'Dr. Pradipta Wirasena',
      byInit: 'PW',
      role: 'Kepala Laboratorium · Informatika',
      submitted: '21 Sep 2025',
      status: 'completed',
      items: [
        { id: 'X-01', kind: 'Inventaris', name: 'Router Mikrotik CCR2004', qty: 1, unit: 'unit', price: 15_500_000, link: 'mikrotik-id', replaces: null },
      ],
    },
  ];

  // Maintenance log
  const maintLog = [
    { id: 'M-2026-014', asset: 'LK-OS-008', name: 'Oscilloscope Rigol DS1054Z', date: '18 Mei 2026', tech: 'Maharani Larasati', action: 'Kalibrasi & cleaning probe', cond: 'Maintenance', bhp: [{ id: 'B-009', qty: 0.15, unit: 'btl' }] },
    { id: 'M-2026-013', asset: 'LK-SW-014', name: 'Switch Cisco Catalyst 2960', date: '16 Mei 2026', tech: 'Daud Saputra', action: 'Reseat semua kabel, blow dust', cond: 'Perlu cek', bhp: [] },
    { id: 'M-2026-012', asset: 'LK-LC-001', name: 'Laser Cutter K40', date: '10 Mei 2026', tech: 'Maharani Larasati', action: 'Replace lensa fokus', cond: 'Baik', bhp: [{ id: 'B-010', qty: 1, unit: 'pack' }] },
    { id: 'M-2026-011', asset: 'LK-WS-003', name: 'Workstation Dev #03', date: '5 Mei 2026', tech: 'Daud Saputra', action: 'Repaste CPU + bersihkan fan', cond: 'Baik', bhp: [{ id: 'B-003', qty: 1, unit: 'tube' }, { id: 'B-009', qty: 0.05, unit: 'btl' }] },
  ];

  // Activity feed
  const activity = [
    { who: 'Maharani', role: 'Staf Lab', act: 'log maintenance', target: 'LK-OS-008', when: '2 jam lalu', kind: 'maint' },
    { who: 'Faqih', role: 'Admin', act: 'menerima', target: '8× Workstation', when: '4 jam lalu', kind: 'receive' },
    { who: 'Dr. Pradipta', role: 'Kalab', act: 'mengajukan draf', target: 'PRC-2026-LK01', when: 'kemarin', kind: 'submit' },
    { who: 'Prof. Hendra', role: 'Kaprodi', act: 'menyetujui', target: '5 item · PRC-2026-LK02', when: 'kemarin', kind: 'approve' },
    { who: 'Daud', role: 'Staf Lab', act: 'mengurangi BHP', target: 'RJ45 −12 pcs', when: '2 hari lalu', kind: 'bhp' },
    { who: 'Anindita', role: 'Sys Admin', act: 'menambah pengguna', target: 'Tirta Halim', when: '3 hari lalu', kind: 'user' },
  ];

  // Audit log (full)
  const audit = [
    { ts: '2026-05-18 14:32', user: 'Maharani Larasati', role: 'Staf Lab', action: 'maintenance.create', target: 'LK-OS-008', ip: '10.20.3.41' },
    { ts: '2026-05-18 14:31', user: 'Maharani Larasati', role: 'Staf Lab', action: 'bhp.decrement',     target: 'B-009 (−0.15)', ip: '10.20.3.41' },
    { ts: '2026-05-18 12:08', user: 'Faqih Ramadhan',    role: 'Admin',    action: 'receiving.confirm', target: 'PRC-2026-LK02 · 8 unit', ip: '10.20.3.12' },
    { ts: '2026-05-18 09:41', user: 'Prof. Hendra',      role: 'Kaprodi',  action: 'draft.finalize',    target: 'PRC-2026-LK02', ip: '10.20.3.5' },
    { ts: '2026-05-17 16:50', user: 'Dr. Pradipta',      role: 'Kalab',    action: 'draft.submit',      target: 'PRC-2026-LK01', ip: '10.20.3.18' },
    { ts: '2026-05-17 16:48', user: 'Dr. Pradipta',      role: 'Kalab',    action: 'draft.update',      target: 'PRC-2026-LK01 · +1 item', ip: '10.20.3.18' },
    { ts: '2026-05-17 11:23', user: 'Anindita Hartono',  role: 'Sys Admin', action: 'user.create',      target: 'Tirta Halim (admin)', ip: '10.20.3.1' },
    { ts: '2026-05-16 08:15', user: 'Daud Saputra',      role: 'Staf Lab', action: 'maintenance.create', target: 'LK-SW-014', ip: '10.20.3.41' },
  ];

  export const LOKA = { me, roles, nav, rooms, users, inventory, bhp, drafts, maintLog, activity, audit };

window.fmtRp = (n) => 'Rp ' + n.toLocaleString('id-ID');
window.fmtRpShort = (n) => {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};
