import React, { useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';

// Inline legacy data for landing page
export const D = {
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
      desc: 'Tinjau draf, setujui atau tolak per item, finalisasi pengadaan.',
      tasks: ['Approve per item', 'Komentar revisi', 'Finalisasi (lock)'],
      color: 'azure',
    },
    {
      id: 'admin',
      title: 'Staf Administrasi',
      short: 'Admin',
      action: 'Receive & label',
      desc: 'Catat penerimaan, generate kode QR/Barcode, tempel label fisik.',
      tasks: ['Tanggal penerimaan', 'Generate QR', 'Penomoran label'],
      color: 'lime',
    },
    {
      id: 'staflab',
      title: 'Staf Laboratorium',
      short: 'Staf Lab',
      action: 'Maintenance & stok',
      desc: 'Log pemeliharaan, update kondisi, kelola stok BHP.',
      tasks: ['Log maintenance', 'Update kondisi', 'Decrement BHP otomatis'],
      color: 'amber',
    },
    {
      id: 'sysadmin',
      title: 'Administrator',
      short: 'Sys Admin',
      action: 'User & ruangan',
      desc: 'Kelola akun pengguna, ruangan lab, dan permission.',
      tasks: ['Manage users', 'Manage rooms', 'Access control'],
      color: 'slate',
    },
  ],
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
      },
    ],
  },
  inventory: [
    {
      code: 'LK-WS-001',
      name: 'Workstation Dev #01',
      cat: 'Workstation',
      room: 'Lab Algoritma · R-301',
      cond: 'Baik',
      last: '2 hari lalu',
    },
    {
      code: 'LK-WS-002',
      name: 'Workstation Dev #02',
      cat: 'Workstation',
      room: 'Lab Algoritma · R-301',
      cond: 'Baik',
      last: '2 hari lalu',
    },
    {
      code: 'LK-SW-014',
      name: 'Switch Cisco Catalyst',
      cat: 'Networking',
      room: 'Lab Jaringan · R-303',
      cond: 'Perlu cek',
      last: '12 hari lalu',
    },
    {
      code: 'LK-OS-008',
      name: 'Oscilloscope Rigol',
      cat: 'Instrumen',
      room: 'Lab Elektro · R-205',
      cond: 'Maintenance',
      last: 'hari ini',
    },
    {
      code: 'LK-RB-002',
      name: 'Robot Arm Edu',
      cat: 'Robotika',
      room: 'Lab AI · R-401',
      cond: 'Baik',
      last: '1 minggu',
    },
    {
      code: 'LK-3D-001',
      name: 'Printer 3D Prusa MK4',
      cat: 'Fabrikasi',
      room: 'Maker Space · R-101',
      cond: 'Baik',
      last: '3 hari lalu',
    },
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
  activity: [
    {
      who: 'Dr. Pradipta',
      role: 'Kalab',
      act: 'mengajukan draf',
      target: 'PRC-2026-LK01',
      when: '2 jam lalu',
    },
    {
      who: 'Maharani',
      role: 'Staf Lab',
      act: 'log maintenance',
      target: 'LK-OS-008',
      when: '4 jam lalu',
    },
    { who: 'Faqih', role: 'Admin', act: 'menerima', target: '8× Workstation', when: 'kemarin' },
    {
      who: 'Prof. Hendra',
      role: 'Kaprodi',
      act: 'menyetujui',
      target: '5 item · PRC-2026-LK02',
      when: 'kemarin',
    },
    {
      who: 'Maharani',
      role: 'Staf Lab',
      act: 'mengurangi BHP',
      target: 'RJ45 −12pcs',
      when: '2 hari lalu',
    },
  ],
};

export const fmtRp = (n) => 'Rp ' + n.toLocaleString('id-ID');
export const fmtRpShort = (n) => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};

// In-view observer hook (removed since GSAP handles all ScrollTriggers)
export function AuRise({ children, as: As = 'div', className = '', ...rest }) {
  return (
    <As className={`au-rise ${className}`} {...rest}>
      {children}
    </As>
  );
}
export function AuStagger({ children, as: As = 'div', className = '', ...rest }) {
  return (
    <As className={`au-stagger ${className}`} {...rest}>
      {children}
    </As>
  );
}

// Tiny QR-ish pattern (deterministic from seed)
export function FakeQR({ seed }) {
  const cells = useMemo(() => {
    const arr = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    for (let i = 0; i < 36; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      arr.push(h % 2);
    }
    return arr;
  }, [seed]);
  return (
    <div className="au-inv-qr">
      {cells.map((c, i) => (
        <div key={i} className={c ? '' : 'on'} />
      ))}
    </div>
  );
}

// Role icons
export const RoleIcon = ({ kind }) => {
  const map = {
    kalab: <path d="M3 9.5L12 4l9 5.5M5 10v9h14v-9M9 19v-5h6v5" />,
    kaprodi: (
      <path d="M9 12l2 2 4-4m-9 6V6a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H8l-3 3v-3z" />
    ),
    admin: <path d="M4 7h16M4 12h16M4 17h10M19 17l2 2-2 2" />,
    staflab: <path d="M9 3v6l-5 9a3 3 0 003 3h10a3 3 0 003-3l-5-9V3M9 3h6M7 14h10" />,
    sysadmin: <circle cx="12" cy="8" r="3" />,
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {map[kind] || <circle cx="12" cy="12" r="4" />}
      {kind === 'sysadmin' && (
        <path d="M4 21a8 8 0 0116 0M14.5 13l3-2 1.5 2-3 2-1.5-2zm-6 0l-3-2L4 13l3 2 1.5-2z" />
      )}
    </svg>
  );
};

// Cypher Text Scramble Component
export function ScrambleText({ text }) {
  const elRef = useRef(null);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const chars = '!<>-_\\\\/[]{}—=+*^?#________';
    const original = text;
    const len = original.length;
    let obj = { p: 0 };

    gsap.to(obj, {
      p: 1,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => {
        let newText = '';
        const revealCount = Math.floor(len * obj.p);
        for (let i = 0; i < len; i++) {
          if (i < revealCount) newText += original[i];
          else if (original[i] === ' ') newText += ' ';
          else newText += chars[Math.floor(Math.random() * chars.length)];
        }
        el.textContent = newText;
      },
    });
  }, [text]);
  return <span ref={elRef}>{text}</span>;
}
