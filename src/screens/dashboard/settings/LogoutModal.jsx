import React from 'react';
import { useStore, useToast, D } from '../../../components/app-shell.jsx';

export function LogoutModal({ close }) {
  const { state } = useStore();
  const toast = useToast();
  const me = state.currentUser || D.me[state.role] || { name: 'Pengguna' };

  function logout() {
    close();
    toast('Keluar dari akun…', 'info');
    setTimeout(() => {
      if (window.__lokaLogout) window.__lokaLogout();
    }, 800);
  }

  return (
    <>
      <div className="text-center animate-fade-in" style={{ padding: '24px 24px 18px' }} >
        <div className="text-rose h-14 w-14 animate-pulse-slow" style={{borderRadius: '50%', background: 'rgba(255,107,131,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </div>
        <div className="mb-1.5 text-lg tracking-tight font-semibold" style={{color: 'var(--color-ink)'}}>Keluar akun?</div>
        <div className="text-sm text-ink-3 leading-[1.5] max-w-[320px] mx-auto" >
          Kamu akan keluar sebagai <b style={{color: 'var(--color-ink)'}}>{me.name}</b>. Draf yang sedang dibuat tetap tersimpan.
        </div>
      </div>
      <div className="" style={{display: 'flex', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)'}}>
        <button className="btn flex-1 justify-center" onClick={close}>Batal</button>
        <button className="btn danger flex-1 justify-center" onClick={logout}>Ya, keluar</button>
      </div>
    </>
  );
}
