// app-shell.jsx — Loka shell: sidebar + role switch + screen router
// Hosts top-level state + GSAP transitions, exposes via window.LokaApp.
// v2.0: + Mobile responsive, functional search, keyboard shortcuts, a11y

import React, {  useState, useEffect, useRef, useReducer, useMemo, createContext, useContext, useCallback  } from 'react';
import { LOKA as D } from '../data/app-data.jsx';
import { Icon, QR, downloadQR } from '../components/app-icons.jsx';

// =========================================================
// Toast system
// =========================================================
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = (msg, kind = 'ok', icon) => {
    const id = Math.random().toString(36).slice(2);
    setItems(xs => [...xs, { id, msg, kind, icon }]);
    setTimeout(() => {
      setItems(xs => xs.map(x => x.id === id ? { ...x, exiting: true } : x));
      setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), 350);
    }, 3200);
  };
  // Global access for non-React handlers (demo buttons)
  if (!window.showToast) window.showToast = push;
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host" role="region" aria-label="Notifikasi">
        {items.map(t => <Toast key={t.id} t={t} />)}
      </div>
    </ToastCtx.Provider>
  );
}
function Toast({ t }) {
  const ref = useRef();
  useEffect(() => {
    if (window.gsap && ref.current) {
      window.gsap.from(ref.current, { x: 30, opacity: 0, duration: 0.35, ease: 'power3.out' });
    }
  }, []);
  return (
    <div ref={ref} className={`toast ${t.kind} ${t.exiting ? 'exiting' : ''}`} role="status" aria-live="polite">
      <div className="ico">
        <Icon name={t.icon || (t.kind === 'ok' ? 'check' : t.kind === 'warn' ? 'alert' : 'info')} size={13} strokeWidth={2.2} />
      </div>
      <div>{t.msg}</div>
    </div>
  );
}
const useToast = () => useContext(ToastCtx);

// =========================================================
// Search context
// =========================================================
const SearchCtx = createContext({ query: '', setQuery: () => {} });
function SearchProvider({ children }) {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}
const useSearch = () => useContext(SearchCtx);

// =========================================================
// App-wide store (single useReducer)
// =========================================================
const StoreCtx = createContext(null);

function initStore() {
  let theme = 'dark';
  let accent = 'auto';
  let density = 'comfortable';
  try {
    theme = localStorage.getItem('loka-theme') || 'dark';
    accent = localStorage.getItem('loka-accent') || 'auto';
    density = localStorage.getItem('loka-density') || 'comfortable';
  } catch (e) {}
  return {
    role: 'kalab',
    screen: 'dashboard',
    theme,
    accent,
    density,
    currentUser: null,
    drafts: D.drafts.map(d => ({
      ...d,
      items: d.items.map(it => ({ ...it, approval: d.status === 'finalized' || d.status === 'completed' ? 'ok' : null, received: d.status === 'completed' })),
    })),
    inventory: [...D.inventory],
    bhp: [...D.bhp],
    users: [...D.users],
    rooms: [...D.rooms],
    maintLog: [...D.maintLog],
    drawer: null,
    modal: null,
    mobileSidebarOpen: false,
  };
}

