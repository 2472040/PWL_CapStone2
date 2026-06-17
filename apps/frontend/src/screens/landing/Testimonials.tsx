import { useState, useEffect } from 'react';
import { ScrambleText } from './LandingUtils';

const testimonials = [
  {
    name: 'Dr. Rina Hartono',
    role: 'Kepala Laboratorium Kimia',
    text: 'Sebelum Loka Lab, kami menghabiskan 3 jam per minggu hanya untuk mencocokkan data spreadsheet. Sekarang semuanya otomatis dan real-time.',
    avatar: 'RH',
    accentColor: 'var(--violet)',
  },
  {
    name: 'Prof. Budi Santoso',
    role: 'Kaprodi Teknik Elektro',
    text: 'Proses approval pengadaan yang dulu butuh berhari-hari sekarang bisa selesai dalam hitungan menit. Transparansi anggaran meningkat drastis.',
    avatar: 'BS',
    accentColor: 'var(--cyan)',
  },
  {
    name: 'Anisa Putri, S.Si.',
    role: 'Staf Laboratorium Fisika',
    text: 'QR code di setiap aset sangat membantu. Tinggal scan, langsung tahu riwayat maintenance dan kondisi terakhir alat.',
    avatar: 'AP',
    accentColor: 'var(--green)',
  },
  {
    name: 'Ir. Darmawan',
    role: 'Sysadmin Universitas',
    text: 'Audit log yang lengkap membuat saya bisa memantau semua aktivitas tanpa harus bertanya ke masing-masing lab. Keamanan data terjamin.',
    avatar: 'DR',
    accentColor: 'var(--gold)',
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[active];

  return (
    <section className="au-section" id="testimonials-section">
      <div className="au-section-tag">
        <ScrambleText text="— Testimoni" />
      </div>
      <h2 className="au-section-h2">
        Apa kata mereka yang sudah <em>merasakan</em> bedanya.
      </h2>

      <div className="au-testimonial-card">
        <div className="au-testimonial-glow" style={{ background: t.accentColor }} />

        <div className="au-testimonial-quote">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: t.accentColor, opacity: 0.4, marginBottom: 16 }}
          >
            <path
              d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
              fill="currentColor"
            />
            <path
              d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
              fill="currentColor"
            />
          </svg>
          <p className="au-testimonial-text" key={active}>
            {t.text}
          </p>
        </div>

        <div className="au-testimonial-author">
          <div
            className="au-testimonial-avatar"
            style={{
              background: `linear-gradient(135deg, ${t.accentColor}66, ${t.accentColor}22)`,
              borderColor: `${t.accentColor}44`,
            }}
          >
            {t.avatar}
          </div>
          <div>
            <div className="au-testimonial-name">{t.name}</div>
            <div className="au-testimonial-role">{t.role}</div>
          </div>
        </div>

        <div className="au-testimonial-dots">
          {testimonials.map((_, i) => (
            <button
              key={i}
              className={`au-testimonial-dot ${i === active ? 'active' : ''}`}
              style={i === active ? { background: t.accentColor } : {}}
              onClick={() => setActive(i)}
              aria-label={`Testimoni ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
