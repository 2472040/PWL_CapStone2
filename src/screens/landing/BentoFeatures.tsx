import { useRef, useEffect } from 'react';
import { ScrambleText } from './LandingUtils';

const features = [
  {
    title: 'Kartu Aset Digital',
    desc: 'Setiap aset punya kartu sendiri dengan QR fisik, riwayat maintenance, dan riwayat pemakaian per praktikum. Tidak perlu lagi cari di spreadsheet.',
    meta: 'Inventaris · Real-time',
    glowColor: '#b794ff',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: 'QR Code Fisik',
    desc: 'Scan langsung dari smartphone untuk melihat riwayat lengkap aset tanpa membuka spreadsheet.',
    meta: 'Mobile · Scan',
    glowColor: '#7eebd8',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <rect x="14" y="2" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <path d="M14 14h3v3M17 20h3v-3M14 20h.01" />
      </svg>
    ),
  },
  {
    title: 'Log Maintenance',
    desc: 'Catat kerusakan, perbaikan, dan estimasi biaya. Riwayat lengkap tersimpan otomatis.',
    meta: 'Staf Lab',
    glowColor: '#ff9bb3',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: 'Stok BHP Otomatis',
    desc: 'Bahan Habis Pakai menyusut otomatis saat digunakan dalam praktikum.',
    meta: 'Auto · Tracking',
    glowColor: '#f5d27e',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.9 1.45h12.76a1 1 0 00.9-1.45l-5.069-10.127A2 2 0 0114 9.527V2" />
        <path d="M8.5 2h7M7 16h10" />
      </svg>
    ),
  },
  {
    title: 'Audit Log',
    desc: 'Setiap aksi tercatat: siapa, kapan, apa yang diubah.',
    meta: 'Sysadmin · Keamanan',
    glowColor: '#a3e635',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Multi-Role Access',
    desc: 'Lima peran berbeda, satu alur terpadu. Setiap orang tahu tugasnya.',
    meta: '5 Roles',
    glowColor: '#94a3b8',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

function BentoCard({ f }: { f: any }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Spotlight position
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      // 3D Tilt effect
      const rotateX = (y - rect.height / 2) / -50;
      const rotateY = (x - rect.width / 2) / 50;
      card.style.transform = `perspective(1800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.005, 1.005, 1.005)`;
      card.style.zIndex = '10';
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      card.style.zIndex = '1';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="au-bento-item group relative transition-transform duration-200 ease-out will-change-transform"
    >
      {/* Interactive Spotlight using CSS mask and variables */}
      <div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), ${f.glowColor}30, transparent 40%)`,
        }}
      />

      {/* Existing Glow */}
      <div
        className="au-bento-glow transition-opacity duration-300 group-hover:opacity-60"
        style={{ background: f.glowColor }}
      />

      <div className="relative z-10 pointer-events-none">
        <div
          className="au-bento-icon transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1"
          style={{ color: f.glowColor }}
        >
          {f.icon}
        </div>
        <div className="au-bento-title">{f.title}</div>
        <div className="au-bento-desc">{f.desc}</div>
      </div>
      <div className="au-bento-meta relative z-10">{f.meta}</div>
    </div>
  );
}

export default function BentoFeatures() {
  return (
    <section className="au-bento-section" id="bento-features">
      <div className="au-section-tag">
        <ScrambleText text="— Fitur Unggulan" />
      </div>
      <h2 className="au-section-h2">
        Satu platform, <em>segala kebutuhan</em> laboratorium Anda.
      </h2>
      <p className="au-section-sub">
        Dari aset fisik hingga bahan habis pakai, dari pengadaan hingga audit — semua terhubung
        dalam satu ekosistem.
      </p>

      <div className="au-bento-grid perspective-1000">
        {features.map((f) => (
          <BentoCard key={f.title} f={f} />
        ))}
      </div>
    </section>
  );
}