function reducer(s, a) {
  switch (a.type) {
    case 'SET_ROLE':   return { ...s, role: a.role, screen: 'dashboard', mobileSidebarOpen: false };
    case 'SET_USER':   return { ...s, currentUser: a.user };
    case 'SET_SCREEN': return { ...s, screen: a.screen, mobileSidebarOpen: false };
    case 'OPEN_DRAWER': return { ...s, drawer: a.drawer };
    case 'CLOSE_DRAWER': return { ...s, drawer: null };
    case 'SET_DRAFTS': return { ...s, drafts: a.drafts };
    case 'SET_INVENTORY': return { ...s, inventory: a.inventory };
    case 'SET_USERS': return { ...s, users: a.users };
    case 'SET_ROOMS': return { ...s, rooms: a.rooms };
    case 'SET_APPROVAL': {
      return {
        ...s,
        drafts: s.drafts.map(d => d.code !== a.code ? d : ({
          ...d,
          items: d.items.map(it => it.id !== a.itemId ? it : ({ ...it, approval: it.approval === a.value ? null : a.value })),
        })),
      };
    }
    case 'APPROVE_ALL': {
      return {
        ...s,
        drafts: s.drafts.map(d => d.code !== a.code ? d : ({
          ...d, items: d.items.map(it => ({ ...it, approval: it.approval || 'ok' })),
        })),
      };
    }
    case 'FINALIZE_DRAFT': {
      return { ...s, drafts: s.drafts.map(d => d.code !== a.code ? d : ({ ...d, status: 'finalized' })) };
    }
    case 'MARK_RECEIVED': {
      return {
        ...s,
        drafts: s.drafts.map(d => d.code !== a.code ? d : ({
          ...d, items: d.items.map(it => it.id !== a.itemId ? it : ({ ...it, received: !it.received, receivedDate: !it.received ? a.date : null })),
        })),
      };
    }
    case 'COMPLETE_DRAFT': {
      return { ...s, drafts: s.drafts.map(d => d.code !== a.code ? d : ({ ...d, status: 'completed' })) };
    }
    case 'ADD_DRAFT_ITEM': {
      return { ...s, drafts: s.drafts.map(d => d.code !== a.code ? d : ({ ...d, items: [...d.items, a.item] })) };
    }
    case 'REMOVE_DRAFT_ITEM': {
      return { ...s, drafts: s.drafts.map(d => d.code !== a.code ? d : ({ ...d, items: d.items.filter(it => it.id !== a.itemId) })) };
    }
    case 'NEW_DRAFT': {
      return { ...s, drafts: [a.draft, ...s.drafts] };
    }
    case 'BHP_DELTA': {
      return { ...s, bhp: s.bhp.map(b => b.id !== a.id ? b : ({ ...b, stock: Math.max(0, b.stock + a.delta) })) };
    }
    case 'BHP_RESTOCK': {
      return { ...s, bhp: s.bhp.map(b => b.id !== a.id ? b : ({ ...b, stock: b.stock + a.amount, lastIn: a.date })) };
    }
    case 'ADD_MAINT_LOG': {
      let bhp = s.bhp;
      a.log.bhp.forEach(b => { bhp = bhp.map(x => x.id !== b.id ? x : ({ ...x, stock: Math.max(0, x.stock - b.qty) })); });
      const inv = s.inventory.map(x => x.code !== a.log.asset ? x : ({ ...x, cond: a.log.cond, last: 'baru saja' }));
      return { ...s, maintLog: [a.log, ...s.maintLog], bhp, inventory: inv };
    }
    case 'SET_MAINT_LOGS': return { ...s, maintLog: a.logs };
    case 'SET_BHP': return { ...s, bhp: a.bhp };
    case 'ADD_USER':   return { ...s, users: [a.user, ...s.users] };
    case 'TOGGLE_USER': return { ...s, users: s.users.map(u => u.id !== a.id ? u : ({ ...u, status: u.status === 'active' ? 'paused' : 'active' })) };
    case 'ADD_ROOM':   return { ...s, rooms: [a.room, ...s.rooms] };
    case 'UPDATE_ASSET_LABEL': {
      return { ...s, inventory: s.inventory.map(x => x.code !== a.code ? x : ({ ...x, ...a.patch })) };
    }
    case 'SET_THEME': {
      try { localStorage.setItem('loka-theme', a.theme); } catch (e) {}
      document.documentElement.setAttribute('data-theme', a.theme);
      return { ...s, theme: a.theme };
    }
    case 'SET_ACCENT': {
      try { localStorage.setItem('loka-accent', a.accent); } catch (e) {}
      return { ...s, accent: a.accent };
    }
    case 'SET_DENSITY': {
      try { localStorage.setItem('loka-density', a.density); } catch (e) {}
      document.documentElement.setAttribute('data-density', a.density);
      return { ...s, density: a.density };
    }
    case 'OPEN_MODAL': return { ...s, modal: a.modal };
    case 'CLOSE_MODAL': return { ...s, modal: null };
    case 'TOGGLE_MOBILE_SIDEBAR': return { ...s, mobileSidebarOpen: !s.mobileSidebarOpen };
    case 'CLOSE_MOBILE_SIDEBAR': return { ...s, mobileSidebarOpen: false };
    default: return s;
  }
}

function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initStore);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}
const useStore = () => useContext(StoreCtx);

