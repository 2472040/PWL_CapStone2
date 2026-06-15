// app-main.jsx — wires up landing page + shell + screens + drawer registry
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { removeToken, getToken } from './services/api.js';
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
} from './components/app-shell.jsx';
import { CustomCursor } from './components/app-cursor.jsx';
// Lazy loaded drawers and modals for extreme performance & code splitting
const NewUserForm = React.lazy(() =>
  import('./screens/dashboard/admin/Users.jsx').then((m) => ({ default: m.NewUserForm }))
);
const NewRoomForm = React.lazy(() =>
  import('./screens/dashboard/admin/Rooms.jsx').then((m) => ({ default: m.NewRoomForm }))
);
const NewDraftForm = React.lazy(() =>
  import('./screens/dashboard/procurement/NewDraftForm.jsx').then((m) => ({
    default: m.NewDraftForm,
  }))
);
const QRScanner = React.lazy(() =>
  import('./screens/dashboard/admin/QRScanner.jsx').then((m) => ({ default: m.QRScanner }))
);

const InventoryDetail = React.lazy(() =>
  import('./screens/dashboard/inventory/InventoryDetail.jsx').then((m) => ({
    default: m.InventoryDetail,
  }))
);
const NewInventoryForm = React.lazy(() =>
  import('./screens/dashboard/inventory/NewInventoryForm.jsx').then((m) => ({
    default: m.NewInventoryForm,
  }))
);

const MaintenanceForm = React.lazy(() =>
  import('./screens/dashboard/maintenance/MaintenanceForm.jsx').then((m) => ({
    default: m.MaintenanceForm,
  }))
);
const NewBhpForm = React.lazy(() =>
  import('./screens/dashboard/maintenance/BHP.jsx').then((m) => ({ default: m.NewBhpForm }))
);

const LogoutModal = React.lazy(() =>
  import('./screens/dashboard/settings/LogoutModal.jsx').then((m) => ({ default: m.LogoutModal }))
);
const ChangePasswordModal = React.lazy(() =>
  import('./screens/dashboard/settings/ChangePasswordModal.jsx').then((m) => ({
    default: m.ChangePasswordModal,
  }))
);

import LandingPage from './screens/landing/index.jsx';

// Split components for readability and maintenance
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Router } from './components/Router.jsx';
import { AuthInitializer } from './components/AuthInitializer.jsx';
import { LoginScreen } from './screens/auth/LoginScreen.jsx';

const AiPredictiveModal = React.lazy(() =>
  import('./components/AiPredictiveModal.jsx').then((m) => ({ default: m.AiPredictiveModal }))
);

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import '../assets/css/app-theme.css';
import '../assets/css/app-components.css';
import '../assets/css/app-landing.css';

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
  newBhp: NewBhpForm, // Register the new Manual Restock Drawer
  newInventory: NewInventoryForm,
});

Object.assign(ModalContent, {
  logout: LogoutModal,
  changePassword: ChangePasswordModal,
  aiPredictive: AiPredictiveModal,
});

function Shell({ onLogout }) {
  const { state, dispatch } = useStore();
  useKeyboardShortcuts(dispatch);
  useRevealFallback();

  useEffect(() => {
    window.__lokaLogout = onLogout;
  }, [onLogout]);

  // OWASP Idle Session Monitor (Auto-logout after 15 minutes of inactivity)
  useEffect(() => {
    let idleTimer = null;
    let warningTimer = null;
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

    function raf(time) {
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
        D.roles.find((r) => r.id === state.role).short +
        ' · ' +
        (state.screen === 'settings'
          ? 'Pengaturan'
          : D.nav[state.role].find((n) => n.id === state.screen)?.label || 'Dashboard')
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
  const [pendingRole, setPendingRole] = useState(null);

  // Verify token or local storage login indicator
  const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';

  function handleLogin(user) {
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
