import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, useToast, D, Icon, QR, StatTile, useSearch } from '../../components/app-shell.jsx';
function Settings() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);
  const me = D.me[state.role];

  const themeOpts = [
    { id: 'dark', lbl: 'Gelap', sub: 'Aurora visionOS', preview: ['#08070d', '#1a1525', '#b794ff'] },
    { id: 'light', lbl: 'Terang', sub: 'Cream pastel', preview: ['#f5f0e6', '#ece6d8', '#7c3aed'] },
  ];

  const densityOpts = [
    { id: 'comfortable', lbl: 'Comfortable', sub: 'Tampilan default — spasi lega' },
    { id: 'compact', lbl: 'Compact', sub: 'Lebih banyak data di layar' },
  ];

  return (
    <div className="page max-w-[920px]" >
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-sub">Sesuaikan tampilan, akun, dan preferensi Loka untuk role <b>{role.short}</b>.</p>
        </div>
      </div>

      {/* ── Tampilan ── */}
      <SettingsSection title="Tampilan" sub="Tema, kepadatan, dan aksen warna" reveal>
        <SettingsRow label="Tema warna" desc="Gelap untuk fokus malam, terang untuk siang hari.">
          <div className="theme-cards">
            {themeOpts.map(t => (
              <div key={t.id} onClick={() => { dispatch({ type: 'SET_THEME', theme: t.id }); toast(`Tema diubah ke ${t.lbl.toLowerCase()}`, 'ok'); }} className={`theme-card ${state.theme === t.id ? 'active' : ''}`}>
                <div className="theme-preview" style={{background: t.preview[0]}}>
                  <div className="" style={{position: 'absolute', top: 8, left: 8, right: 8, height: 14, borderRadius: 4, background: t.preview[1]}} />
                  <div className="" style={{position: 'absolute', top: 30, left: 8, width: '60%', height: 6, borderRadius: 3, background: t.preview[2]}} />
                  <div className="" style={{position: 'absolute', top: 42, left: 8, width: '40%', height: 4, borderRadius: 2, background: t.preview[1]}} />
                  <div className="" style={{position: 'absolute', bottom: 8, left: 8, right: 8, height: 18, borderRadius: 4, background: t.preview[1]}} />
                </div>
                <div className="theme-card-name">{t.lbl}</div>
                <div className="theme-card-sub">{t.sub}</div>
                {state.theme === t.id && <div className="theme-active-tick"><Icon name="check" size={11} strokeWidth={3} /></div>}
              </div>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label="Kepadatan tampilan" desc="Atur jarak antar elemen.">
          <div className="flex gap-1.5" >
            {densityOpts.map(d => (
              <button key={d.id} onClick={() => { dispatch({ type: 'SET_DENSITY', density: d.id }); toast(`Kepadatan: ${d.lbl}`, 'info'); }} className={`btn ${state.density === d.id ? 'primary' : ''}`}>
                {d.lbl}
              </button>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label="Aksen warna" desc="Otomatis mengikuti role. Atau pin satu warna.">
          <div className="flex flex-wrap gap-1.5" >
            <button onClick={() => dispatch({ type: 'SET_ACCENT', accent: 'auto' })} className={`btn ${state.accent === 'auto' ? 'primary' : ''}`}>
              Otomatis (per role)
            </button>
            {D.roles.map(r => (
              <button key={r.id} onClick={() => dispatch({ type: 'SET_ACCENT', accent: r.accent })} className={`btn ${state.accent === r.accent ? 'primary' : ''}`} style={{paddingLeft: 9}}>
                <span className="h-3 w-3" style={{borderRadius: '50%', background: r.accent, display: 'inline-block', boxShadow: '0 0 8px ' + r.accent + '88'}} />
                {r.short}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* ── Akun ── */}
      <SettingsSection title="Akun" sub={`${me.name} · ${me.email}`} reveal>
        <SettingsRow label="Nama" desc="Nama tampilan yang dilihat tim lain.">
          <input className="input max-w-[320px]" defaultValue={me.name}  />
        </SettingsRow>
        <SettingsRow label="Email" desc="Untuk notifikasi dan reset password.">
          <input className="input max-w-[320px]" defaultValue={me.email}  />
        </SettingsRow>
        <SettingsRow label="Password" desc="Terakhir diubah 2 bulan lalu.">
          <button className="btn" onClick={() => window.showToast && window.showToast('Form ubah password akan segera hadir', 'warn', 'info')}>Ubah password</button>
        </SettingsRow>
        <SettingsRow label="Two-factor auth" desc="Lapisan keamanan tambahan via aplikasi authenticator.">
          <label className="toggle"><input type="checkbox" /><span className="swc" /></label>
        </SettingsRow>
      </SettingsSection>

      {/* ── Notifikasi ── */}
      <SettingsSection title="Notifikasi" sub="Pilih kapan Loka mengganggu kamu" reveal>
        <SettingsRow label="Email · draf pengadaan" desc="Saat draf butuh review atau diapprove.">
          <label className="toggle"><input type="checkbox" defaultChecked /><span className="swc" /></label>
        </SettingsRow>
        <SettingsRow label="Email · maintenance" desc="Saat aset masuk kondisi 'Perlu cek'.">
          <label className="toggle"><input type="checkbox" defaultChecked /><span className="swc" /></label>
        </SettingsRow>
        <SettingsRow label="Email · BHP rendah" desc="Saat stok BHP di bawah ambang minimum.">
          <label className="toggle"><input type="checkbox" /><span className="swc" /></label>
        </SettingsRow>
        <SettingsRow label="Toast in-app" desc="Notifikasi cepat di pojok layar.">
          <label className="toggle"><input type="checkbox" defaultChecked /><span className="swc" /></label>
        </SettingsRow>
      </SettingsSection>

      {/* ── Tentang ── */}
      <SettingsSection title="Tentang Loka" sub="Build info & lisensi" reveal>
        <div className="gap-3 grid" >
          <div className="card compact">
            <div className="text-3 text-xs mono mb-2 tracking-[0.08em] uppercase" >Versi</div>
            <div className="text-lg fw-5 mono">2.0.0-beta · 26.05.18</div>
          </div>
          <div className="card compact">
            <div className="text-3 text-xs mono mb-2 tracking-[0.08em] uppercase" >Lisensi</div>
            <div className="text-lg fw-5">Kampus · 250 user</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3.5" >
          <button className="btn" onClick={() => window.showToast && window.showToast('Membuka catatan rilis…', 'info', 'log')}>📋 Catatan rilis</button>
          <button className="btn" onClick={() => window.showToast && window.showToast('Membuka dokumentasi…', 'info', 'log')}>📖 Dokumentasi</button>
          <button className="btn" onClick={() => window.showToast && window.showToast('Menghubungkan ke support…', 'info', 'users')}>💬 Kontak support</button>
        </div>
      </SettingsSection>

      {/* ── Logout ── */}
      <SettingsSection title="Sesi" sub="Aktif sekarang & opsi keluar" reveal>
        <SettingsRow label="Sesi aktif" desc="Ada 1 perangkat masuk dengan akun ini.">
          <button className="btn" onClick={() => window.showToast && window.showToast('Sesi lain telah dikeluarkan', 'ok', 'check')}>Keluar dari perangkat lain</button>
        </SettingsRow>
        <SettingsRow label="Keluar akun" desc="Kembali ke layar login.">
          <button className="btn danger" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { kind: 'logout' } })}>
            <Icon name="x" size={13} strokeWidth={2.4} /> Logout
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, sub, children, reveal }) {
  const Wrap = reveal ? 'div' : 'div';
  return (
    <div className="settings-section" data-reveal={reveal ? '' : undefined}>
      <div className="settings-section-head">
        <h3 className="settings-section-title">{title}</h3>
        {sub && <div className="settings-section-sub">{sub}</div>}
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

function SettingsRow({ label, desc, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <div className="settings-row-lbl">{label}</div>
        {desc && <div className="settings-row-desc">{desc}</div>}
      </div>
      <div className="settings-row-ctl">{children}</div>
    </div>
  );
}

// ===== LOGOUT modal =====
function LogoutModal({ close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const me = D.me[state.role];
  function logout() {
    close();
    toast('Keluar dari akun…', 'info');
    setTimeout(() => {
      if (window.__lokaLogout) window.__lokaLogout();
    }, 800);
  }
  return (
    <>
      <div className="text-center" >
        <div className="text-rose h-14 w-14" style={{borderRadius: '50%', background: 'rgba(255,107,131,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </div>
        <div className="mb-1.5 text-lg tracking-tight" >Keluar akun?</div>
        <div className="text-sm text-2 leading-[1.5] max-w-[320px]" >
          Kamu akan keluar sebagai <b className="text-ink" >{me.name}</b>. Draf yang sedang dibuat tetap tersimpan.
        </div>
      </div>
      <div className="" style={{display: 'flex', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)'}}>
        <button className="btn flex-1 justify-center"  onClick={close}>Batal</button>
        <button className="btn danger flex-1 justify-center"  onClick={logout}>Ya, keluar</button>
      </div>
    </>
  );
}

export { Settings, LogoutModal };

