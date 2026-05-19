import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { D, RoleIcon } from './LandingUtils.jsx';
import ShinyButton from './ShinyButton.jsx';
import DynamicGridBackground from './DynamicGridBackground.jsx';

import TextReveal from './TextReveal.jsx';

export function Stat({ n, l }) {
  return (
    <div className="au-preview-stat">
      <div className="au-preview-stat-num">{n}</div>
      <div className="au-preview-stat-lbl">{l}</div>
      <div className="au-preview-stat-bar" />
    </div>
  );
}

export function Sparkline() {
  // simple SVG sparkline
  const points = [12, 18, 14, 24, 22, 38, 32, 48, 44, 56, 50, 64];
  const max = 70, min = 0;
  const w = 360, h = 70;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / (max - min)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const fillPath = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b794ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#b794ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sg)" />
      <path d={path} stroke="#b794ff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / (max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="#b794ff" />;
      })}
    </svg>
  );
}

export default function HeroSection() {
  const [tab, setTab] = useState('draft');
  const previewRef = useRef(null);
  const bodyRef = useRef(null);

  // Tab switch animation
  useEffect(() => {
    if (!bodyRef.current) return;
    gsap.fromTo(bodyRef.current.children, 
      { opacity: 0, y: 10 }, 
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', overwrite: 'auto' }
    );
  }, [tab]);

  // 3D Tilt Effect on mouse move
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        rotationY: x * 0.03,
        rotationX: -y * 0.03,
        duration: 0.8,
        ease: 'power2.out',
        transformPerspective: 1000
      });
    };
    const handleLeave = () => {
      gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'power2.out' });
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <section className="au-hero">
      <DynamicGridBackground />

      <TextReveal delay={0.2} />
      <p className="au-hero-sub">
        Sistem terintegrasi untuk Kepala Lab, Kaprodi, Staf Administrasi, dan Staf Lab — dari draf pengadaan tahunan, approval per-item, sampai log maintenance dan stok BHP yang menyusut otomatis.
      </p>
      <div className="au-hero-ctas">
        <ShinyButton onClick={() => window.location.href='#bento-features'}>
          Mulai uji coba &rarr;
        </ShinyButton>
        <button className="au-btn au-btn-outline" onClick={() => window.location.href='#bento-features'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m10 8 6 4-6 4Z"/>
          </svg>
          Lihat dokumentasi
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <div className="au-hero-glow"><div className="au-hero-glow-orb" /></div>
        <div className="au-hero-preview" ref={previewRef}>
        <div className="au-preview-bar">
          <div className="au-window-dots" style={{ display: 'flex', gap: 6 }}>
            <div className="au-preview-dot" style={{ background: '#ff5f57' }} />
            <div className="au-preview-dot" style={{ background: '#febc2e' }} />
            <div className="au-preview-dot" style={{ background: '#28c840' }} />
          </div>
          <div style={{ marginLeft: '24px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--ink-2)' }}>
            <div style={{ cursor: 'pointer', color: tab === 'draft' ? 'var(--cyan)' : 'inherit' }} onClick={() => setTab('draft')}>Overview</div>
            <div style={{ cursor: 'pointer', color: tab === 'inventory' ? 'var(--cyan)' : 'inherit' }} onClick={() => setTab('inventory')}>Inventaris</div>
            <div style={{ cursor: 'pointer', color: tab === 'activity' ? 'var(--cyan)' : 'inherit' }} onClick={() => setTab('activity')}>Log Aktivitas</div>
          </div>
        </div>

        <div className="au-preview-body" ref={bodyRef} style={{ minHeight: '260px', transition: 'background 0.3s' }}>
          {tab === 'draft' && (
            <>
              <div className="au-preview-row">
                <Stat n={D.stats.totalAssets} l="Total aset" />
                <Stat n={D.stats.activeDrafts} l="Draf aktif" />
                <Stat n={D.stats.bhpItems} l="Stok BHP" />
                <Stat n={D.stats.pendingApproval} l="Menunggu approval" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="au-preview-stat" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Aktivitas mingguan</div>
                    <div className="au-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>21 Apr — 28 Apr</div>
                  </div>
                  <Sparkline />
                </div>
                <div className="au-preview-stat" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Ruangan</div>
                  {D.rooms.slice(0, 3).map(r => (
                    <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{r.name}</span>
                      <span className="au-mono" style={{ color: 'var(--ink-3)' }}>{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: '8px' }}>Daftar Aset Terkini</div>
              {D.inventory.slice(0, 4).map(inv => (
                <div key={inv.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{inv.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{inv.room}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: 11, color: inv.cond === 'Baik' ? 'var(--green)' : 'var(--amber)' }}>{inv.cond}</span>
                    <span className="au-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{inv.code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: '4px' }}>Log Sistem Real-time</div>
              {D.activity.slice(0, 4).map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ marginTop: '2px', color: 'var(--cyan)' }}><RoleIcon kind={act.role.toLowerCase().replace(' ', '')} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                      <strong>{act.who}</strong> {act.act} <span style={{ color: 'var(--ink-2)' }}>{act.target}</span>
                    </div>
                    <div className="au-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: '4px' }}>{act.when}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