// =========================================================
// IntersectionObserver reveal fallback (when GSAP unavailable)
// =========================================================
function useRevealFallback() {
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
function useKeyboardShortcuts(dispatch) {
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
// Mobile sidebar backdrop + hamburger
// =========================================================
function MobileSidebarToggle() {
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {state.mobileSidebarOpen ? (
            <><path d="M18 6L6 18M6 6l12 12"/></>
          ) : (
            <><path d="M3 12h18M3 6h18M3 18h18"/></>
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
// Sidebar
// =========================================================
function Sidebar() {
  const { state, dispatch } = useStore();
  const [popOpen, setPopOpen] = useState(false);
  const popRef = useRef();
  const sbRef = useRef();
  const role = D.roles.find(r => r.id === state.role);
  const me = state.currentUser || D.me[state.role] || { name: 'Pengguna', initials: '?' };
  const items = D.nav[state.role];

  useEffect(() => {
    if (!popOpen) return;
    const off = e => { if (popRef.current && !popRef.current.contains(e.target)) setPopOpen(false); };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [popOpen]);

  // GSAP: stagger nav items in on mount + on role change
  useEffect(() => {
    if (!window.gsap || !sbRef.current) return;
    const els = sbRef.current.querySelectorAll('[data-sb-anim]');
    const ctx = window.gsap.context(() => {
      window.gsap.fromTo(els, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity', immediateRender: false });
    }, sbRef);
    return () => ctx.revert();
  }, [state.role]);

  const setRole = (id) => {
    setPopOpen(false);
    dispatch({ type: 'SET_ROLE', role: id });
  };

  return (
    <aside
      id="main-sidebar"
      className={`sb ${state.mobileSidebarOpen ? 'open' : ''}`}
      ref={sbRef}
      style={{'--role-accent': role.accent}}
      role="navigation"
      aria-label="Menu utama"
    >
      <div className="sb-brand" data-sb-anim>
        <div className="sb-brand-dot" aria-hidden="true" />
        <div>
          <div className="sb-brand-name">Loka</div>
          <div className="sb-brand-sub">// lab inv. 2.0</div>
        </div>
      </div>

      {/* User profile card (static display, switcher removed) */}
      <div data-sb-anim>
        <div className="role-switch">
          <div className="role-switch-head">
            <div className="role-switch-av" style={{'--role-accent': role.accent}} aria-hidden="true">{me.initials}</div>
            <div className="role-switch-info">
              <div className="role-switch-name">{me.name}</div>
              <div className="role-switch-role">{role.short.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sb-sec" data-sb-anim>Menu</div>
      <div className="sb-list" role="menubar">
        {items.map(it => (
          <div
            key={it.id}
            data-sb-anim
            className={`sb-item ${state.screen === it.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: it.id })}
            role="menuitem"
            tabIndex={0}
            aria-current={state.screen === it.id ? 'page' : undefined}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') dispatch({ type: 'SET_SCREEN', screen: it.id }); }}
          >
            <Icon name={it.icon} size={16} strokeWidth={1.6} />
            <span className="lbl">{it.label}</span>
            {it.badge && <span className={`badge ${typeof it.badge === 'number' ? 'num' : 'new'}`}>{it.badge}</span>}
          </div>
        ))}
      </div>

      <div className="sb-foot" data-sb-anim>
        <div className="sb-foot-actions" role="group" aria-label="Aksi cepat">
          <button className={`sb-foot-btn ${state.screen === 'settings' ? 'active' : ''}`} title="Pengaturan" aria-label="Pengaturan" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'settings' })}>
            <Icon name="settings" size={15} />
          </button>
          <button className="sb-foot-btn" title={state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'} aria-label={state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'} onClick={() => dispatch({ type: 'SET_THEME', theme: state.theme === 'dark' ? 'light' : 'dark' })}>
            {state.theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          <button className="sb-foot-btn danger" title="Keluar" aria-label="Keluar" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { kind: 'logout' } })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
        <div className="sb-foot-card">
          <div className="sb-foot-pulse" aria-hidden="true" />
          <div>
            <div className="text-xs text-ink">Sistem operasional</div>
            <div className="mono text-[10px] mt-0.5">{state.rooms.length || 9} lab · {state.inventory.length || 287} aset · live</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// =========================================================
// Top bar with functional search
// =========================================================
function PageBar({ breadcrumbs, rightContent }) {
  const { state, dispatch } = useStore();
  const { query, setQuery } = useSearch();
  const inputRef = useRef();

  return (
    <div className="page-bar" role="banner">
      <div className="crumb" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep" aria-hidden="true">/</span>}
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
            onChange={e => setQuery(e.target.value)}
            aria-label="Cari"
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </div>
        {rightContent}
        <button 
          className="btn icon" 
          title="Pindai QR Aset" 
          onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'qrScanner' } })}
          style={{ background: 'rgba(183,148,255,0.15)', color: '#b794ff', border: '1px solid rgba(183,148,255,0.2)' }}
        >
          <Icon name="qr" size={14} />
        </button>
        <button className="btn icon" title="Notifikasi" aria-label="Notifikasi"><Icon name="bell" size={14} /></button>
      </div>
    </div>
  );
}

// =========================================================
// Page wrapper with GSAP transitions + IO fallback
// =========================================================
function PageHost({ children, role, screen }) {
  const ref = useRef();
  useRevealFallback();

  useEffect(() => {
    if (!window.gsap || !ref.current) return;
    const ctx = window.gsap.context(() => {
      window.gsap.fromTo(ref.current, { y: 14 }, { y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' });
      const reveals = ref.current.querySelectorAll('[data-reveal]');
      if (reveals.length) {
        window.gsap.fromTo(reveals, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.05, clearProps: 'transform,opacity', immediateRender: false });
      }
      const counters = ref.current.querySelectorAll('[data-counter]');
      counters.forEach(c => {
        const target = parseFloat(c.dataset.counter);
        if (Number.isNaN(target)) return;
        const obj = { v: 0 };
        window.gsap.to(obj, {
          v: target, duration: 1.0, ease: 'power3.out',
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

  return <div ref={ref} key={role + ':' + screen} className="page-enter in">{children}</div>;
}

// =========================================================
// Stat tile with GSAP counter
// =========================================================
function StatTile({ label, value, fmt = 'int', icon, delta, accent }) {
  const initial = fmt === 'rp' ? window.fmtRpShort(value || 0) : (value || 0).toLocaleString('id-ID');
  return (
    <div className="stat-tile" data-reveal>
      <div className="stat-tile-lbl">
        {icon && <Icon name={icon} size={13} strokeWidth={1.8} />}
        {label}
      </div>
      <div className="stat-tile-val mono" style={{color: accent}} data-counter={value} data-fmt={fmt}>{initial}</div>
      {delta && <div className={`stat-tile-delta ${delta.dir}`}>{delta.text}</div>}
    </div>
  );
}

// =========================================================
// Drawer with focus trap
// =========================================================
function Drawer() {
  const { state, dispatch } = useStore();
  const ref = useRef();
  const backdropRef = useRef();
  const drawer = state.drawer;

  // Focus trap
  useEffect(() => {
    if (!drawer || !ref.current) return;
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
  }, [drawer]);

  useEffect(() => {
    if (!drawer || !window.gsap) return;
    window.gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power3.out' });
    window.gsap.fromTo(ref.current, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  }, [drawer]);

  if (!drawer) return null;
  const Comp = DrawerContent[drawer.kind];
  return (
    <>
      <div ref={backdropRef} className="modal-backdrop" onClick={() => dispatch({ type: 'CLOSE_DRAWER' })} aria-hidden="true" />
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        {Comp && <Comp payload={drawer.payload} close={() => dispatch({ type: 'CLOSE_DRAWER' })} />}
      </div>
    </>
  );
}

// =========================================================
// Modal with focus trap + spring
// =========================================================
function Modal() {
  const { state, dispatch } = useStore();
  const ref = useRef();
  const backdropRef = useRef();

  useEffect(() => {
    if (!state.modal || !ref.current) return;
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
  }, [state.modal]);

  useEffect(() => {
    if (!state.modal || !window.gsap) return;
    window.gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power3.out' });
    window.gsap.fromTo(ref.current, { y: 20, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
  }, [state.modal]);

  if (!state.modal) return null;
  const Comp = ModalContent[state.modal.kind];
  return (
    <>
      <div ref={backdropRef} className="modal-backdrop z-[95]" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} aria-hidden="true" />
      <div ref={ref} className="modal-center z-[96]" role="dialog" aria-modal="true">
        {Comp && <Comp payload={state.modal.payload} close={() => dispatch({ type: 'CLOSE_MODAL' })} />}
      </div>
    </>
  );
}

// =========================================================
// Scroll progress bar
// =========================================================
function ScrollProgress() {
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

// =========================================================
// Sound integration — wires click/hover sounds to interactive elements
// =========================================================
function SoundIntegration() {
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
function MouseTracker() {
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
function CursorEnabler() {
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
function TiltEngine() {
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
      const rotateX = (y - 0.5) * -12; // deg
      const rotateY = (x - 0.5) * 12;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
      const shine = card.querySelector('.tilt-shine');
      if (shine) {
        shine.style.background = `linear-gradient(${135 + rotateY * 3}deg, rgba(255,255,255,${0.08 + Math.abs(x - 0.5) * 0.06}) 0%, transparent 60%)`;
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

export {
  ToastProvider, useToast,
  StoreProvider, useStore,
  SearchProvider, useSearch,
  Sidebar, PageBar, PageHost, Drawer, Modal, StatTile, MobileSidebarToggle,
  useKeyboardShortcuts, useRevealFallback, MouseTracker,
  ScrollProgress, SoundIntegration, CursorEnabler, TiltEngine,
  D, Icon, QR, downloadQR,
};
export const DrawerContent = {};
export const ModalContent = {};
