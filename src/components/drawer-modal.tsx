import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useStore } from './store-context';

export const DrawerContent: Record<string, React.ComponentType<any>> = {};
export const ModalContent: Record<string, React.ComponentType<any>> = {};

// Helper component to delay the appearance of the loading indicator
function DelayedFallback({ message }: { message: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;
  return (
    <div className="p-8 text-center text-sm" style={{ color: 'var(--color-ink-3)', opacity: 0.5 }}>
      {message}
    </div>
  );
}

// =========================================================
// Drawer with focus trap
// =========================================================
export function Drawer() {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drawer = state.drawer;

  const [activeDrawer, setActiveDrawer] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state.drawer to activeDrawer
  useEffect(() => {
    if (drawer) {
      setActiveDrawer(drawer);
      setIsClosing(false);
    } else if (activeDrawer) {
      setIsClosing(true);
      const win = window as any;
      if (win.gsap && ref.current && backdropRef.current) {
        win.gsap.killTweensOf([ref.current, backdropRef.current]);
        win.gsap.to(backdropRef.current, { opacity: 0, duration: 0.25, ease: 'power3.inOut' });
        win.gsap.to(ref.current, {
          x: 80,
          opacity: 0,
          duration: 0.3,
          ease: 'power3.inOut',
          onComplete: () => {
            setActiveDrawer(null);
            setIsClosing(false);
          },
        });
      } else {
        setActiveDrawer(null);
        setIsClosing(false);
      }
    }
  }, [drawer]);

  // Focus trap
  useEffect(() => {
    if (!activeDrawer || isClosing || !ref.current) return;
    const drawerEl = ref.current;
    const focusable = drawerEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    drawerEl.addEventListener('keydown', trap);
    return () => drawerEl.removeEventListener('keydown', trap);
  }, [activeDrawer, isClosing]);

  // Entrance animation + form field stagger
  useEffect(() => {
    if (!activeDrawer || isClosing || !ref.current) return;
    const win = window as any;
    if (!win.gsap) return;
    win.gsap.killTweensOf([ref.current, backdropRef.current]);
    win.gsap.fromTo(
      backdropRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.28, ease: 'power3.out' }
    );
    win.gsap.fromTo(
      ref.current,
      { x: 80, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.45,
        ease: 'power4.out',
        onComplete: () => {
          // Stagger form fields after drawer settles
          if (ref.current) {
            const fields = ref.current.querySelectorAll(
              '.form-group, .form-row, .form-actions, .settings-row'
            );
            if (fields.length > 0) {
              win.gsap.from(fields, {
                y: 10,
                opacity: 0,
                duration: 0.35,
                ease: 'power3.out',
                stagger: 0.04,
                clearProps: 'transform',
              });
            }
          }
        },
      }
    );
  }, [activeDrawer, isClosing]);

  if (!activeDrawer) return null;
  const Comp = DrawerContent[activeDrawer.kind];
  return (
    <>
      <div
        ref={backdropRef}
        className="modal-backdrop"
        onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
        aria-hidden="true"
      />
      <div
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {Comp && (
          <Suspense fallback={<DelayedFallback message="Memuat form..." />}>
            <Comp payload={activeDrawer.payload} close={() => dispatch({ type: 'CLOSE_DRAWER' })} />
          </Suspense>
        )}
      </div>
    </>
  );
}

// =========================================================
// Modal with focus trap + spring
// =========================================================
export function Modal() {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const modal = state.modal;

  const [activeModal, setActiveModal] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state.modal to activeModal
  useEffect(() => {
    if (modal) {
      setActiveModal(modal);
      setIsClosing(false);
    } else if (activeModal) {
      setIsClosing(true);
      const win = window as any;
      if (win.gsap && ref.current && backdropRef.current) {
        win.gsap.killTweensOf([ref.current, backdropRef.current]);
        win.gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power3.inOut' });
        win.gsap.to(ref.current, {
          y: 20,
          scale: 0.95,
          opacity: 0,
          duration: 0.25,
          ease: 'power3.inOut',
          onComplete: () => {
            setActiveModal(null);
            setIsClosing(false);
          },
        });
      } else {
        setActiveModal(null);
        setIsClosing(false);
      }
    }
  }, [modal]);

  // Focus trap
  useEffect(() => {
    if (!activeModal || isClosing || !ref.current) return;
    const modalEl = ref.current;
    const focusable = modalEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    modalEl.addEventListener('keydown', trap);
    return () => modalEl.removeEventListener('keydown', trap);
  }, [activeModal, isClosing]);

  // Entrance animation + form field stagger
  useEffect(() => {
    if (!activeModal || isClosing || !ref.current) return;
    const win = window as any;
    if (!win.gsap) return;
    win.gsap.killTweensOf([ref.current, backdropRef.current]);
    win.gsap.fromTo(
      backdropRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power3.out' }
    );
    win.gsap.fromTo(
      ref.current,
      { y: 20, scale: 0.96, opacity: 0 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: 'power4.out',
        onComplete: () => {
          // Stagger form fields after modal settles
          if (ref.current) {
            const fields = ref.current.querySelectorAll(
              '.form-group, .form-row, .form-actions, .settings-row'
            );
            if (fields.length > 0) {
              win.gsap.from(fields, {
                y: 8,
                opacity: 0,
                duration: 0.3,
                ease: 'power3.out',
                stagger: 0.04,
                clearProps: 'transform',
              });
            }
          }
        },
      }
    );
  }, [activeModal, isClosing]);

  if (!activeModal) return null;
  const Comp = ModalContent[activeModal.kind];
  return (
    <>
      <div
        ref={backdropRef}
        className="modal-backdrop z-[95]"
        onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
        aria-hidden="true"
      />
      <div ref={ref} className="modal-center z-[96]" role="dialog" aria-modal="true">
        {Comp && (
          <Suspense fallback={<DelayedFallback message="Memuat..." />}>
            <Comp payload={activeModal.payload} close={() => dispatch({ type: 'CLOSE_MODAL' })} />
          </Suspense>
        )}
      </div>
    </>
  );
}
