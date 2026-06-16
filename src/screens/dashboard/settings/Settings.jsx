import React, { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon, themeTransition } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';

export function SettingsSection({ title, sub, children, reveal }) {
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

export function SettingsRow({ label, desc, children }) {
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

export function Settings() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const role = D.roles.find((r) => r.id === state.role);
  const me = state.currentUser || D.me[state.role] || { name: '', email: '', initials: '' };

  const [name, setName] = useState(me.name || '');
  const [email, setEmail] = useState(me.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setName(me.name || '');
    setEmail(me.email || '');
  }, [me.name, me.email]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast('Nama tidak boleh kosong', 'warn');
      return;
    }
    if (!email.trim()) {
      toast('Email tidak boleh kosong', 'warn');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email }),
      });
      if (res.data) {
        dispatch({ type: 'SET_USER', user: res.data });
        toast('Perubahan akun berhasil disimpan!', 'ok');
      }
    } catch (err) {
      toast(err.message || 'Gagal menyimpan perubahan', 'warn');
    } finally {
      setSavingProfile(false);
    }
  };

  const themeOpts = [
    {
      id: 'dark',
      lbl: 'Gelap',
      sub: 'Aurora visionOS',
      preview: ['#08070d', '#1a1525', '#b794ff'],
    },
    { id: 'light', lbl: 'Terang', sub: 'Cream pastel', preview: ['#f5f0e6', '#ece6d8', '#7c3aed'] },
  ];

  const densityOpts = [
    { id: 'comfortable', lbl: 'Comfortable', sub: 'Tampilan default — spasi lega' },
    { id: 'compact', lbl: 'Compact', sub: 'Lebih banyak data di layar' },
  ];

  return (
    <div className="page max-w-[920px]">
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-sub">
            Sesuaikan tampilan, akun, dan preferensi Loka untuk role <b>{role ? role.short : ''}</b>
            .
          </p>
        </div>
      </div>

      {/* ── Tampilan ── */}
      <SettingsSection title="Tampilan" sub="Tema dan kepadatan" reveal>
        <SettingsRow label="Tema warna" desc="Gelap untuk focus malam, terang untuk siang hari.">
          <div className="theme-cards">
            {themeOpts.map((t) => (
              <div
                key={t.id}
                onClick={(e) => {
                  themeTransition(dispatch, t.id, e);
                  toast(`Tema diubah ke ${t.lbl.toLowerCase()}`, 'ok');
                }}
                className={`theme-card ${state.theme === t.id ? 'active' : ''}`}
              >
                <div className="theme-preview" style={{ background: t.preview[0] }}>
                  <div
                    className=""
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      right: 8,
                      height: 14,
                      borderRadius: 4,
                      background: t.preview[1],
                    }}
                  />
                  <div
                    className=""
                    style={{
                      position: 'absolute',
                      top: 30,
                      left: 8,
                      width: '60%',
                      height: 6,
                      borderRadius: 3,
                      background: t.preview[2],
                    }}
                  />
                  <div
                    className=""
                    style={{
                      position: 'absolute',
                      top: 42,
                      left: 8,
                      width: '40%',
                      height: 4,
                      borderRadius: 2,
                      background: t.preview[1],
                    }}
                  />
                  <div
                    className=""
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      right: 8,
                      height: 18,
                      borderRadius: 4,
                      background: t.preview[1],
                    }}
                  />
                </div>
                <div className="theme-card-name">{t.lbl}</div>
                <div className="theme-card-sub">{t.sub}</div>
                {state.theme === t.id && (
                  <div className="theme-active-tick">
                    <Icon name="check" size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label="Kepadatan tampilan" desc="Atur jarak antar elemen.">
          <div className="flex gap-1.5">
            {densityOpts.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  dispatch({ type: 'SET_DENSITY', density: d.id });
                  toast(`Kepadatan: ${d.lbl}`, 'info');
                }}
                className={`btn ${state.density === d.id ? 'primary' : ''}`}
              >
                {d.lbl}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* ── Akun ── */}
      <SettingsSection title="Akun" sub={`${me.name} · ${me.email}`} reveal>
        <SettingsRow label="Nama" desc="Nama tampilan yang dilihat tim lain.">
          <input
            className="input max-w-[320px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label="Email" desc="Untuk notifikasi dan reset password.">
          <input
            className="input max-w-[320px]"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label="Password" desc="Amankan akun Anda dengan password baru.">
          <button
            className="btn"
            onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { kind: 'changePassword' } })}
          >
            Ubah password
          </button>
        </SettingsRow>
        <SettingsRow
          label="Two-factor auth"
          desc="Lapisan keamanan tambahan via aplikasi authenticator."
        >
          <label className="toggle">
            <input type="checkbox" />
            <span className="swc" />
          </label>
        </SettingsRow>
        <div className="flex justify-end mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            className="btn primary"
            onClick={handleSaveProfile}
            disabled={savingProfile || (name === me.name && email === me.email)}
          >
            {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </SettingsSection>

      {/* ── Notifikasi ── */}
      <SettingsSection title="Notifikasi" sub="Pilih kapan Loka mengganggu kamu" reveal>
        <SettingsRow label="Email · draf pengadaan" desc="Saat draf butuh review atau diapprove.">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="swc" />
          </label>
        </SettingsRow>
        <SettingsRow label="Email · maintenance" desc="Saat aset masuk kondisi 'Perlu cek'.">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="swc" />
          </label>
        </SettingsRow>
        <SettingsRow label="Email · BHP rendah" desc="Saat stok BHP di bawah ambang minimum.">
          <label className="toggle">
            <input type="checkbox" />
            <span className="swc" />
          </label>
        </SettingsRow>
        <SettingsRow label="Toast in-app" desc="Notifikasi cepat di pojok layar.">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="swc" />
          </label>
        </SettingsRow>
      </SettingsSection>

      {/* ── Tentang ── */}
      <SettingsSection title="Tentang Loka" sub="Build info & lisensi" reveal>
        <div className="gap-3 grid">
          <div className="card compact">
            <div className="text-3 text-xs mono mb-2 tracking-[0.08em] uppercase">Versi</div>
            <div className="text-lg fw-5 mono">2.0.0-beta · 26.05.18</div>
          </div>
          <div className="card compact">
            <div className="text-3 text-xs mono mb-2 tracking-[0.08em] uppercase">Lisensi</div>
            <div className="text-lg fw-5">Kampus · 250 user</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3.5">
          <button
            className="btn"
            onClick={() =>
              window.showToast && window.showToast('Membuka catatan rilis…', 'info', 'log')
            }
          >
            📋 Catatan rilis
          </button>
          <button
            className="btn"
            onClick={() =>
              window.showToast && window.showToast('Membuka dokumentasi…', 'info', 'log')
            }
          >
            📖 Dokumentasi
          </button>
          <button
            className="btn"
            onClick={() =>
              window.showToast && window.showToast('Menghubungkan ke support…', 'info', 'users')
            }
          >
            💬 Kontak support
          </button>
        </div>
      </SettingsSection>

      {/* ── Logout ── */}
      <SettingsSection title="Sesi" sub="Aktif sekarang & opsi keluar" reveal>
        <SettingsRow label="Sesi aktif" desc="Ada 1 perangkat masuk dengan akun ini.">
          <button
            className="btn"
            onClick={() =>
              window.showToast && window.showToast('Sesi lain telah dikeluarkan', 'ok', 'check')
            }
          >
            Keluar dari perangkat lain
          </button>
        </SettingsRow>
        <SettingsRow label="Keluar akun" desc="Kembali ke layar login.">
          <button
            className="btn danger"
            onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { kind: 'logout' } })}
          >
            <Icon name="x" size={13} strokeWidth={2.4} /> Logout
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
