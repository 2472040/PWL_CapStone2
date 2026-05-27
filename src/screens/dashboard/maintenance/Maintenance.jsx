import React, { useEffect } from 'react';
import { useStore, D, Icon, StatTile, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Maintenance() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'staflab');

  useEffect(() => {
    async function loadMaintLogs() {
      try {
        const res = await apiFetch('/maintenance');
        if (res.data) {
          const formatted = res.data.map(l => ({
            id: l.code || l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            asset: l.Inventory?.code,
            name: l.Inventory?.name,
            action: l.action,
            tech: l.technician?.name || 'Teknisi',
            cond: l.condition_after,
            bhp: l.bhpUsed?.map(bu => ({
              id: bu.Bhp?.code || bu.bhp_id,
              qty: parseFloat(bu.qty_used) || 0,
              unit: bu.Bhp?.unit || 'pcs'
            })) || []
          }));
          dispatch({ type: 'SET_MAINT_LOGS', logs: formatted });
        }
      } catch (err) {
        console.error('Failed to load maintenance logs:', err);
      }
    }

    async function loadBhpData() {
      try {
        const res = await apiFetch('/bhp');
        if (res.data) {
          const formatted = res.data.map(b => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General'
          }));
          dispatch({ type: 'SET_BHP', bhp: formatted });
        }
      } catch (err) {
        console.error('Failed to load BHP:', err);
      }
    }

    loadMaintLogs();
    loadBhpData();
  }, [dispatch]);

  const filteredLogs = state.maintLog.filter(l => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (l.name || '').toLowerCase().includes(q) || (l.asset || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q) || (l.tech || '').toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Log <em>maintenance</em></h1>
          <p className="page-sub">Catat pemeliharaan, update kondisi aset. BHP yang dipakai otomatis berkurang dari stok.</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: {} } })}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Log baru
        </button>
      </div>

      <div className="stats">
        <StatTile label="Log bulan ini" value={state.maintLog.length} icon="log" fmt="int" />
        <StatTile label="Aset di-maintain" value={state.inventory.filter(i => i.cond === 'Maintenance').length} icon="wrench" fmt="int" />
        <StatTile label="Aset perlu cek" value={state.inventory.filter(i => i.cond === 'Perlu cek').length} icon="alert" fmt="int" accent="var(--gold)" />
        <StatTile label="BHP rendah" value={state.bhp.filter(b => b.stock <= b.min).length} icon="flask" fmt="int" accent="var(--rose)" />
      </div>

      {query && filteredLogs.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada log cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="table-wrap" data-reveal>
        <table className="tbl">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Tanggal</th>
              <th>Aset</th>
              <th>Tindakan</th>
              <th>Teknisi</th>
              <th>Kondisi</th>
              <th>BHP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(l => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td>{l.date}</td>
                <td><b>{l.name}</b><div className="mono text-xs">{l.asset}</div></td>
                <td className="text-2">{l.action}</td>
                <td>{l.tech}</td>
                <td><span className={`cond ${(l.cond || 'Baik').toLowerCase().replace(' ', '-')}`}>{l.cond}</span></td>
                <td className="text-xs mono">
                  {(!l.bhp || l.bhp.length === 0) ? <span className="text-3">—</span> : l.bhp.map((b, i) => (
                    <div key={i}>{b.id}: −{b.qty}{b.unit}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
