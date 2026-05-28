// app-main.jsx — wires up landing page + shell + screens + drawer registry
// v2.0: + Landing page, Error boundary, search provider, mobile UI, keyboard shortcuts
import { apiFetch, setToken, removeToken, getToken } from './services/api.js';
import React, {  useState, useEffect  } from 'react';
import { DrawerContent, ModalContent, Sidebar, ToastProvider, StoreProvider, useStore, Drawer, Modal, PageBar, PageHost, SearchProvider, MobileSidebarToggle, MouseTracker, useKeyboardShortcuts, useRevealFallback, ScrollProgress, SoundIntegration, CursorEnabler, TiltEngine, D  } from './components/app-shell.jsx';
import { CustomCursor } from './components/app-cursor.jsx';
import { Dashboard } from './screens/dashboard/Dashboard.jsx';
import { PengadaanKalab, ReviewKaprodi, ReceivingAdmin, HistoryKaprodi } from './screens/dashboard/Procurement.jsx';
import { Inventory, InventoryDetail } from './screens/dashboard/Inventory.jsx';
import { Maintenance, MaintenanceForm, BHP } from './screens/dashboard/Maintenance.jsx';
import { Users, NewUserForm, Rooms, NewRoomForm, Audit, Labels, NewDraftForm, QRScanner } from './screens/dashboard/Admin.jsx';
import { Settings, LogoutModal, ChangePasswordModal } from './screens/dashboard/Settings.jsx';
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
  newRoom: NewRoomForm,
  newDraft: NewDraftForm,
  qrScanner: QRScanner,
});
Object.assign(ModalContent, {
  logout: LogoutModal,
  changePassword: ChangePasswordModal,
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

  // OWASP Idle Session Monitor (Auto-logout after 15 minutes of inactivity)
  useEffect(() => {
    let idleTimer = null;
    let warningTimer = null;
    const IDLE_LIMIT = 15 * 60 * 1000; // 15 minutes
    const WARNING_BEFORE = 60 * 1000; // 1 minute warning before absolute logout

    function resetTimers() {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);

      // Warning timer: Alerts user 1 minute before logging out
      warningTimer = setTimeout(() => {
        if (window.showToast) {
          window.showToast('Sesi Anda akan segera berakhir karena tidak aktif.', 'warn', 'alert');
        }
      }, IDLE_LIMIT - WARNING_BEFORE);

      // Force absolute logout timer
      idleTimer = setTimeout(() => {
        if (window.showToast) {
          window.showToast('Sesi Anda berakhir karena tidak aktif.', 'info', 'log');
        }
        onLogout();
      }, IDLE_LIMIT);
    }

    // Active user interaction triggers
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetTimers));

    // Initialize timers
    resetTimers();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      events.forEach(evt => window.removeEventListener(evt, resetTimers));
    };
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
    
    // Reset scroll position to top on page navigation
    main.scrollTop = 0;
    
    const lenis = new window.Lenis({
      wrapper: main,
      lerp: 0.08, smoothWheel: true, wheelMultiplier: 1.2,
    });
    
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    
    if (window.gsap && window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    
    // Dynamically resize Lenis as page contents render/change size
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    resizeObserver.observe(main);
    
    return () => {
      lenis.destroy();
      resizeObserver.disconnect();
    };
  }, [state.screen, state.role]);

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

