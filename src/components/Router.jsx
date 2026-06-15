import React, { useState, useEffect } from 'react';
import { useStore, PageBar, PageHost, D } from './app-shell.jsx';
import { motion, AnimatePresence } from 'framer-motion';

// Statically loaded page components for instant transitions
import { Dashboard } from '../screens/dashboard/Dashboard.jsx';
import { PengadaanKalab } from '../screens/dashboard/procurement/PengadaanKalab.jsx';
import { ReviewKaprodi } from '../screens/dashboard/procurement/ReviewKaprodi.jsx';
import { ReceivingAdmin } from '../screens/dashboard/procurement/ReceivingAdmin.jsx';
import { HistoryKaprodi } from '../screens/dashboard/procurement/HistoryKaprodi.jsx';
import { Inventory } from '../screens/dashboard/inventory/Inventory.jsx';
import { Maintenance } from '../screens/dashboard/maintenance/Maintenance.jsx';
import { BHP } from '../screens/dashboard/maintenance/BHP.jsx';
import { Users } from '../screens/dashboard/admin/Users.jsx';
import { Rooms } from '../screens/dashboard/admin/Rooms.jsx';
import { Audit } from '../screens/dashboard/admin/Audit.jsx';
import { Labels } from '../screens/dashboard/admin/Labels.jsx';
import { Settings } from '../screens/dashboard/settings/Settings.jsx';

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

  const screenLabel =
    screen === 'settings'
      ? 'Pengaturan'
      : D.nav[role].find((n) => n.id === screen)?.label || 'Dashboard';
  const roleLabel = D.roles.find((r) => r.id === role).short;

  return (
    <div className="flex flex-col w-full min-h-full">
      <PageBar breadcrumbs={[roleLabel, screenLabel]} />
      <div className="grow relative w-full flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={role + ':' + screen}
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}
          >
            <PageHost role={role} screen={screen}>
              {Comp ? <Comp /> : <Dashboard />}
            </PageHost>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
