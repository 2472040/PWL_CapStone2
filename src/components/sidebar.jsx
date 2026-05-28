import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store-context.jsx';
import { themeTransition } from './theme-transition.jsx';
import { LOKA as D } from '../data/app-data.jsx';
import { Icon } from './app-icons.jsx';

// =========================================================
// Sidebar
// =========================================================
export function Sidebar() {
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
        <img src="/assets/loka_lab.png" alt="Loka Lab" className="sb-brand-dot" aria-hidden="true" />
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
        {items.map(it => {
          let badgeValue = it.badge;
          if (state.role === 'admin' && it.id === 'receiving') {
            badgeValue = state.drafts.filter(d => d.status === 'finalized').length || null;
          } else if (state.role === 'kaprodi' && it.id === 'review') {
            badgeValue = state.pendingReviewCount || null;
          } else if (state.role === 'staflab' && it.id === 'bhp') {
            badgeValue = state.bhp.filter(b => b.stock <= b.min).length || null;
          } else if (state.role === 'kalab' && it.id === 'pengadaan') {
            badgeValue = state.drafts.filter(d => d.status === 'draft').length || null;
          }

          return (
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
              {badgeValue ? (
                <span className={`badge ${typeof badgeValue === 'number' ? 'num' : 'new'}`}>{badgeValue}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="sb-foot" data-sb-anim>
        <div className="sb-foot-actions" role="group" aria-label="Aksi cepat">
          <button className={`sb-foot-btn ${state.screen === 'settings' ? 'active' : ''}`} title="Pengaturan" aria-label="Pengaturan" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'settings' })}>
            <Icon name="settings" size={15} />
          </button>
          <button className="sb-foot-btn" title={state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'} aria-label={state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'} onClick={(e) => themeTransition(dispatch, state.theme === 'dark' ? 'light' : 'dark', e)}>
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
