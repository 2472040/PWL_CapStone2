import React, { useEffect } from 'react';
import { useStore } from './store-context.jsx';

// =========================================================
// IntersectionObserver reveal fallback (when GSAP unavailable)
// =========================================================
export function useRevealFallback() {
  useEffect(() => {
    if (window.gsap) return; // GSAP handles reveals
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('revealed');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => obs.observe(el));
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
      const el = e.target.closest(
        'button, [role="button"], a, .card, .draft-card, .inv-card, .sb-item'
      );
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
      btn.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      btn.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
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
        document.querySelectorAll('.tilt-card').forEach((c) => {
          if (window.gsap) {
            window.gsap.to(c, {
              transform: 'perspective(1800px) rotateX(0deg) rotateY(0deg)',
              duration: 0.6,
              ease: 'power3.out',
              overwrite: 'auto',
            });
            const shine = c.querySelector('.tilt-shine');
            if (shine) {
              window.gsap.to(shine, {
                background: 'transparent',
                duration: 0.6,
                ease: 'power3.out',
              });
            }
          } else {
            c.style.transform = '';
            const shine = c.querySelector('.tilt-shine');
            if (shine) shine.style.background = '';
          }
        });
        return;
      }

      const interactive = e.target.closest('button, a, input, select, textarea, [role="button"]');
      if (interactive) {
        if (window.gsap) {
          window.gsap.to(card, {
            transform: 'perspective(1800px) rotateX(0deg) rotateY(0deg)',
            duration: 0.4,
            ease: 'power3.out',
            overwrite: 'auto',
          });
          const shine = card.querySelector('.tilt-shine');
          if (shine) {
            window.gsap.to(shine, {
              background: 'transparent',
              duration: 0.4,
              ease: 'power3.out',
            });
          }
        } else {
          card.style.transform = '';
          const shine = card.querySelector('.tilt-shine');
          if (shine) shine.style.background = '';
        }
        return;
      }

      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (y - 0.5) * -7; // deg — slightly more active but still elegant
      const rotateY = (x - 0.5) * 7;

      // Responsive direct transform on move, kill active tweens first
      if (window.gsap) {
        window.gsap.killTweensOf([card]);
        const shine = card.querySelector('.tilt-shine');
        if (shine) window.gsap.killTweensOf([shine]);
      }
      card.style.transform = `perspective(1800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      const shine = card.querySelector('.tilt-shine');
      if (shine) {
        shine.style.background = `linear-gradient(${135 + rotateY * 2}deg, rgba(255,255,255,${0.04 + Math.abs(x - 0.5) * 0.03}) 0%, transparent 60%)`;
      }
    };

    const onLeave = (e) => {
      const card = e.target.closest('.tilt-card');
      if (card) {
        if (window.gsap) {
          window.gsap.to(card, {
            transform: 'perspective(1800px) rotateX(0deg) rotateY(0deg)',
            duration: 0.6,
            ease: 'power3.out',
            overwrite: 'auto',
          });
          const shine = card.querySelector('.tilt-shine');
          if (shine) {
            window.gsap.to(shine, {
              background: 'transparent',
              duration: 0.6,
              ease: 'power3.out',
            });
          }
        } else {
          card.style.transform = '';
          const shine = card.querySelector('.tilt-shine');
          if (shine) shine.style.background = '';
        }
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

// =========================================================
// Global Card Hover Engine — subtle float & accent glow
// =========================================================
export function CardHoverEngine() {
  const { state } = useStore();

  useEffect(() => {
    if (!window.gsap) return;

    const onEnter = (e) => {
      const card = e.target.closest('.card, .stat-tile, .draft-card, .inv-card');
      if (!card) return;
      if (card.classList.contains('tilt-card')) return;

      const interactive = e.target.closest('button, a, input, select, textarea, [role="button"]');
      if (interactive) {
        window.gsap.to(card, {
          y: 0,
          scale: 1,
          borderColor: '',
          boxShadow: '',
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        return;
      }

      const roleAccent =
        document.documentElement.style.getPropertyValue('--role-accent') || '#a78bfa';

      window.gsap.to(card, {
        y: -2,
        scale: 1,
        borderColor: `${roleAccent}44`,
        boxShadow: `0 16px 36px -12px rgba(0,0,0,0.6), 0 0 24px -6px ${roleAccent}18`,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    const onLeave = (e) => {
      const card = e.target.closest('.card, .stat-tile, .draft-card, .inv-card');
      if (!card) return;
      if (card.classList.contains('tilt-card')) return;

      window.gsap.to(card, {
        y: 0,
        scale: 1,
        borderColor: '',
        boxShadow: '',
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    document.addEventListener('mouseover', onEnter, true);
    document.addEventListener('mouseout', onLeave, true);
    return () => {
      document.removeEventListener('mouseover', onEnter, true);
      document.removeEventListener('mouseout', onLeave, true);
    };
  }, [state.role]);

  return null;
}
