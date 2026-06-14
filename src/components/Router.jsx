import React, { Suspense, useState, useEffect } from 'react';
import { useStore, PageBar, PageHost, D } from './app-shell.jsx';
import { motion, AnimatePresence } from 'framer-motion';

// Delayed fallback to prevent visual blinking for fast page transitions
function DelayedFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return <div className="grow" />;
  return (
    <div className="grow flex items-center justify-center min-h-[300px]" style={{ opacity: 0.4 }}>
      <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--role-accent, var(--color-ink-3))' }} />
    </div>
  );
}

// Lazy loaded page components
const Dashboard = React.lazy(() => import('../screens/dashboard/Dashboard.jsx').then(m => ({ default: m.Dashboard })));
const PengadaanKalab = React.lazy(() => import('../screens/dashboard/procurement/PengadaanKalab.jsx').then(m => ({ default: m.PengadaanKalab })));
const ReviewKaprodi = React.lazy(() => import('../screens/dashboard/procurement/ReviewKaprodi.jsx').then(m => ({ default: m.ReviewKaprodi })));
const ReceivingAdmin = React.lazy(() => import('../screens/dashboard/procurement/ReceivingAdmin.jsx').then(m => ({ default: m.ReceivingAdmin })));
const HistoryKaprodi = React.lazy(() => import('../screens/dashboard/procurement/HistoryKaprodi.jsx').then(m => ({ default: m.HistoryKaprodi })));
const Inventory = React.lazy(() => import('../screens/dashboard/inventory/Inventory.jsx').then(m => ({ default: m.Inventory })));
const Maintenance = React.lazy(() => import('../screens/dashboard/maintenance/Maintenance.jsx').then(m => ({ default: m.Maintenance })));
const BHP = React.lazy(() => import('../screens/dashboard/maintenance/BHP.jsx').then(m => ({ default: m.BHP })));
const Users = React.lazy(() => import('../screens/dashboard/admin/Users.jsx').then(m => ({ default: m.Users })));
const Rooms = React.lazy(() => import('../screens/dashboard/admin/Rooms.jsx').then(m => ({ default: m.Rooms })));
const Audit = React.lazy(() => import('../screens/dashboard/admin/Audit.jsx').then(m => ({ default: m.Audit })));
const Labels = React.lazy(() => import('../screens/dashboard/admin/Labels.jsx').then(m => ({ default: m.Labels })));
const Settings = React.lazy(() => import('../screens/dashboard/settings/Settings.jsx').then(m => ({ default: m.Settings })));

export function Router() {
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
    <div className="flex flex-col w-full min-h-full">
      <PageBar breadcrumbs={[roleLabel, screenLabel]} />
      <div className="grow relative w-full flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={role + ':' + screen}
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <PageHost role={role} screen={screen}>
              <Suspense fallback={<DelayedFallback />}>
                {Comp ? <Comp /> : <Dashboard />}
              </Suspense>
            </PageHost>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
