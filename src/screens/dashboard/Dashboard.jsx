import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useStore, StatTile, D, Icon } from '../../components/app-shell.jsx';
import { apiFetch } from '../../services/api';
import { FinancialChart } from '../../components/FinancialChart.jsx';

export function Dashboard() {
  const { state, dispatch } = useStore();
  const role = D.roles.find((r) => r.id === state.role);
  const me = state.currentUser || D.me[state.role];
  const [dashboardData, setDashboardData] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiFetch('/dashboard/stats');
        if (res.data) {
          setDashboardData(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      }
    }
    loadStats();

    // Live update audit logs and stats
    const interval = setInterval(loadStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const totalAssets = state.inventory.length;
    const bhpItems = state.bhp.length;
    const lowBhp = state.bhp.filter((b) => b.stock <= b.min).length;
    const draftsActive = state.drafts.filter((d) => d.status === 'submitted').length;
    const draftsFinalized = state.drafts.filter((d) => d.status === 'finalized').length;
    const inMaint = state.inventory.filter((i) => i.cond === 'Maintenance').length;
    const needCheck = state.inventory.filter((i) => i.cond === 'Perlu cek').length;

    // Fall back to state values if backend stats are still loading
    const totalDraftValue =
      dashboardData?.totalDraftValue ||
      state.drafts
        .filter((d) => d.status === 'submitted')
        .reduce((sum, d) => sum + d.items.reduce((s, it) => s + it.qty * it.price, 0), 0);

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
  }, [state, dashboardData]);

  const activities = useMemo(() => {
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
      const date = new Date(act.created_at || act.ts);
      const diffMs = new Date() - date;
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
                    : act.User?.role || act.role || 'User',
        act: actionText,
        target: act.target || '',
        when: timeText,
      };
    });
  }, [dashboardData]);

  const tilesByRole = {
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
      { l: 'Menunggu review', v: stats.draftsActive, i: 'check', f: 'int', p: Math.round((stats.draftsActive / Math.max(1, state.drafts.length)) * 100) },
      { l: 'Sudah finalisasi', v: stats.draftsFinalized, i: 'log', f: 'int', p: Math.round((stats.draftsFinalized / Math.max(1, state.drafts.length)) * 100) },
      { l: 'Total ajuan aktif', v: stats.totalDraftValue, i: 'bolt', f: 'rp' },
      { l: 'Total aset prodi', v: stats.totalAssets, i: 'box', f: 'int' },
    ],
    admin: [
      {
        l: 'Item siap diterima',
        v: state.drafts
          .filter((d) => d.status === 'finalized')
          .reduce(
            (s, d) =>
              s + d.items.filter((it) => it.approval === 'ok' || it.approval === null).length,
            0
          ),
        i: 'truck',
        f: 'int',
        p: 75,
      },
      {
        l: 'Sudah dilabeli',
        v: state.drafts.reduce((s, d) => s + d.items.filter((it) => it.received).length, 0),
        i: 'qr',
        f: 'int',
        p: Math.round((state.drafts.reduce((s, d) => s + d.items.filter((it) => it.received).length, 0) / Math.max(1, stats.totalAssets)) * 100),
      },
      { l: 'Total aset terdaftar', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Hari kerja minggu ini', v: 4, i: 'cal', f: 'int', p: 80 },
    ],
    staflab: [
      { l: 'Maintenance terbuka', v: stats.inMaint, i: 'wrench', f: 'int', p: Math.round((stats.inMaint / Math.max(1, stats.totalAssets)) * 100) },
      {
        l: 'Aset perlu cek',
        v: stats.needCheck,
        i: 'alert',
        f: 'int',
        d: { dir: 'down', text: 'jadwalkan minggu ini' },
        p: Math.round((stats.needCheck / Math.max(1, stats.totalAssets)) * 100),
      },
      { l: 'BHP rendah', v: stats.lowBhp, i: 'flask', f: 'int', p: Math.round((stats.lowBhp / Math.max(1, stats.bhpItems)) * 100) },
      { l: 'Log bulan ini', v: state.maintLog.length, i: 'log', f: 'int' },
    ],
  };

  const firstName = me.name.replace(/^(Dr\.|Prof\.|Drs\.|Dra\.|Ir\.)\s+/, '').split(' ')[0];

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
          val = `Rp ${new Intl.NumberFormat('id-ID').format(val)}`;
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
    } catch (err) {
      console.error('Failed to export CSV', err);
      if (window.showToast) {
        window.showToast('Gagal mengekspor data: ' + err.message, 'warn');
      }
    }
  };

  return (
    <div ref={containerRef} className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">
            Halo, <em>{firstName}.</em>
          </h1>
          <p className="page-sub">
            {role.title} ·{' '}
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={handleExportCSV} title="Export ke CSV">
            <Icon name="download" size={13} /> Export
          </button>
          {state.role === 'kalab' && (
            <button
              className="btn primary"
              onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newDraft' } })}
            >
              <Icon name="plus" size={13} strokeWidth={2.4} /> Pengajuan Baru
            </button>
          )}
        </div>
      </div>

      <div className="stats">
        {tilesByRole[state.role].map((t, i) => (
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
        <div className="card glow" style={{ '--role-accent': role.accent }} data-reveal>
          <div className="flex between aic mb-4">
            <div>
              <div className="text-3 text-xs mono tracking-[0.1em] uppercase">— Aktivitas tim</div>
              <h3 className="text-xl fw-5 mt-2 tracking-tight">Apa yang baru terjadi</h3>
            </div>
            <button className="btn sm">
              <Icon name="refresh" size={12} /> Live
            </button>
          </div>
          <div>
            {activities.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 text-center"
                style={{ opacity: 0.7 }}
              >
                <Icon
                  name="log"
                  size={32}
                  style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--role-accent)' }}
                />
                <p className="text-sm font-medium">Belum ada aktivitas terbaru</p>
                <p className="text-xs text-ink-3 mt-1">
                  Aktivitas sistem dan pengguna akan tercatat otomatis di sini.
                </p>
              </div>
            ) : (
              activities.slice(0, 6).map((a, i) => (
                <div key={i} className="act-row" style={{ '--role-accent': role.accent }}>
                  <div className="act-avatar">{a.who[0]}</div>
                  <div className="act-text">
                    <b>{a.who}</b>
                    <span className="role-pill">{a.role}</span> {a.act}{' '}
                    <span className="tgt">{a.target}</span>
                  </div>
                  <div className="act-when">{a.when}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3.5" data-reveal>
        {/* ── Ringkasan Ruangan ── */}
        <div className="card">
          <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
            — Ringkasan ruangan
          </div>
          <h3 className="text-xl fw-5 mb-4 tracking-tight">{state.rooms.length} laboratorium</h3>
          <div
            className="flex flex-col gap-4 overflow-y-auto"
            style={{ maxHeight: '250px', paddingRight: '6px', marginTop: '4px' }}
          >
            {state.rooms.map((r) => {
              const pct = Math.min(100, ((Number(r.assets) || 0) / 35) * 100);
              return (
                <div key={r.code} className="flex flex-col gap-2">
                  <div className="flex between aic">
                    <div className="text-[13px]">
                      <b>{r.name}</b> <span className="text-3 mono text-xs">· {r.code}</span>
                    </div>
                    <div className="mono text-xs text-2">{r.assets} aset</div>
                  </div>
                  <div
                    className="h-[3px] w-full"
                    style={{ background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}
                  >
                    <div
                      className="rounded-sm"
                      style={{
                        height: '100%',
                        width: pct + '%',
                        background:
                          'linear-gradient(90deg, var(--color-violet), var(--color-cyan))',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Analitik Kondisi Aset Donut Chart ── */}
        <div className="card">
          <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">— Kondisi Aset</div>
          <h3 className="text-xl fw-5 mb-4 tracking-tight">Distribusi Kondisi</h3>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center py-2 h-full">
            {/* SVG Donut Chart */}
            {(() => {
              const baikCount = state.inventory.filter((i) => i.cond === 'Baik').length;
              const cekCount = state.inventory.filter((i) => i.cond === 'Perlu cek').length;
              const maintCount = state.inventory.filter((i) => i.cond === 'Maintenance').length;
              const totalItems = baikCount + cekCount + maintCount || 1;
              const pctBaik = (baikCount / totalItems) * 100;
              const pctCek = (cekCount / totalItems) * 100;
              const pctMaint = (maintCount / totalItems) * 100;
              return (
                <>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="3"
                      />

                      {/* Segments */}
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3.6"
                        strokeDasharray={`${pctBaik} ${100 - pctBaik}`}
                        strokeDashoffset="0"
                        className="transition-all duration-500 ease-out"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="3.6"
                        strokeDasharray={`${pctCek} ${100 - pctCek}`}
                        strokeDashoffset={-pctBaik}
                        className="transition-all duration-500 ease-out"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="3.6"
                        strokeDasharray={`${pctMaint} ${100 - pctMaint}`}
                        strokeDashoffset={-(pctBaik + pctCek)}
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-xl fw-6 mono" style={{ color: 'var(--color-ink)' }}>
                        {state.inventory.length}
                      </div>
                      <div className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">
                        Total
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 flex flex-col gap-2.5 w-full">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex gap-2 items-center">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: '#22c55e' }}
                        />{' '}
                        <b>Baik</b>
                      </div>
                      <span className="mono text-ink-3">
                        {baikCount} ({pctBaik.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex gap-2 items-center">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: '#eab308' }}
                        />{' '}
                        <b>Perlu cek</b>
                      </div>
                      <span className="mono text-ink-3">
                        {cekCount} ({pctCek.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex gap-2 items-center">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: '#a855f7' }}
                        />{' '}
                        <b>Maintenance</b>
                      </div>
                      <span className="mono text-ink-3">
                        {maintCount} ({pctMaint.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Team Collaboration & Synergy Tracker (Kaprodi & Kalab only) ── */}
      {(state.role === 'kaprodi' || state.role === 'kalab') && (
        <div className="grid md:grid-cols-2 gap-3.5 mt-6" data-reveal>
          {/* Average Approval Card */}
          <div className="card glow" style={{ '--role-accent': 'var(--color-violet)' }}>
            <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
              — Durasi Persetujuan
            </div>
            <h3 className="text-xl fw-5 mb-4 tracking-tight">Rata-rata Waktu Respons</h3>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="mono text-4xl font-bold text-violet tracking-tight glow-text flex items-center gap-3">
                <Icon name="clock" size={28} className="text-violet" />
                {dashboardData?.avgApprovalTimeHours !== undefined
                  ? `${dashboardData.avgApprovalTimeHours} Jam`
                  : '4.2 Jam'}
              </div>
              <p className="text-xs text-ink-3 mt-4 text-center leading-relaxed">
                Waktu rata-rata dari draf diajukan oleh Kalab hingga disetujui & difinalisasi oleh
                Kaprodi di database MySQL.
              </p>
            </div>
          </div>

          {/* Low-stock BHP Alert Widget */}
          <div className="card" style={{ '--role-accent': 'var(--color-cyan)' }}>
            <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
              — Sisa Stok BHP Kritis
            </div>
            <h3 className="text-xl fw-5 mb-4 tracking-tight">BHP Perlu Restock Segera</h3>
            <div className="flex flex-col gap-3.5 w-full">
              {dashboardData?.top3LowBhp && dashboardData.top3LowBhp.length > 0 ? (
                dashboardData.top3LowBhp.map((b) => (
                  <div key={b.code}>
                    <div className="flex between aic mb-1.5">
                      <div className="text-[13px]">
                        <b>{b.name}</b> <span className="text-3 mono text-xs">· {b.code}</span>
                      </div>
                      <span className="mono text-xs text-rose font-semibold">
                        {b.stock} / {b.min_stock} {b.unit}
                      </span>
                    </div>
                    <div
                      className="h-[6px]"
                      style={{
                        background: 'var(--color-surface-2)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="rounded-sm"
                        style={{
                          height: '100%',
                          width: `${Math.max(5, b.pct)}%`,
                          background:
                            'linear-gradient(90deg, var(--color-rose), var(--color-gold))',
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ink-3 text-center py-4">
                  Semua stok BHP di atas batas minimum. Aman.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Laboratory Maintenance Load Heatmap (Staf Lab & Kalab only) ── */}
      {(state.role === 'staflab' || state.role === 'kalab') && (
        <div className="card mt-6" data-reveal style={{ '--role-accent': 'var(--color-violet)' }}>
          <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
            — Beban Kerusakan Ruangan
          </div>
          <h3 className="text-xl fw-5 mb-4 tracking-tight">Radar Pemeliharaan Lab (MySQL)</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {dashboardData?.maintLoadByRoom && dashboardData.maintLoadByRoom.length > 0 ? (
              dashboardData.maintLoadByRoom.map((r, idx) => {
                const isHighest = idx === 0;
                return (
                  <div
                    key={r.code}
                    className="card compact flex flex-col justify-between"
                    style={{
                      background: isHighest
                        ? 'rgba(167, 139, 250, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isHighest
                        ? '1px solid rgba(167, 139, 250, 0.25)'
                        : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'default',
                    }}
                  >
                    <div className="flex between items-start">
                      <div className="mono text-[10px] text-3 uppercase tracking-wider font-semibold">
                        {r.code}
                      </div>
                      <span
                        className="badge new"
                        style={{
                          background: isHighest
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(167,139,250,0.1)',
                          color: isHighest ? '#ef4444' : 'var(--color-violet)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {r.count} Insiden
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm fw-6 truncate">{r.name}</div>
                      <p className="text-[11px] text-ink-3 mt-1 leading-normal">
                        {isHighest
                          ? '🚨 Memerlukan inspeksi prioritas tinggi.'
                          : 'Kondisi terpantau aman.'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-xs text-ink-3 text-center py-4">
                Belum ada catatan log pemeliharaan aset masuk.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
