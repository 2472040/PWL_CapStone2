// app-main.jsx — wires up landing page + shell + screens + drawer registry
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { removeToken, getToken } from './services/api.js';
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
  D 
} from './components/app-shell.jsx';
import { CustomCursor } from './components/app-cursor.jsx';
import { NewUserForm, NewRoomForm, NewDraftForm, QRScanner } from './screens/dashboard/Admin.jsx';
import { InventoryDetail, NewInventoryForm } from './screens/dashboard/Inventory.jsx';
import { MaintenanceForm, NewBhpForm } from './screens/dashboard/Maintenance.jsx';
import { LogoutModal, ChangePasswordModal } from './screens/dashboard/Settings.jsx';
import LandingPage from './screens/landing/index.jsx';

// Split components for readability and maintenance
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Router } from './components/Router.jsx';
import { AuthInitializer } from './components/AuthInitializer.jsx';
import { LoginScreen } from './screens/auth/LoginScreen.jsx';
import { AiPredictiveModal } from './components/AiPredictiveModal.jsx';

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
    events.forEach(evt => window.addEventListener(evt, resetTimers));
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
    
    main.scrollTop = 0;
    
    const lenis = new window.Lenis({
      wrapper: main,
      lerp: 0.08, smoothWheel: true, wheelMultiplier: 1.2,
    });
    
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    
    if (window.gsap && window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    
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
      <CardHoverEngine />
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

function App() {
  const [view, setView] = useState(() => {
    try {
      if (getToken()) {
        return localStorage.getItem('loka-view') || 'app';
      }
      return 'landing';
    } catch (e) { return 'landing'; }
  });
  const [pendingRole, setPendingRole] = useState(null);

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
    if (user && user.role) {
      setPendingRole(user.role);
      try { localStorage.setItem('loka-role', user.role); } catch (e) {}
    }
    setView('app');
    try { localStorage.setItem('loka-view', 'app'); } catch (e) {}
  }

  function goToLanding() {
    removeToken();
    setPendingRole(null);
    setView('landing');
    try {
      localStorage.removeItem('loka-view');
      localStorage.removeItem('loka-role');
    } catch (e) {}

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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
