import React from 'react';
import { useStore, PageBar, PageHost, D } from './app-shell.jsx';
import { Dashboard } from '../screens/dashboard/Dashboard.jsx';
import { PengadaanKalab, ReviewKaprodi, ReceivingAdmin, HistoryKaprodi } from '../screens/dashboard/Procurement.jsx';
import { Inventory } from '../screens/dashboard/Inventory.jsx';
import { Maintenance, BHP } from '../screens/dashboard/Maintenance.jsx';
import { Users, Rooms, Audit, Labels } from '../screens/dashboard/Admin.jsx';
import { Settings } from '../screens/dashboard/Settings.jsx';

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
    <>
      <PageBar breadcrumbs={[roleLabel, screenLabel]} />
      <PageHost role={role} screen={screen}>
        {Comp ? <Comp /> : <Dashboard />}
      </PageHost>
    </>
  );
}
