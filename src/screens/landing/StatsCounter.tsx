import { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, startOnView]);

  return { count, ref };
}

const stats = [
  { value: 1247, label: 'Aset Terdaftar', suffix: '+', color: 'var(--violet)' },
  { value: 52, label: 'Laboratorium', suffix: '', color: 'var(--cyan)' },
  { value: 99.8, label: 'Uptime SLA', suffix: '%', color: 'var(--green)', decimal: true },
  { value: 5, label: 'Peran Terintegrasi', suffix: '', color: 'var(--gold)' },
];

export default function StatsCounter() {
  return (
    <section className="au-stats" id="stats-section">
      <div className="au-stats-grid">
        {stats.map((s, i) => (
          <StatItem key={s.label} stat={s} index={i} />
        ))}
      </div>
    </section>
  );
}

function StatItem({ stat, index }: { stat: any; index: number }) {
  const { count, ref } = useCountUp(
    stat.decimal ? Math.floor(stat.value) : stat.value,
    2000 + index * 200
  );

  return (
    <div className="au-stat-item" ref={ref}>
      <div className="au-stat-number" style={{ color: stat.color }}>
        <span className="au-mono">{stat.decimal ? `${count}.8` : count}</span>
        <span className="au-stat-suffix">{stat.suffix}</span>
      </div>
      <div className="au-stat-label">{stat.label}</div>
      <div
        className="au-stat-bar"
        style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }}
      />
    </div>
  );
}
