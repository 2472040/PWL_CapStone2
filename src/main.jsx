// app-main.jsx — wires up landing page + shell + screens + drawer registry
// v2.0: + Landing page, Error boundary, search provider, mobile UI, keyboard shortcuts
import React, {  useState, useEffect  } from 'react';
import { DrawerContent, ModalContent, Sidebar, ToastProvider, StoreProvider, useStore, Drawer, Modal, PageBar, PageHost, SearchProvider, MobileSidebarToggle, MouseTracker, useKeyboardShortcuts, useRevealFallback, ScrollProgress, SoundIntegration, CursorEnabler, TiltEngine, D  } from './components/app-shell.jsx';
import { CustomCursor } from './components/app-cursor.jsx';
import { Dashboard } from './screens/dashboard/Dashboard.jsx';
import { PengadaanKalab, ReviewKaprodi, ReceivingAdmin, HistoryKaprodi } from './screens/dashboard/Procurement.jsx';
import { Inventory, InventoryDetail } from './screens/dashboard/Inventory.jsx';
import { Maintenance, MaintenanceForm, BHP } from './screens/dashboard/Maintenance.jsx';
import { Users, NewUserForm, Rooms, Audit, Labels, NewDraftForm } from './screens/dashboard/Admin.jsx';
import { Settings, LogoutModal } from './screens/dashboard/Settings.jsx';
import LandingPage from './screens/landing/index.jsx';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.Lenis = Lenis;
gsap.registerPlugin(ScrollTrigger);

// Mock sounds to prevent undefined errors
window.LokaSounds = {
  click: () => {},
  hover: () => {},
  toggle: () => {},
};

// Register drawer + modal content
Object.assign(DrawerContent, {
  inventory: InventoryDetail,
  maintenance: MaintenanceForm,
  newUser: NewUserForm,
  newDraft: NewDraftForm,
});
Object.assign(ModalContent, {
  logout: LogoutModal,
});

