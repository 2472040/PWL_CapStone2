import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore, PageBar, PageHost, D } from './app-shell';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load all dashboard screen modules for optimal bundle size
const Dashboard = React.lazy(() =>
  import('../screens/dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const PengadaanKalab = React.lazy(() =>
  import('../screens/dashboard/procurement/PengadaanKalab').then((m) => ({
    default: m.PengadaanKalab,
  }))
);
const ReviewKaprodi = React.lazy(() =>
  import('../screens/dashboard/procurement/ReviewKaprodi').then((m) => ({
    default: m.ReviewKaprodi,
  }))
);
const ReceivingAdmin = React.lazy(() =>
  import('../screens/dashboard/procurement/ReceivingAdmin').then((m) => ({
    default: m.ReceivingAdmin,
  }))
);
const HistoryKaprodi = React.lazy(() =>
  import('../screens/dashboard/procurement/HistoryKaprodi').then((m) => ({
    default: m.HistoryKaprodi,
  }))
);
const Inventory = React.lazy(() =>
  import('../screens/dashboard/inventory/Inventory').then((m) => ({ default: m.Inventory }))
);
const Maintenance = React.lazy(() =>
  import('../screens/dashboard/maintenance/Maintenance').then((m) => ({
    default: m.Maintenance,
  }))
);
const BHP = React.lazy(() =>
  import('../screens/dashboard/maintenance/BHP').then((m) => ({ default: m.BHP }))
);
const Users = React.lazy(() =>
  import('../screens/dashboard/admin/Users').then((m) => ({ default: m.Users }))
);
const Rooms = React.lazy(() =>
  import('../screens/dashboard/admin/Rooms').then((m) => ({ default: m.Rooms }))
);
const Audit = React.lazy(() =>
  import('../screens/dashboard/admin/Audit').then((m) => ({ default: m.Audit }))
);
const Labels = React.lazy(() =>
  import('../screens/dashboard/admin/Labels').then((m) => ({ default: m.Labels }))
);
const Settings = React.lazy(() =>
  import('../screens/dashboard/settings/Settings').then((m) => ({ default: m.Settings }))
);

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface RoleConfig {
  id: string;
  title: string;
  short: string;
  accent: string;
}

export function Router() {
  const { state, dispatch } = useStore();
  const location = useLocation();
  const role = state.role;

  // Extract current screen segment from the path (e.g. /dashboard/inventaris -> inventaris)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[pathSegments.length - 1] || 'dashboard';

  // Synchronize route with global screen state in store
  useEffect(() => {
    dispatch({ type: 'SET_SCREEN', screen: currentSegment });
  }, [currentSegment, dispatch]);

  let screenLabel = 'Dashboard';
  if (currentSegment === 'settings') {
    screenLabel = 'Pengaturan';
  } else if (currentSegment !== 'dashboard') {
    const navItem = (D.nav as Record<string, NavItem[]>)[role]?.find(
      (n) => n.id === currentSegment
    );
    if (navItem) {
      screenLabel = navItem.label;
    }
  }

  const roleLabel = ((D.roles as RoleConfig[]).find((r) => r.id === role) || { short: 'User' })
    .short;

  return (
    <div className="flex flex-col w-full min-h-full">
      <PageBar breadcrumbs={[roleLabel, screenLabel]} />
      <div className="grow relative w-full flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}
          >
            <PageHost role={role} screen={currentSegment}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-12 text-stone-500 font-medium">
                    Memuat halaman...
                  </div>
                }
              >
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="settings" element={<Settings />} />

                  {/* Role-based sub-routes */}
                  <Route path="inventaris" element={<Inventory />} />
                  <Route path="bhp" element={<BHP />} />

                  {role === 'kalab' && <Route path="pengadaan" element={<PengadaanKalab />} />}
                  {role === 'kaprodi' && <Route path="review" element={<ReviewKaprodi />} />}
                  {role === 'kaprodi' && <Route path="history" element={<HistoryKaprodi />} />}
                  {role === 'admin' && <Route path="receiving" element={<ReceivingAdmin />} />}
                  {role === 'admin' && <Route path="labels" element={<Labels />} />}
                  {role === 'staflab' && <Route path="maintenance" element={<Maintenance />} />}
                  {role === 'sysadmin' && <Route path="users" element={<Users />} />}
                  {role === 'sysadmin' && <Route path="rooms" element={<Rooms />} />}
                  {role === 'sysadmin' && <Route path="audit" element={<Audit />} />}

                  {/* Fallback to dashboard home */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </PageHost>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
