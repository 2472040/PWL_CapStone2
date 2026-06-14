// Aurora — visionOS-flavored dark concept site (Modularized)
import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CustomCursor } from '../../components/app-cursor.jsx';
import { CursorEnabler } from '../../components/app-shell.jsx';

import { D, AuRise } from './LandingUtils.jsx';
import HeroSection from './HeroSection.jsx';
import AdvancedMarquee from './AdvancedMarquee.jsx';
import FlowSection from './FlowSection.jsx';
import InventorySection from './InventorySection.jsx';
import ActivitySection from './ActivitySection.jsx';
import BentoFeatures from './BentoFeatures.jsx';
import StatsCounter from './StatsCounter.jsx';
import Testimonials from './Testimonials.jsx';
import PremiumFooter from './PremiumFooter.jsx';
import { motion, AnimatePresence } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

export default function AuroraSite({ onEnterApp }) {
  const rootRef = useRef(null);
  const heroCtaRef = useRef(null);
  const [showNavSignIn, setShowNavSignIn] = useState(false);
  // Flow state: 0=Kalab draft, 1=Kaprodi review, 2=Admin receive
  const [step, setStep] = useState(0);

  // Show nav sign-in only when hero CTA button scrolls out of view
  useEffect(() => {
    const target = heroCtaRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowNavSignIn(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const [approvals, setApprovals] = useState(() => {
    const o = {};
    D.draft.items.forEach((it) => (o[it.id] = null));
    return o;
  });
  const [received, setReceive] = useState({});

  const setApproval = (id, val) =>
    setApprovals((p) => ({ ...p, [id]: p[id] === val ? null : val }));
  const approveAll = () => {
    const o = {};
    D.draft.items.forEach((it) => (o[it.id] = 'ok'));
    setApprovals(o);
  };
  const toggleReceive = (id) => setReceive((p) => ({ ...p, [id]: !p[id] }));

  const totals = {
    all: D.draft.items.reduce((s, i) => s + i.qty * i.price, 0),
    approved: D.draft.items
      .filter((it) => approvals[it.id] === 'ok')
      .reduce((s, i) => s + i.qty * i.price, 0),
  };

  // Smooth scrolling with Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let ctx = gsap.context(() => {
      // Intro sequence
      const tl = gsap.timeline();
      tl.fromTo(
        '.au-nav',
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )
        .fromTo('.au-eyebrow', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.4')
        .fromTo(
          '.au-h1',
          { opacity: 0, y: 30, rotationX: -15, transformPerspective: 800 },
          { opacity: 1, y: 0, rotationX: 0, duration: 1, ease: 'power4.out' },
          '-=0.2'
        )
        .fromTo(
          '.au-hero-sub',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
          '-=0.6'
        )
        .fromTo(
          '.au-hero-ctas > *',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
          '-=0.5'
        )
        .fromTo(
          '.au-hero-preview',
          { opacity: 0, y: 80, scale: 0.95, rotationX: 10, transformPerspective: 1000 },
          { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: 1.2, ease: 'power4.out' },
          '-=0.6'
        )
        .fromTo(
          '.au-trusted-label',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.3'
        )
        .fromTo(
          '.au-trusted-item',
          { opacity: 0, y: 15 },
          { opacity: 0.5, y: 0, stagger: 0.08, duration: 0.5 },
          '-=0.3'
        );

      // Marquee speed on scroll
      gsap.to('.au-marquee-track', {
        x: '-=300',
        ease: 'none',
        scrollTrigger: { trigger: '.au-marquee', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });

      // Section headings with 3D Flip reveal
      root.querySelectorAll('.au-section-h2').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 50, opacity: 0, rotationX: -30, transformPerspective: 800 },
          {
            y: 0,
            opacity: 1,
            rotationX: 0,
            duration: 1,
            ease: 'power4.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          }
        );
      });

      // Section subs
      root.querySelectorAll('.au-section-sub').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            delay: 0.15,
            scrollTrigger: { trigger: el, start: 'top 85%' },
          }
        );
      });

      // Flow stage card
      gsap.fromTo(
        '.au-flow-stage',
        { y: 60, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.au-flow-stage', start: 'top 85%' },
        }
      );

      // Flow steps
      gsap.fromTo(
        '.au-flow-step',
        { x: -20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.5,
          scrollTrigger: { trigger: '.au-flow-bar', start: 'top 85%' },
        }
      );

      // Draft items stagger
      gsap.fromTo(
        '.au-item',
        { x: -30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.au-items', start: 'top 85%' },
        }
      );

      // Draft totals
      gsap.fromTo(
        '.au-totals > div',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.5,
          scrollTrigger: { trigger: '.au-draft-foot', start: 'top 95%' },
        }
      );

      // Inventory cards (Scroll-Pinned Feature Build-up)
      const invSection = root.querySelector('#inv-section');
      if (invSection) {
        gsap.fromTo(
          '.au-inv-card',
          { y: 80, opacity: 0, scale: 0.9, rotationX: 10 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotationX: 0,
            stagger: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: invSection,
              start: 'center center',
              end: '+=800', // scrub distance
              pin: true,
              scrub: 1,
            },
          }
        );
      }

      // Bento feature grid
      gsap.fromTo(
        '.au-bento-item',
        { y: 60, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#bento-features', start: 'top 80%' },
        }
      );

      // Activity rows
      gsap.fromTo(
        '.au-activity-row',
        { x: 30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.au-activity', start: 'top 85%' },
        }
      );

      // Stats counter cards
      gsap.fromTo(
        '.au-stat-item',
        { y: 40, opacity: 0, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.1,
          duration: 0.7,
          ease: 'back.out(1.2)',
          scrollTrigger: { trigger: '#stats-section', start: 'top 85%' },
        }
      );

      // Testimonial card
      gsap.fromTo(
        '.au-testimonial-card',
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#testimonials-section', start: 'top 80%' },
        }
      );

      // CTA section timeline
      const ctaTl = gsap.timeline({ scrollTrigger: { trigger: '.au-cta', start: 'top 80%' } });
      ctaTl
        .fromTo(
          '.au-cta',
          { y: 40, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }
        )
        .fromTo('.au-cta-h', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
        .fromTo('.au-cta-sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
        .fromTo(
          '.au-cta-btns > *',
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.1, duration: 0.5 },
          '-=0.2'
        );

      // Footer
      gsap.fromTo(
        '.au-foot',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: { trigger: '.au-foot', start: 'top 95%' },
        }
      );

      // Refresh ScrollTrigger after a slight delay to ensure layout is settled
      setTimeout(() => ScrollTrigger.refresh(), 300);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="au" ref={rootRef}>
      <CursorEnabler />
      <CustomCursor />
      <div className="au-aurora">
        <div className="au-aurora-blob au-aurora-1" />
        <div className="au-aurora-blob au-aurora-2" />
        <div className="au-aurora-blob au-aurora-3" />
      </div>
      <div className="au-grain" />

      <div className="au-layer">
        <Nav showSignIn={showNavSignIn} onSignIn={onEnterApp} />
        <HeroSection onEnterApp={onEnterApp} ctaRef={heroCtaRef} />
        <AdvancedMarquee />
        <FlowSection
          step={step}
          setStep={setStep}
          approvals={approvals}
          setApproval={setApproval}
          approveAll={approveAll}
          received={received}
          setReceive={toggleReceive}
          totals={totals}
        />
        <InventorySection />
        <BentoFeatures />
        <StatsCounter />
        <ActivitySection />
        <Testimonials />
        <CTA />
        <PremiumFooter />
      </div>
    </div>
  );
}

