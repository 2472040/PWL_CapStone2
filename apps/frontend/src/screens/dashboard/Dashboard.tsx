import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useStore, StatTile, D } from '../../components/app-shell';
import { apiFetch } from '../../services/api';
import type { BhpItem, Draft, InventoryItem, DashboardStats } from '../../store/store.types';

import { StatsHeader } from './home/StatsHeader';
import { RecentActivity } from './home/RecentActivity';
import { RoomsSummary } from './home/RoomsSummary';
import { AssetCondition } from './home/AssetCondition';
import { CollaborationTracker } from './home/CollaborationTracker';
import { MaintRadar } from './home/MaintRadar';

interface MappedActivity {
  who: string;
  role: string;
  act: string;
  target: string;
  when: string;
}

interface DashboardTile {
  l: string;
  v: number | string;
  i: string;
  f: 'int' | 'rp';
  d?: {
    dir: 'up' | 'down';
    text: string;
  };
  p?: number;
}

export function Dashboard() {
  const { state, dispatch } = useStore();

  const role = D.roles.find((r) => r.id === state.role) || {
    accent: 'var(--color-violet)',
    title: 'User',
  };

  const me = state.currentUser ||
    (D.me as Record<string, { name: string }>)[state.role] || { name: 'Pengguna' };

  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const res = await apiFetch<{ data: DashboardStats }>('/dashboard/stats', {
          signal: controller.signal,
        });
        if (res.data) {
          setDashboardData(res.data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load dashboard stats', err);
      }
    }
    loadStats();

    // Safety interval for live updates (30s)
    const interval = setInterval(loadStats, 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const totalAssets = state.inventory.length;
    const bhpItems = state.bhp.length;
    const lowBhp = state.bhp.filter((b: BhpItem) => b.stock <= b.min).length;
    const draftsActive = state.drafts.filter((d: Draft) => d.status === 'submitted').length;
    const draftsFinalized = state.drafts.filter((d: Draft) => d.status === 'finalized').length;
    const inMaint = state.inventory.filter((i: InventoryItem) => i.cond === 'Maintenance').length;
    const needCheck = state.inventory.filter((i: InventoryItem) => i.cond === 'Perlu cek').length;

    // Fall back to state values if backend stats are still loading
    const totalDraftValue = state.drafts
      .filter((d: Draft) => d.status === 'submitted')
      .reduce(
        (sum: number, d: Draft) =>
          sum + d.items.reduce((s: number, it) => s + it.qty * it.price, 0),
        0
      );

    return {
      totalAssets,
      bhpItems,
      lowBhp,
      draftsActive,
      draftsFinalized,
      inMaint,
      needCheck,
      totalDraftValue,
    };
  }, [state]);

  const activities = useMemo<MappedActivity[]>(() => {
    if (
      !dashboardData ||
      !dashboardData.recentActivity ||
      dashboardData.recentActivity.length === 0
    ) {
      return [];
    }
    return dashboardData.recentActivity.map((act) => {
      let actionText = act.action;
      if (act.action === 'auth.login') actionText = 'telah login masuk ke sistem';
      else if (act.action === 'user.create') actionText = 'menambahkan pengguna baru';
      else if (act.action === 'user.update') actionText = 'memperbarui profil pengguna';
      else if (act.action === 'user.update_profile') actionText = 'memperbarui profil akunnya';
      else if (act.action === 'user.deactivate') actionText = 'menonaktifkan pengguna';
      else if (act.action === 'room.create') actionText = 'membuat ruangan baru';
      else if (act.action === 'room.update') actionText = 'memperbarui data ruangan';
      else if (act.action === 'room.delete') actionText = 'menghapus ruangan';
      else if (act.action === 'maintenance.create') actionText = 'mencatat log pemeliharaan aset';
      else if (act.action === 'maintenance.update')
        actionText = 'memperbarui log pemeliharaan aset';
      else if (act.action === 'bhp.create') actionText = 'menambahkan stok BHP baru';
      else if (act.action === 'bhp.update') actionText = 'memperbarui kuantitas stok BHP';
      else if (act.action === 'draft.create') actionText = 'membuat draf pengadaan baru';
      else if (act.action === 'draft.update') actionText = 'memperbarui draf pengadaan';
      else if (act.action === 'draft.submit') actionText = 'mengajukan draf pengadaan';
      else if (act.action === 'draft.addItem') actionText = 'menambahkan item ke draf pengadaan';
      else if (act.action === 'draft.review') actionText = 'melakukan review draf pengadaan';
      else if (act.action === 'draft.finalize') actionText = 'memfinalisasi draf pengadaan';
      else if (act.action === 'receiving.confirm') actionText = 'mengonfirmasi penerimaan barang';
      else if (act.action === 'procurement.remove_item')
        actionText = 'menghapus barang dari pengadaan';
      else if (act.action === 'draft.complete') actionText = 'menyelesaikan penerimaan pengadaan';
      else if (act.action === 'inventory.create') actionText = 'menambahkan aset inventaris baru';
      else if (act.action === 'inventory.update') actionText = 'memperbarui detail aset inventaris';
      else if (act.action === 'inventory.import') actionText = 'mengimpor data aset inventaris';
      else if (act.action === 'label.create' || act.action === 'label.update')
        actionText = 'mencetak label QR aset';
      else if (act.action === 'backup.export') actionText = 'mengekspor backup database';
      else if (act.action === 'backup.restore') actionText = 'merestore backup database';

      // Format time
      const date = new Date(act.created_at || act.ts || '');
      const diffMs = new Date().getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      let timeText = 'baru saja';
      if (diffMins > 0) {
        if (diffMins < 60) timeText = `${diffMins} menit lalu`;
        else {
          const diffHrs = Math.floor(diffMins / 60);
          if (diffHrs < 24) timeText = `${diffHrs} jam lalu`;
          else timeText = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
      }

      return {
        who: act.User?.name || act.user || 'Sistem',
        role:
          act.User?.role === 'sysadmin'
            ? 'Sys Admin'
            : act.User?.role === 'kalab'
              ? 'Kalab'
              : act.User?.role === 'kaprodi'
                ? 'Kaprodi'
                : act.User?.role === 'admin'
                  ? 'Admin'
                  : act.User?.role === 'staflab'
                    ? 'Staf Lab'
                    : act.User?.role || 'User',
        act: actionText,
        target: act.target || '',
        when: timeText,
      };
    });
  }, [dashboardData]);

  const tilesByRole: Record<string, DashboardTile[]> = {
    sysadmin: [
      { l: 'Total pengguna', v: state.users.length, i: 'users', f: 'int' },
      { l: 'Ruangan aktif', v: state.rooms.length, i: 'room', f: 'int' },
      { l: 'Total aset', v: stats.totalAssets, i: 'box', f: 'int' },
      {
        l: 'Login hari ini',
        v: dashboardData?.activeUsers || 0,
        i: 'log',
        f: 'int',
        d: { dir: 'up', text: '+3 dari kemarin' },
        p: Math.round(((dashboardData?.activeUsers || 0) / Math.max(1, state.users.length)) * 100),
      },
    ],
    kalab: [
      { l: 'Aset tanggung jawab', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Draf saya', v: state.drafts.length, i: 'cart', f: 'int' },
      { l: 'Total ajuan aktif', v: stats.totalDraftValue, i: 'bolt', f: 'rp' },
      {
        l: 'BHP perlu restock',
        v: stats.lowBhp,
        i: 'flask',
        f: 'int',
        d: { dir: 'down', text: 'segera ajukan' },
        p: Math.round((stats.lowBhp / Math.max(1, stats.bhpItems)) * 100),
      },
    ],
    kaprodi: [
      {
        l: 'Menunggu review',
        v: stats.draftsActive,
        i: 'check',
        f: 'int',
        p: Math.round((stats.draftsActive / Math.max(1, state.drafts.length)) * 100),
      },
      {
        l: 'Sudah finalisasi',
        v: stats.draftsFinalized,
        i: 'log',
        f: 'int',
        p: Math.round((stats.draftsFinalized / Math.max(1, state.drafts.length)) * 100),
      },
      { l: 'Total ajuan aktif', v: stats.totalDraftValue, i: 'bolt', f: 'rp' },
      { l: 'Total aset prodi', v: stats.totalAssets, i: 'box', f: 'int' },
    ],
    admin: [
      {
        l: 'Item siap diterima',
        v: state.drafts
          .filter((d: Draft) => d.status === 'finalized')
          .reduce(
            (s: number, d: Draft) =>
              s + d.items.filter((it) => it.approval === 'ok' || it.approval === null).length,
            0
          ),
        i: 'truck',
        f: 'int',
        p: 75,
      },
      {
        l: 'Sudah dilabeli',
        v: state.drafts.reduce(
          (s: number, d: Draft) => s + d.items.filter((it) => it.received).length,
          0
        ),
        i: 'qr',
        f: 'int',
        p: Math.round(
          (state.drafts.reduce(
            (s: number, d: Draft) => s + d.items.filter((it) => it.received).length,
            0
          ) /
            Math.max(1, stats.totalAssets)) *
            100
        ),
      },
      { l: 'Total aset terdaftar', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Hari kerja minggu ini', v: 4, i: 'cal', f: 'int', p: 80 },
    ],
    staflab: [
      {
        l: 'Maintenance terbuka',
        v: stats.inMaint,
        i: 'wrench',
        f: 'int',
        p: Math.round((stats.inMaint / Math.max(1, stats.totalAssets)) * 100),
      },
      {
        l: 'Aset perlu cek',
        v: stats.needCheck,
        i: 'alert',
        f: 'int',
        d: { dir: 'down', text: 'jadwalkan minggu ini' },
        p: Math.round((stats.needCheck / Math.max(1, stats.totalAssets)) * 100),
      },
      {
        l: 'BHP rendah',
        v: stats.lowBhp,
        i: 'flask',
        f: 'int',
        p: Math.round((stats.lowBhp / Math.max(1, stats.bhpItems)) * 100),
      },
      { l: 'Log bulan ini', v: state.maintLog.length, i: 'log', f: 'int' },
    ],
  };

  const firstName = (me.name || 'Pengguna')
    .replace(/^(Dr\.|Prof\.|Drs\.|Dra\.|Ir\.)\s+/, '')
    .split(' ')[0];

  const handleExportCSV = () => {
    try {
      const roleTitle = role?.title || state.role;
      const userName = me?.name || 'Pengguna';
      const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const csvRows = [];
      csvRows.push(`"LAPORAN DASHBOARD LOKALAB"`);
      csvRows.push(`"Peran","${roleTitle.replace(/"/g, '""')}"`);
      csvRows.push(`"Nama Pengguna","${userName.replace(/"/g, '""')}"`);
      csvRows.push(`"Tanggal Ekspor","${dateStr.replace(/"/g, '""')}"`);
      csvRows.push(''); // Baris kosong

      // Tambahkan KPI Metrik Utama
      csvRows.push(`"METRIK UTAMA"`);
      csvRows.push(`"Nama Metrik","Nilai"`);
      const currentTiles = tilesByRole[state.role] || [];
      currentTiles.forEach((tile) => {
        let val = tile.v;
        if (tile.f === 'rp') {
          val = `Rp ${new Intl.NumberFormat('id-ID').format(Number(val))}`;
        }
        csvRows.push(`"${tile.l.replace(/"/g, '""')}","${String(val).replace(/"/g, '""')}"`);
      });
      csvRows.push(''); // Baris kosong

      // Tambahkan Aktivitas Terbaru
      csvRows.push(`"AKTIVITAS TERBARU"`);
      csvRows.push(`"Nama","Peran","Aktivitas","Target","Waktu"`);
      activities.forEach((act) => {
        csvRows.push(
          `"${act.who.replace(/"/g, '""')}","${act.role.replace(/"/g, '""')}","${act.act.replace(/"/g, '""')}","${act.target.replace(/"/g, '""')}","${act.when.replace(/"/g, '""')}"`
        );
      });

      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Dashboard_${state.role}_${new Date().toISOString().substring(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (window.showToast) {
        window.showToast('Dashboard berhasil diekspor ke CSV!', 'ok', 'download');
      }
    } catch (err: unknown) {
      console.error('Failed to export CSV', err);
      const msg = err instanceof Error ? err.message : 'unknown';
      if (window.showToast) {
        window.showToast('Gagal mengekspor data: ' + msg, 'warn');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="page"
      style={{ '--role-accent': role.accent } as React.CSSProperties}
    >
      <StatsHeader
        firstName={firstName}
        roleTitle={role.title}
        stateRole={state.role}
        onExportCSV={handleExportCSV}
        onNewDraft={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newDraft' } })}
      />

      <div className="stats">
        {tilesByRole[state.role]?.map((t, i) => (
          <StatTile
            key={i}
            label={t.l}
            value={t.v}
            fmt={t.f}
            icon={t.i}
            delta={t.d}
            accent={i === 0 ? role.accent : undefined}
            percentage={t.p}
          />
        ))}
      </div>

      <div className="grid gap-3.5 mb-6">
        <RecentActivity activities={activities} roleAccent={role.accent} />
      </div>

      <div className="grid md:grid-cols-2 gap-3.5" data-reveal>
        <RoomsSummary rooms={state.rooms} />
        <AssetCondition inventory={state.inventory} />
      </div>

      <CollaborationTracker dashboardData={dashboardData} stateRole={state.role} />

      <MaintRadar dashboardData={dashboardData} stateRole={state.role} />
    </div>
  );
}
