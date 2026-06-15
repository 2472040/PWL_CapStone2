import React, { useState } from 'react';
import { apiFetch, setToken } from '../../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'anindita@kampus.id' },
  { label: 'Kalab', email: 'pradipta@kampus.id' },
  { label: 'Kaprodi', email: 'hendra@kampus.id' },
  { label: 'Staff Administrasi', email: 'faqih@kampus.id' },
  { label: 'Staf Lab', email: 'maharani@kampus.id' },
];

export function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken();
      onLogin(result.data.user);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="loka-login">
      {/* SaaS background grid & grid glow */}
      <div className="loka-login-grid" />
      <div className="loka-login-glow" />

      <div className="loka-login-card">
        <div className="loka-login-brand">
          <img src="/assets/loka_lab.png" alt="Loka Lab" className="loka-login-dot" />
          <div>
            <span className="loka-login-brand-text">Loka</span>
            <span className="loka-login-brand-sub">· Lab Suite</span>
          </div>
        </div>

        <h1 className="loka-login-heading">Selamat datang</h1>
        <p className="loka-login-subheading">Masuk ke dashboard inventaris laboratorium</p>

        {error && (
          <div className="loka-login-error">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        <form className="loka-login-form" onSubmit={handleSubmit}>
          <div className="loka-login-field">
            <label className="loka-login-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className={`loka-login-input ${error ? 'error' : ''}`}
              type="email"
              placeholder="nama@kampus.id"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="loka-login-field">
            <label className="loka-login-label" htmlFor="login-password">
              Password
            </label>
            <div className="loka-login-input-wrap">
              <input
                id="login-password"
                className={`loka-login-input ${error ? 'error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="loka-login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="loka-login-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="loka-login-spinner" /> Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="loka-login-divider">akun demo</div>
        <div className="loka-login-demo">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              className="loka-login-demo-btn"
              type="button"
              onClick={() => fillDemo(acc.email)}
            >
              {acc.label}
            </button>
          ))}
        </div>

        <button className="loka-login-back" type="button" onClick={onBack}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke beranda
        </button>
      </div>
    </div>
  );
}