// =========================================================
// Error Boundary
// =========================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[Loka Error]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 40, textAlign: 'center', color: 'var(--color-ink)', background: 'var(--color-bg)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(251,113,133,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: 'var(--color-rose)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>Terjadi kesalahan</h2>
          <p style={{ fontSize: 14, color: 'var(--color-ink-2)', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            Aplikasi mengalami masalah. Coba muat ulang halaman atau hubungi admin jika masalah berlanjut.
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            Muat Ulang Halaman
          </button>
          {this.state.error && (
            <pre style={{ marginTop: 24, fontSize: 11, color: 'var(--color-ink-3)', background: 'var(--color-surface)', padding: 16, borderRadius: 12, maxWidth: 600, overflow: 'auto', textAlign: 'left' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Screen router
function Router() {
  const { state } = useStore();
  const role = state.role;
  const screen = state.screen;

  let Comp = null;
  if (screen === 'settings') Comp = Settings;
  else if (screen === 'dashboard') Comp = Dashboard;
  else if (screen === 'inventaris') Comp = Inventory;
  else if (screen === 'pengadaan' && role === 'kalab') Comp = PengadaanKalab;
  else if (screen === 'review' && role === 'kaprodi') Comp = ReviewKaprodi;
  else if (screen === 'history' && role === 'kaprodi') Comp = HistoryKaprodi;
  else if (screen === 'receiving' && role === 'admin') Comp = ReceivingAdmin;
  else if (screen === 'labels' && role === 'admin') Comp = Labels;
  else if (screen === 'maintenance' && role === 'staflab') Comp = Maintenance;
  else if (screen === 'bhp') Comp = BHP;
  else if (screen === 'users' && role === 'sysadmin') Comp = Users;
  else if (screen === 'rooms' && role === 'sysadmin') Comp = Rooms;
  else if (screen === 'audit' && role === 'sysadmin') Comp = Audit;

  const screenLabel = screen === 'settings' ? 'Pengaturan' : (D.nav[role].find(n => n.id === screen)?.label || 'Dashboard');
  const roleLabel = D.roles.find(r => r.id === role).short;

  return (
    <>
      <PageBar breadcrumbs={[roleLabel, screenLabel]} />
      <PageHost role={role} screen={screen}>
        {Comp ? <Comp /> : <Dashboard />}
      </PageHost>
    </>
  );
}

function Shell({ onLogout }) {
  const { state, dispatch } = useStore();
  useKeyboardShortcuts(dispatch);
  useRevealFallback();

  // Expose onLogout globally for the logout modal
  useEffect(() => {
    window.__lokaLogout = onLogout;
  }, [onLogout]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-density', state.density);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#08070d' : '#f5f0e6');
  }, [state.theme, state.density]);

  // Smooth scroll using Lenis
  useEffect(() => {
    if (!window.Lenis) return;
    const main = document.querySelector('.main');
    if (!main) return;
    const lenis = new window.Lenis({
      wrapper: main, content: main,
      lerp: 0.08, smoothWheel: true, wheelMultiplier: 1.2,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.gsap && window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="app" data-screen-label={D.roles.find(r => r.id === state.role).short + ' · ' + (state.screen === 'settings' ? 'Pengaturan' : (D.nav[state.role].find(n => n.id === state.screen)?.label || 'Dashboard'))}>
      <CursorEnabler />
      <CustomCursor />
      <ScrollProgress />
      <SoundIntegration />
      <TiltEngine />
      <MobileSidebarToggle />
      <Sidebar />
      <main className="main">
        <Router />
      </main>
      <Drawer />
      <Modal />
      <MouseTracker />
    </div>
  );
}

<<<<<<< Updated upstream
=======
function AuthInitializer() {
  const { dispatch } = useStore();

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const result = await apiFetch('/auth/me');
        const user = result.data;
        if (user.role) {
          dispatch({ type: 'SET_ROLE', role: user.role });
        }
      } catch (error) {
        console.error('Gagal mengambil data user:', error.message);
        // Token invalid/expired → clear it
        removeToken();
      }
    }

    if (getToken()) {
      loadCurrentUser();
    }
  }, [dispatch]);

  return null;
}

// =========================================================
// Login Screen — glassmorphism dark theme
// =========================================================
const DEMO_ACCOUNTS = [
  { label: 'Sysadmin', email: 'anindita@kampus.id' },
  { label: 'Kalab', email: 'pradipta@kampus.id' },
  { label: 'Kaprodi', email: 'hendra@kampus.id' },
  { label: 'Admin', email: 'faqih@kampus.id' },
  { label: 'Staf Lab', email: 'maharani@kampus.id' },
];

function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      setToken(result.data.token);
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
      <div className="loka-login-bg">
        <div className="loka-login-blob" />
        <div className="loka-login-blob" />
        <div className="loka-login-blob" />
      </div>
      <div className="loka-login-grain" />

      <div className="loka-login-card">
        <div className="loka-login-brand">
          <div className="loka-login-dot" />
          <div>
            <span className="loka-login-brand-text">Loka</span>
            <span className="loka-login-brand-sub">· Lab Suite</span>
          </div>
        </div>

        <h1 className="loka-login-heading">Selamat datang</h1>
        <p className="loka-login-subheading">Masuk ke dashboard inventaris laboratorium</p>

        {error && (
          <div className="loka-login-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {error}
          </div>
        )}

        <form className="loka-login-form" onSubmit={handleSubmit}>
          <div className="loka-login-field">
            <label className="loka-login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={`loka-login-input ${error ? 'error' : ''}`}
              type="email"
              placeholder="nama@kampus.id"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="loka-login-field">
            <label className="loka-login-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className={`loka-login-input ${error ? 'error' : ''}`}
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
            />
          </div>

          <button className="loka-login-btn" type="submit" disabled={loading}>
            {loading ? <><div className="loka-login-spinner" /> Memproses...</> : 'Masuk'}
          </button>
        </form>

        <div className="loka-login-divider">akun demo</div>
        <div className="loka-login-demo">
          {DEMO_ACCOUNTS.map((acc) => (
            <button key={acc.email} className="loka-login-demo-btn" type="button" onClick={() => fillDemo(acc.email)}>
              {acc.label}
            </button>
          ))}
        </div>

        <button className="loka-login-back" type="button" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Kembali ke beranda
        </button>
      </div>
    </div>
  );
}

// =========================================================
// App — manages view: landing → login → app
// =========================================================
>>>>>>> Stashed changes
function App() {
  const [view, setView] = useState(() => {
    try {
      if (localStorage.getItem('token')) {
        return localStorage.getItem('loka-view') || 'app';
      }
      return 'landing';
    } catch (e) { return 'landing'; }
  });

<<<<<<< Updated upstream
  function enterApp() {
    setView('app');
    try { localStorage.setItem('loka-view', 'app'); } catch(e) {}
  }

  function goToLanding() {
    setView('landing');
    try { localStorage.setItem('loka-view', 'landing'); } catch(e) {}
=======
  // Guard: if view is 'app' but no token, go back to landing
  useEffect(() => {
    if (view === 'app' && !getToken()) {
      setView('landing');
      try { localStorage.removeItem('loka-view'); } catch (e) {}
    }
  }, [view]);

  function showLogin() {
    setView('login');
  }

  function handleLogin(user) {
    setView('app');
    try { localStorage.setItem('loka-view', 'app'); } catch (e) {}
  }

  function goToLanding() {
    removeToken();
    setView('landing');
    try { localStorage.removeItem('loka-view'); } catch (e) {}
>>>>>>> Stashed changes
  }

  return (
    <ErrorBoundary>
      <StoreProvider>
        <SearchProvider>
          <ToastProvider>
<<<<<<< Updated upstream
            {view === 'landing' ? (
              <LandingPage onEnterApp={enterApp} />
            ) : (
=======
            <AuthInitializer />

            {view === 'landing' && (
              <LandingPage onEnterApp={showLogin} />
            )}
            {view === 'login' && (
              <LoginScreen onLogin={handleLogin} onBack={() => setView('landing')} />
            )}
            {view === 'app' && (
>>>>>>> Stashed changes
              <Shell onLogout={goToLanding} />
            )}
          </ToastProvider>
        </SearchProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

import ReactDOM from 'react-dom/client';
import '../assets/css/app-theme.css';
import '../assets/css/app-components.css';
import '../assets/css/app-landing.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

