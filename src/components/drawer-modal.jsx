import React, { useRef, useEffect, useState } from 'react';
import { useStore } from './store-context.jsx';

export const DrawerContent = {};
export const ModalContent = {};

// =========================================================
// Drawer with focus trap
// =========================================================
export function Drawer() {
  const { state, dispatch } = useStore();
  const ref = useRef();
  const backdropRef = useRef();
  const drawer = state.drawer;

  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state.drawer to activeDrawer
  useEffect(() => {
    if (drawer) {
      setActiveDrawer(drawer);
      setIsClosing(false);
    } else if (activeDrawer) {
      setIsClosing(true);
      if (window.gsap && ref.current && backdropRef.current) {
        window.gsap.killTweensOf([ref.current, backdropRef.current]);
        window.gsap.to(backdropRef.current, { opacity: 0, duration: 0.25, ease: 'power3.inOut' });
        window.gsap.to(ref.current, { 
          x: 80, 
          opacity: 0, 
          duration: 0.3, 
          ease: 'power3.inOut',
          onComplete: () => {
            setActiveDrawer(null);
            setIsClosing(false);
          }
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
    const focusable = drawerEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    drawerEl.addEventListener('keydown', trap);
    return () => drawerEl.removeEventListener('keydown', trap);
  }, [activeDrawer, isClosing]);

  // Entrance animation
  useEffect(() => {
    if (!activeDrawer || isClosing || !ref.current || !window.gsap) return;
    window.gsap.killTweensOf([ref.current, backdropRef.current]);
    window.gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power3.out' });
    window.gsap.fromTo(ref.current, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power4.out' });
  }, [activeDrawer, isClosing]);

  if (!activeDrawer) return null;
  const Comp = DrawerContent[activeDrawer.kind];
  return (
    <>
      <div ref={backdropRef} className="modal-backdrop" onClick={() => dispatch({ type: 'CLOSE_DRAWER' })} aria-hidden="true" />
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        {Comp && <Comp payload={activeDrawer.payload} close={() => dispatch({ type: 'CLOSE_DRAWER' })} />}
      </div>
    </>
  );
}

// =========================================================
// Modal with focus trap + spring
// =========================================================
export function Modal() {
  const { state, dispatch } = useStore();
  const ref = useRef();
  const backdropRef = useRef();
  const modal = state.modal;

  const [activeModal, setActiveModal] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state.modal to activeModal
  useEffect(() => {
    if (modal) {
      setActiveModal(modal);
      setIsClosing(false);
    } else if (activeModal) {
      setIsClosing(true);
      if (window.gsap && ref.current && backdropRef.current) {
        window.gsap.killTweensOf([ref.current, backdropRef.current]);
        window.gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power3.inOut' });
        window.gsap.to(ref.current, { 
          y: 20, 
          scale: 0.95, 
          opacity: 0, 
          duration: 0.25, 
          ease: 'power3.inOut',
          onComplete: () => {
            setActiveModal(null);
            setIsClosing(false);
          }
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
    const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modalEl.addEventListener('keydown', trap);
    return () => modalEl.removeEventListener('keydown', trap);
  }, [activeModal, isClosing]);

  // Entrance animation
  useEffect(() => {
    if (!activeModal || isClosing || !ref.current || !window.gsap) return;
    window.gsap.killTweensOf([ref.current, backdropRef.current]);
    window.gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power3.out' });
    window.gsap.fromTo(ref.current, { y: 20, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power4.out' });
  }, [activeModal, isClosing]);

  if (!activeModal) return null;
  const Comp = ModalContent[activeModal.kind];
  return (
    <>
      <div ref={backdropRef} className="modal-backdrop z-[95]" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} aria-hidden="true" />
      <div ref={ref} className="modal-center z-[96]" role="dialog" aria-modal="true">
        {Comp && <Comp payload={activeModal.payload} close={() => dispatch({ type: 'CLOSE_MODAL' })} />}
      </div>
    </>
  );
}
