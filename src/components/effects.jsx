import React, { useEffect } from 'react';
import { useStore } from './store-context.jsx';

// =========================================================
// IntersectionObserver reveal fallback (when GSAP unavailable)
// =========================================================
export function useRevealFallback() {
  useEffect(() => {
    if (window.gsap) return; // GSAP handles reveals
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('revealed');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// =========================================================
// Keyboard shortcuts hook
// =========================================================
export function useKeyboardShortcuts(dispatch) {
  useEffect(() => {
    const handler = (e) => {
      // ⌘K or Ctrl+K -> focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.searchbox input');
        if (searchInput) searchInput.focus();
      }
      // Escape -> close drawer/modal/mobile sidebar
      if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE_DRAWER' });
        dispatch({ type: 'CLOSE_MODAL' });
        dispatch({ type: 'CLOSE_MOBILE_SIDEBAR' });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dispatch]);
}

// =========================================================
// Sound integration — wires click/hover sounds to interactive elements
// =========================================================
export function SoundIntegration() {
  useEffect(() => {
    const snd = window.LokaSounds;
    if (!snd) return;

    const onClick = (e) => {
      const el = e.target.closest('button, [role="button"], a, .sb-item, .act-btn');
      if (el) snd.click();
    };
    const onMouseEnter = (e) => {
      const el = e.target.closest('button, [role="button"], a, .card, .draft-card, .inv-card, .sb-item');
      if (el) snd.hover();
    };
    const onToggle = (e) => {
      if (e.target.closest('.toggle, input[type="checkbox"]')) snd.toggle();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onMouseEnter, true);
    document.addEventListener('change', onToggle, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mouseover', onMouseEnter, true);
      document.removeEventListener('change', onToggle, true);
    };
  }, []);
  return null;
}

// =========================================================
// Global mouse tracker for button hover effects
// =========================================================
export function MouseTracker() {
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
    };
    document.addEventListener('mousemove', handler, { passive: true });
    return () => document.removeEventListener('mousemove', handler);
  }, []);
  return null;
}

// =========================================================
// Cursor toggle + body class
// =========================================================
export function CursorEnabler() {
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const check = () => {
      if (mq.matches) document.body.classList.add('custom-cursor-active');
      else document.body.classList.remove('custom-cursor-active');
    };
    check();
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);
  return null;
}

// =========================================================
// 3D Tilt Engine — global event delegation for .tilt-card
// =========================================================
export function TiltEngine() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const onMove = (e) => {
      const card = e.target.closest('.tilt-card');
      if (!card) {
        document.querySelectorAll('.tilt-card').forEach(c => {
          c.style.transform = '';
          const shine = c.querySelector('.tilt-shine');
          if (shine) shine.style.background = '';
        });
        return;
      }
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (y - 0.5) * -5; // deg — subtle tilt
      const rotateY = (x - 0.5) * 5;
      card.style.transform = `perspective(1800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.005, 1.005, 1.005)`;
      const shine = card.querySelector('.tilt-shine');
      if (shine) {
        shine.style.background = `linear-gradient(${135 + rotateY * 2}deg, rgba(255,255,255,${0.04 + Math.abs(x - 0.5) * 0.03}) 0%, transparent 60%)`;
      }
    };

    const onLeave = (e) => {
      const card = e.target.closest('.tilt-card');
      if (card) {
        card.style.transform = '';
        const shine = card.querySelector('.tilt-shine');
        if (shine) shine.style.background = '';
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeave, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseout', onLeave);
    };
  }, []);
  return null;
}