function AuthInitializer({ pendingRole }) {
  const { state, dispatch } = useStore();
  const currentRole = state.role;

  // Immediately apply role from login response or localStorage
  useEffect(() => {
    const role = pendingRole || (() => { try { return localStorage.getItem('loka-role'); } catch (e) { return null; } })();
    if (role) {
      dispatch({ type: 'SET_ROLE', role });
    }
  }, [pendingRole, dispatch]);

  // Also verify with backend (in case token expired or role changed)
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        // Small delay after fresh login to let the HttpOnly cookie settle through the proxy
        if (pendingRole) {
          await new Promise(r => setTimeout(r, 300));
        }
        if (cancelled) return;

        const result = await apiFetch('/auth/me');
        if (cancelled) return;
        const user = result.data;
        if (user && user.role) {
          dispatch({ type: 'SET_USER', user });
          dispatch({ type: 'SET_ROLE', role: user.role });
          try { localStorage.setItem('loka-role', user.role); } catch (e) {}
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Gagal mengambil data user:', error.message);
        // Don't clear token here — the 401 interceptor in apiFetch already handles logout
      }
    }

    if (getToken()) {
      loadCurrentUser();
    }

    return () => { cancelled = true; };
  }, [pendingRole, dispatch]);

  // Real-time synchronization polling mechanism
  useEffect(() => {
    if (!getToken()) return;

    const pollData = async () => {
      try {
        const role = currentRole || pendingRole || (() => { try { return localStorage.getItem('loka-role'); } catch (e) { return null; } })();
        if (!role) return;

        // 1. Fetch Rooms (Sysadmin only on backend, or general fallback)
        if (role === 'sysadmin') {
          try {
            const resRooms = await apiFetch('/rooms');
            if (resRooms.data) {
              dispatch({ type: 'SET_ROOMS', rooms: resRooms.data });
            }
          } catch (e) {
            console.error('Gagal mengambil data ruangan:', e.message);
          }
        }

        // 2. Fetch User lists (Sysadmin only)
        if (role === 'sysadmin') {
          try {
            const resUsers = await apiFetch('/users');
            if (resUsers.data) dispatch({ type: 'SET_USERS', users: resUsers.data });
          } catch (e) {
            console.error('Gagal mengambil data pengguna:', e.message);
          }
        }

        // 3. Fetch Procurement Drafts (Kalab only)
        if (role === 'kalab') {
          try {
            const resDrafts = await apiFetch('/procurement/drafts');
            if (resDrafts.data) {
              const formatted = resDrafts.data.map(d => ({
                ...d,
                by: d.creator?.name || d.by || 'Kepala Lab',
                role: d.creator?.role || d.role || 'kalab',
                submitted: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                items: d.items?.map(it => ({
                  ...it,
                  approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null,
                  received: it.receivings && it.receivings.length > 0
                })) || []
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data draf:', e.message);
          }

          try {
            const resBhp = await apiFetch('/bhp');
            if (resBhp.data) {
              const formatted = resBhp.data.map(b => ({
                id: b.code || b.id.toString(),
                dbId: b.id,
                name: b.name,
                unit: b.unit,
                stock: parseFloat(b.stock) || 0,
                min: parseFloat(b.min_stock) || 0,
                lastIn: b.last_in || '-',
                cat: b.category || 'General'
              }));
              dispatch({ type: 'SET_BHP', bhp: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data BHP:', e.message);
          }
        }

        // 4. Fetch Procurement Reviews or History (Kaprodi only)
        if (role === 'kaprodi') {
          try {
            const isHistory = state.screen === 'history';
            const endpoint = isHistory ? '/procurement/history' : '/procurement/review';
            const resData = await apiFetch(endpoint);
            if (resData.data) {
              const formatted = resData.data.map(d => ({
                ...d,
                by: d.creator?.name || d.by,
                role: d.creator?.role || d.role,
                items: d.items?.map(it => ({
                  ...it,
                  approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null
                })) || []
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data pengadaan Kaprodi:', e.message);
          }
        }

        // 5. Fetch Maintenance Logs & BHP (Staf Lab only)
        if (role === 'staflab') {
          try {
            const resLogs = await apiFetch('/maintenance');
            if (resLogs.data) {
              const formatted = resLogs.data.map(l => ({
                id: l.code || l.id,
                date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                asset: l.Inventory?.code,
                name: l.Inventory?.name,
                action: l.action,
                tech: l.technician?.name || 'Teknisi',
                cond: l.condition_after,
                bhp: l.bhpUsed?.map(bu => ({
                  id: bu.Bhp?.code || bu.bhp_id,
                  qty: parseFloat(bu.qty_used) || 0,
                  unit: bu.Bhp?.unit || 'pcs'
                })) || []
              }));
              dispatch({ type: 'SET_MAINT_LOGS', logs: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data log pemeliharaan:', e.message);
          }

          try {
            const resBhp = await apiFetch('/bhp');
            if (resBhp.data) {
              const formatted = resBhp.data.map(b => ({
                id: b.code || b.id.toString(),
                dbId: b.id,
                name: b.name,
                unit: b.unit,
                stock: parseFloat(b.stock) || 0,
                min: parseFloat(b.min_stock) || 0,
                lastIn: b.last_in || '-',
                cat: b.category || 'General'
              }));
              dispatch({ type: 'SET_BHP', bhp: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data BHP:', e.message);
          }
        }

        // 6. Fetch Inventory for all roles (including Sysadmin)
        try {
          const resInv = await apiFetch('/inventory');
          if (resInv.data) {
            const formatted = resInv.data.map(i => ({
              id: i.id,
              code: i.code,
              name: i.name,
              cat: i.category,
              room: i.Room?.name || 'Gudang',
              cond: i.condition || 'Baik',
              last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
              acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
              value: i.value || 0,
              serial: i.serial || '-',
              specs: i.specs || '-'
            }));
            dispatch({ type: 'SET_INVENTORY', inventory: formatted });
          }
        } catch (e) {
          console.error('Gagal mengambil data inventaris:', e.message);
        }

      } catch (err) {
        console.error('Data sync polling error:', err.message);
      }
    };

    pollData();
    const interval = setInterval(pollData, 4000); // sync every 4 seconds
    return () => clearInterval(interval);
  }, [currentRole, pendingRole, state.screen, dispatch]);

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
            <div className="loka-login-input-wrap">
              <input
                id="login-password"
                className={`loka-login-input ${error ? 'error' : ''}`}
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="loka-login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
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
function App() {
  const [view, setView] = useState(() => {
    try {
      if (getToken()) {
        return localStorage.getItem('loka-view') || 'app';
      }
      return 'landing';
    } catch (e) { return 'landing'; }
  });
  // Store the logged-in user's role so we can dispatch SET_ROLE inside StoreProvider
  const [pendingRole, setPendingRole] = useState(null);

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
    // Save the role from the login response so AuthInitializer can apply it
    if (user && user.role) {
      setPendingRole(user.role);
      try { localStorage.setItem('loka-role', user.role); } catch (e) {}
    }
    setView('app');
    try { localStorage.setItem('loka-view', 'app'); } catch (e) {}
  }

  function goToLanding() {
    // Clear client state FIRST to prevent re-entry from 401 interceptor
    removeToken();
    setPendingRole(null);
    setView('landing');
    try {
      localStorage.removeItem('loka-view');
      localStorage.removeItem('loka-role');
    } catch (e) {}

    // Attempt server-side logout with plain fetch (bypass apiFetch interceptor to avoid loop)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }

  return (
    <ErrorBoundary>
      <StoreProvider>
        <SearchProvider>
          <ToastProvider>
            <AuthInitializer pendingRole={pendingRole} />

            {view === 'landing' && (
              <LandingPage onEnterApp={showLogin} />
            )}
            {view === 'login' && (
              <LoginScreen onLogin={handleLogin} onBack={() => setView('landing')} />
            )}
            {view === 'app' && (
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

