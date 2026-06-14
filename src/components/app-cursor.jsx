// app-cursor.jsx — Custom cursor with role-accent glow, idle hide, magnetic on interactive
// Pure frontend, no deps. Respects prefers-reduced-motion & touch devices.
import React, { useState, useEffect, useRef, useMemo } from 'react';

function CustomCursor() {
  // Skip on touch devices and reduced-motion
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const idleTimer = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const raf = useRef(null);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqPointer = window.matchMedia('(pointer: coarse)');
    const check = () => setEnabled(!mqMotion.matches && !mqPointer.matches);
    check();
    mqMotion.addEventListener('change', check);
    mqPointer.addEventListener('change', check);
    return () => {
      mqMotion.removeEventListener('change', check);
      mqPointer.removeEventListener('change', check);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e) => {
      target.current = { x: e.clientX, y: e.clientY };
      setHidden(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setHidden(true), 3000);
    };

    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);

    let magneticEl = null;

    const onEnterInteractive = (e) => {
      const el = e.target.closest('button, .au-btn, .au-role, .au-tab, .au-preview-dot');
      if (el) {
        setHovering(true);
        if (el.classList.contains('au-btn') || el.classList.contains('au-tab')) {
          magneticEl = el;
          el.style.transform = 'scale(1.05)';
          el.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }
      }
    };
    const onLeaveInteractive = (e) => {
      const el = e.target.closest('button, .au-btn, .au-role, .au-tab, .au-preview-dot');
      if (el) {
        setHovering(false);
        if (magneticEl) {
          magneticEl.style.transform = 'scale(1)';
          magneticEl = null;
        }
      }
    };

    const loop = () => {
      if (magneticEl && ringRef.current) {
        // Snap to center of magnetic element
        const rect = magneticEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        pos.current.x += (cx - pos.current.x) * 0.2;
        pos.current.y += (cy - pos.current.y) * 0.2;

        // Match size roughly
        ringRef.current.style.width = `${rect.width + 12}px`;
        ringRef.current.style.height = `${rect.height + 12}px`;
        ringRef.current.style.borderRadius = getComputedStyle(magneticEl).borderRadius || '12px';
        ringRef.current.style.mixBlendMode = 'difference';
        ringRef.current.style.background = 'white';
        ringRef.current.style.border = 'none';
      } else {
        // Normal follow
        pos.current.x += (target.current.x - pos.current.x) * 0.15;
        pos.current.y += (target.current.y - pos.current.y) * 0.15;

        if (ringRef.current) {
          ringRef.current.style.width = hovering ? '48px' : '32px';
          ringRef.current.style.height = hovering ? '48px' : '32px';
          ringRef.current.style.borderRadius = '50%';
          ringRef.current.style.mixBlendMode = 'normal';
          ringRef.current.style.background = 'transparent';
          ringRef.current.style.border = '1px solid var(--ink-4)';
        }
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${target.current.x}px, ${target.current.y}px) translate(-50%, -50%)`;
        if (magneticEl) {
          dotRef.current.style.opacity = '0';
        } else {
          dotRef.current.style.opacity = hidden ? '0' : '1';
        }
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onEnterInteractive);
    document.addEventListener('mouseout', onLeaveInteractive);

    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onEnterInteractive);
      document.removeEventListener('mouseout', onLeaveInteractive);
      clearTimeout(idleTimer.current);
    };
  }, [enabled, hovering, hidden]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        className={`cursor-ring ${clicking ? 'click' : ''}`}
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          transition: 'width 0.2s, height 0.2s, border-radius 0.2s, background 0.2s',
        }}
        aria-hidden="true"
      />
      <div
        ref={dotRef}
        className={`cursor-dot ${clicking ? 'click' : ''}`}
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 10000,
          width: '6px',
          height: '6px',
          background: 'white',
          borderRadius: '50%',
          transition: 'opacity 0.2s',
        }}
        aria-hidden="true"
      />
    </>
  );
}

export { CustomCursor };
