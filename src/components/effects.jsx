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
// Stagger Reveal Engine — Apple-like entrance for dashboard
// Animates [data-reveal] elements with staggered fade+translate
// Animates [data-reveal-children] container children sequentially
// =========================================================
export function useStaggerReveal(ref, deps = [], onComplete = null) {
  useEffect(() => {
    if (!window.gsap || !ref?.current) return;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      // Instantly reveal everything without animation
      ref.current.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('revealed'));
      ref.current
        .querySelectorAll('[data-reveal-children]')
        .forEach((el) => el.classList.add('revealed'));
      if (onComplete) onComplete();
      return;
    }

    const ctx = window.gsap.context(() => {
      // Stagger [data-reveal] elements
      const reveals = ref.current.querySelectorAll('[data-reveal]');
      let activeAnimations = 0;

      const checkComplete = () => {
        activeAnimations--;
        if (activeAnimations <= 0 && onComplete) {
          onComplete();
        }
      };

      if (reveals.length > 0) {
        activeAnimations++;
        window.gsap.fromTo(
          reveals,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.75,
            ease: 'power4.out',
            stagger: 0.05,
            delay: 0.05,
            onComplete: () => {
              reveals.forEach((el) => el.classList.add('revealed'));
              checkComplete();
            },
          }
        );
      }

      // Stagger children inside [data-reveal-children] containers
      const childContainers = ref.current.querySelectorAll('[data-reveal-children]');
      childContainers.forEach((container) => {
        const children = container.children;
        if (children.length === 0) return;
        activeAnimations++;
        window.gsap.fromTo(
          children,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.65,
            ease: 'power4.out',
            stagger: 0.04,
            delay: 0.1,
            onComplete: () => {
              container.classList.add('revealed');
              checkComplete();
            },
          }
        );
      });

      if (activeAnimations === 0 && onComplete) {
        onComplete();
      }
    }, ref);

    return () => ctx.revert();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// =========================================================
// Table/List row stagger — animates visible rows on mount
// =========================================================
export function useListStagger(ref, selector, deps = []) {
  useEffect(() => {
    if (!window.gsap || !ref?.current) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    // Small delay to allow React to finish rendering rows
    const timer = setTimeout(() => {
      if (!ref.current) return;
      const rows = ref.current.querySelectorAll(selector);
      if (rows.length === 0) return;

      // Limit to first 30 rows for performance
      const target = Array.from(rows).slice(0, 30);
      window.gsap.from(target, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.out',
        stagger: 0.025,
      });
    }, 80);

    return () => clearTimeout(timer);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
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
              clearProps: 'transform',
            });
            const shine = c.querySelector('.tilt-shine');
            if (shine) {
              window.gsap.to(shine, {
                background: 'transparent',
                duration: 0.6,
                ease: 'power3.out',
                clearProps: 'background',
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
            clearProps: 'transform',
          });
          const shine = card.querySelector('.tilt-shine');
          if (shine) {
            window.gsap.to(shine, {
              background: 'transparent',
              duration: 0.6,
              ease: 'power3.out',
              clearProps: 'background',
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

// =========================================================
// List Stagger Engine — auto-animate table rows & list items
// Uses MutationObserver to detect newly inserted elements
// =========================================================
export function ListStaggerEngine() {
  useEffect(() => {
    if (!window.gsap) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const SELECTORS = '.tbl tbody tr, .act-row, .bhp-row, .draft-card, .inv-card';
    const animated = new WeakSet();

    const observer = new MutationObserver((mutations) => {
      const newNodes = [];
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          // Check if the node itself matches or contains matching elements
          if (node.matches?.(SELECTORS)) {
            if (!animated.has(node)) newNodes.push(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll(SELECTORS).forEach((el) => {
              if (!animated.has(el)) newNodes.push(el);
            });
          }
        }
      }

      if (newNodes.length === 0) return;

      // Limit to 30 for performance
      const targets = newNodes.slice(0, 30);
      targets.forEach((el) => animated.add(el));

      window.gsap.from(targets, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.02,
        delay: 0.05,
      });
    });

    // Observe the main content area for DOM changes
    const main = document.querySelector('.main');
    if (main) {
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, []);
  return null;
}
