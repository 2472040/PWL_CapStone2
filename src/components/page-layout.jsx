import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store-context.jsx';
import { useSearch } from './search-context.jsx';
import { useRevealFallback, useStaggerReveal } from './effects.jsx';
import { Icon } from './app-icons.jsx';

// =========================================================
// Top bar with functional search
// =========================================================
export function PageBar({ breadcrumbs, rightContent }) {
  const { state, dispatch } = useStore();
  const { query, setQuery } = useSearch();
  const inputRef = useRef();

  return (
    <div className="page-bar" role="banner">
      <div className="crumb" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="sep" aria-hidden="true">
                /
              </span>
            )}
            <span className={i === breadcrumbs.length - 1 ? 'cur' : ''}>{b}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="page-bar-right">
        <div className="searchbox" role="search">
          <Icon name="search" size={13} strokeWidth={2} className="text-ink-3" />
          <input
            ref={inputRef}
            placeholder="Cari aset, draf, ruangan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari"
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </div>
        {rightContent}
        <button
          className="btn icon"
          title="Pindai QR Aset"
          onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'qrScanner' } })}
          style={{
            background: 'rgba(183,148,255,0.15)',
            color: '#b794ff',
            border: '1px solid rgba(183,148,255,0.2)',
          }}
        >
          <Icon name="qr" size={14} />
        </button>
        <button className="btn icon" title="Notifikasi" aria-label="Notifikasi">
          <Icon name="bell" size={14} />
        </button>
      </div>
    </div>
  );
}

// =========================================================
// Page wrapper with GSAP transitions + IO fallback
// =========================================================
export function PageHost({ children, role, screen }) {
  const ref = useRef();
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setIsRevealed(false);
  }, [role, screen]);

  useRevealFallback();
  useStaggerReveal(ref, [role, screen], () => setIsRevealed(true));

  useEffect(() => {
    if (!window.gsap || !ref.current) return;
    const ctx = window.gsap.context(() => {
      // Staggered count-ups for [data-counter] tiles
      const counters = ref.current.querySelectorAll('[data-counter]');
      counters.forEach((c, index) => {
        const target = parseFloat(c.dataset.counter);
        if (Number.isNaN(target)) return;
        const obj = { v: 0 };
        window.gsap.to(obj, {
          v: target,
          duration: 1.2,
          delay: index * 0.05 + 0.05,
          ease: 'power3.out',
          onUpdate: () => {
            const fmt = c.dataset.fmt;
            if (fmt === 'rp') c.textContent = window.fmtRpShort(Math.round(obj.v));
            else if (fmt === 'int') c.textContent = Math.round(obj.v).toLocaleString('id-ID');
            else c.textContent = obj.v.toFixed(1);
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [role, screen]);

  return (
    <div ref={ref} className={`grow flex flex-col w-full${isRevealed ? ' revealed' : ''}`}>
      {children}
    </div>
  );
}

// =========================================================
// Stat tile with GSAP counter
// =========================================================
function hexToRgb(hex) {
  if (!hex) return '167, 139, 250';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? '167, 139, 250' : `${r}, ${g}, ${b}`;
}

export function StatTile({ label, value, fmt = 'int', icon, delta, accent, percentage }) {
  const initial =
    fmt === 'rp' ? window.fmtRpShort(value || 0) : (value || 0).toLocaleString('id-ID');
  
  const accentRgb = hexToRgb(accent);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = percentage !== undefined ? circumference - (Math.max(0, Math.min(100, percentage)) / 100) * circumference : 0;

  return (
    <div 
      className="stat-tile" 
      data-reveal
      style={{
        '--accent-color': accent || 'var(--color-violet)',
        '--accent-rgb': accentRgb,
      }}
    >
      <div className="stat-tile-lbl">
        {icon && <Icon name={icon} size={13} strokeWidth={1.8} />}
        {label}
      </div>

      {percentage !== undefined && percentage !== null && (
        <div className="stat-ring-container">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle
              className="stat-ring-circle-bg"
              cx="24"
              cy="24"
              r={radius}
              strokeWidth="4"
            />
            <circle
              className="stat-ring-circle"
              cx="24"
              cy="24"
              r={radius}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 24 24)"
            />
          </svg>
        </div>
      )}

      <div
        className="stat-tile-val mono"
        style={{ color: accent }}
        data-counter={value}
        data-fmt={fmt}
      >
        {initial}
      </div>
      {delta && <div className={`stat-tile-delta ${delta.dir}`}>{delta.text}</div>}
    </div>
  );
}

// =========================================================
// Mobile sidebar backdrop + hamburger
// =========================================================
export function MobileSidebarToggle() {
  const { state, dispatch } = useStore();
  return (
    <>
      <button
        className="mobile-toggle"
        aria-label={state.mobileSidebarOpen ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={state.mobileSidebarOpen}
        aria-controls="main-sidebar"
        onClick={() => dispatch({ type: 'TOGGLE_MOBILE_SIDEBAR' })}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {state.mobileSidebarOpen ? (
            <>
              <path d="M18 6L6 18M6 6l12 12" />
            </>
          ) : (
            <>
              <path d="M3 12h18M3 6h18M3 18h18" />
            </>
          )}
        </svg>
      </button>
      <div
        className={`sb-backdrop ${state.mobileSidebarOpen ? 'open' : ''}`}
        aria-hidden="true"
        onClick={() => dispatch({ type: 'CLOSE_MOBILE_SIDEBAR' })}
      />
    </>
  );
}

// =========================================================
// Scroll progress bar
// =========================================================
export function ScrollProgress() {
  const ref = useRef();
  useEffect(() => {
    const main = document.querySelector('.main');
    if (!main || !ref.current) return;
    const update = () => {
      const pct = (main.scrollTop / (main.scrollHeight - main.clientHeight)) * 100;
      ref.current.style.width = Math.min(100, Math.max(0, pct)) + '%';
    };
    main.addEventListener('scroll', update, { passive: true });
    return () => main.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-bar" ref={ref} />
    </div>
  );
}
