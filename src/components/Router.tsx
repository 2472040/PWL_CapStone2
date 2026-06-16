import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore, PageBar, PageHost, D } from './app-shell';
import { motion, AnimatePresence } from 'framer-motion';

// Statically loaded page components for instant transitions
import { Dashboard } from '../screens/dashboard/Dashboard';
import { PengadaanKalab } from '../screens/dashboard/procurement/PengadaanKalab';
import { ReviewKaprodi } from '../screens/dashboard/procurement/ReviewKaprodi';
import { ReceivingAdmin } from '../screens/dashboard/procurement/ReceivingAdmin';
import { HistoryKaprodi } from '../screens/dashboard/procurement/HistoryKaprodi';
import { Inventory } from '../screens/dashboard/inventory/Inventory';
import { Maintenance } from '../screens/dashboard/maintenance/Maintenance';
import { BHP } from '../screens/dashboard/maintenance/BHP';
import { Users } from '../screens/dashboard/admin/Users';
import { Rooms } from '../screens/dashboard/admin/Rooms';
import { Audit } from '../screens/dashboard/admin/Audit';
import { Labels } from '../screens/dashboard/admin/Labels';
import { Settings } from '../screens/dashboard/settings/Settings';

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
  const { state } = useStore();
  const location = useLocation();
  const role = state.role;

  // Extract current screen segment from the path (e.g. /dashboard/inventaris -> inventaris)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[pathSegments.length - 1] || 'dashboard';

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
            </PageHost>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
