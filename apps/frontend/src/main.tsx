// app-main.jsx — wires up landing page + shell + screens + drawer registry
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { removeToken, getToken } from './services/api';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  DrawerContent,
  ModalContent,
  Sidebar,
  ToastProvider,
  StoreProvider,
  useStore,
  Drawer,
  Modal,
  SearchProvider,
  MobileSidebarToggle,
  MouseTracker,
  useKeyboardShortcuts,
  useRevealFallback,
  ScrollProgress,
  SoundIntegration,
  CursorEnabler,
  TiltEngine,
  CardHoverEngine,
  ListStaggerEngine,
  D,
} from './components/app-shell';
import { CustomCursor } from './components/app-cursor';
// Lazy loaded drawers and modals for extreme performance & code splitting
const NewUserForm = React.lazy(() =>
  import('./screens/dashboard/admin/Users').then((m) => ({ default: m.NewUserForm }))
);
const NewRoomForm = React.lazy(() =>
  import('./screens/dashboard/admin/Rooms').then((m) => ({ default: m.NewRoomForm }))
);
const NewDraftForm = React.lazy(() =>
  import('./screens/dashboard/procurement/NewDraftForm').then((m) => ({
    default: m.NewDraftForm,
  }))
);
const QRScanner = React.lazy(() =>
  import('./screens/dashboard/admin/QRScanner').then((m) => ({ default: m.QRScanner }))
);

const InventoryDetail = React.lazy(() =>
  import('./screens/dashboard/inventory/InventoryDetail').then((m) => ({
    default: m.InventoryDetail,
  }))
);
const NewInventoryForm = React.lazy(() =>
  import('./screens/dashboard/inventory/NewInventoryForm').then((m) => ({
    default: m.NewInventoryForm,
  }))
);

const MaintenanceForm = React.lazy(() =>
  import('./screens/dashboard/maintenance/MaintenanceForm').then((m) => ({
    default: m.MaintenanceForm,
  }))
);
const NewBhpForm = React.lazy(() =>
  import('./screens/dashboard/maintenance/BHP').then((m) => ({ default: m.NewBhpForm }))
);

const LogoutModal = React.lazy(() =>
  import('./screens/dashboard/settings/LogoutModal').then((m) => ({ default: m.LogoutModal }))
);
const ChangePasswordModal = React.lazy(() =>
  import('./screens/dashboard/settings/ChangePasswordModal').then((m) => ({
    default: m.ChangePasswordModal,
  }))
);
const AuditDetailModal = React.lazy(() =>
  import('./screens/dashboard/admin/AuditDetailModal').then((m) => ({
    default: m.AuditDetailModal,
  }))
);

import LandingPage from './screens/landing/index';

// Split components for readability and maintenance
import { ErrorBoundary } from './components/ErrorBoundary';
import { Router } from './components/Router';
import { AuthInitializer } from './components/AuthInitializer';
import { LoginScreen } from './screens/auth/LoginScreen';

const AiPredictiveModal = React.lazy(() =>
  import('./components/AiPredictiveModal').then((m) => ({ default: m.AiPredictiveModal }))
);
const ConfirmModal = React.lazy(() =>
  import('./components/ConfirmModal').then((m) => ({ default: m.ConfirmModal }))
);

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import '../assets/css/app-theme.css';
import '../assets/css/app-components.css';
import '../assets/css/app-landing.css';

import LokaSounds from './utils/app-sounds';

window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.Lenis = Lenis;
gsap.registerPlugin(ScrollTrigger);

// Bind sound interactions
window.LokaSounds = LokaSounds;

// Register drawer + modal content
Object.assign(DrawerContent, {
  inventory: InventoryDetail,
  maintenance: MaintenanceForm,
  newUser: NewUserForm,
  newRoom: NewRoomForm,
  newDraft: NewDraftForm,
  qrScanner: QRScanner,
  newBhp: NewBhpForm, // Register the new Manual Restock Drawer
  newInventory: NewInventoryForm,
});

Object.assign(ModalContent, {
  logout: LogoutModal,
  changePassword: ChangePasswordModal,
  aiPredictive: AiPredictiveModal,
  auditDetail: AuditDetailModal,
  confirm: ConfirmModal,
});

function Shell({ onLogout }: { onLogout: () => void }) {
  const { state, dispatch } = useStore();
  useKeyboardShortcuts(dispatch);
  useRevealFallback();

  useEffect(() => {
    window.__lokaLogout = onLogout;
  }, [onLogout]);

  // OWASP Idle Session Monitor (Auto-logout after 15 minutes of inactivity)
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let warningTimer: ReturnType<typeof setTimeout> | undefined;
    const IDLE_LIMIT = 15 * 60 * 1000;
    const WARNING_BEFORE = 60 * 1000;

    function resetTimers() {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);

      warningTimer = setTimeout(() => {
        if (window.showToast) {
          window.showToast('Sesi Anda akan segera berakhir karena tidak aktif.', 'warn', 'alert');
        }
      }, IDLE_LIMIT - WARNING_BEFORE);

      idleTimer = setTimeout(() => {
        if (window.showToast) {
          window.showToast('Sesi Anda berakhir karena tidak aktif.', 'info', 'log');
        }
        onLogout();
      }, IDLE_LIMIT);
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimers));
    resetTimers();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimers));
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
    const content = document.querySelector('.scroll-content');
    if (!main || !content) return;

    main.scrollTop = 0;

    const lenis = new window.Lenis({
      wrapper: main,
      content: content,
      lerp: 0.06,
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);

    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    resizeObserver.observe(main);
    resizeObserver.observe(content); // Observe content size changes

    return () => {
      lenis.destroy();
      resizeObserver.disconnect();
    };
  }, [state.screen, state.role]);

  return (
    <div
      className="app"
      data-screen-label={
        (D.roles.find((r) => r.id === state.role) || { short: '' }).short +
        ' · ' +
        (state.screen === 'settings'
          ? 'Pengaturan'
          : (D.nav as Record<string, Array<{ id: string; label: string }>>)[state.role]?.find(
              (n) => n.id === state.screen
            )?.label || 'Dashboard')
      }
    >
      <CursorEnabler />
      <CustomCursor />
      <ScrollProgress />
      <SoundIntegration />
      <TiltEngine />
      <CardHoverEngine />
      <ListStaggerEngine />
      <MobileSidebarToggle />
      <Sidebar />
      <main className="main">
        <div className="scroll-content">
          <Router />
        </div>
      </main>
      <Drawer />
      <Modal />
      <MouseTracker />
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  // Verify token or local storage login indicator
  const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';

  function handleLogin(user: { role: string } | null) {
    if (user && user.role) {
      setPendingRole(user.role);
      try {
        localStorage.setItem('loka-role', user.role);
      } catch (e) {}
    }
    navigate('/dashboard');
  }

  function goToLanding() {
    removeToken();
    setPendingRole(null);
    try {
      localStorage.removeItem('loka-view');
      localStorage.removeItem('loka-role');
    } catch (e) {}

    // Navigate to landing page synchronously to prevent temporary redirect to /login
    navigate('/', { replace: true });

    fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }

  return (
    <>
      <AuthInitializer pendingRole={pendingRole} />
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage onEnterApp={() => navigate('/login')} />
            )
          }
        />
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginScreen onLogin={handleLogin} onBack={() => navigate('/')} />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={isLoggedIn ? <Shell onLogout={goToLanding} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <SearchProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </SearchProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