function Nav({ showSignIn, onSignIn }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="au-nav">
      <div
        className="au-brand"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ cursor: 'pointer' }}
      >
        <img src="/assets/loka_lab.png" alt="Loka Lab" className="au-brand-dot" />
        <span>Loka</span>
        <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
          · Lab Suite
        </span>
      </div>
      <div className="au-nav-links">
        <a onClick={() => scrollToSection('bento-features')} style={{ cursor: 'pointer' }}>
          Produk
        </a>
        <a onClick={() => scrollToSection('flow-section')} style={{ cursor: 'pointer' }}>
          Alur Pengadaan
        </a>
        <a onClick={() => scrollToSection('inv-section')} style={{ cursor: 'pointer' }}>
          Inventaris
        </a>
      </div>
      <div
        style={{
          minWidth: 80,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'visible',
        }}
      >
        <AnimatePresence>
          {showSignIn && (
            <motion.button
              className="au-nav-cta"
              onClick={onSignIn}
              initial={{ opacity: 0, scale: 0.85, x: 15 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 15 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ margin: 0 }}
            >
              Sign In
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

function CTA() {
  return (
    <AuRise as="section" className="au-cta">
      <h2 className="au-cta-h">
        Inventaris yang akhirnya
        <br />
        <em>ngomong sendiri.</em>
      </h2>
      <p className="au-cta-sub">
        Coba gratis 30 hari untuk satu prodi. Tanpa kartu kredit. Migrasi data dibantu.
      </p>
    </AuRise>
  );
}

function Foot() {
  return (
    <footer className="au-foot">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/assets/loka_lab.png"
          alt="Loka Lab"
          className="au-brand-dot"
          style={{ width: 18, height: 18 }}
        />
        <span>© 2026 Loka Lab Suite · Dibuat di Bandung</span>
      </div>
      <div className="au-foot-links">
        <a>Privasi</a>
        <a>Ketentuan</a>
        <a>Status</a>
        <a>Changelog</a>
      </div>
    </footer>
  );
}
