import React, { useState, useEffect, useMemo } from 'react';
import { useStore, useToast, D, Icon, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Audit() {
  const role = D.roles.find(r => r.id === 'sysadmin');
  const { query } = useSearch();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const res = await apiFetch('/audit-logs');
        if (res.data) {
          setLogs(res.data);
        }
      } catch (err) {
        toast('Gagal memuat audit log: ' + err.message, 'warn');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [toast]);

  const formattedLogs = useMemo(() => {
    return logs.map((a, i) => {
      const uRole = a.User?.role || '';
      return {
        id: a.id || i,
        ts: a.created_at ? new Date(a.created_at).toLocaleString('id-ID') : '-',
        user: a.User?.name || 'Sistem',
        role: uRole,
        action: a.action,
        target: a.target,
        ip: a.ip || '-'
      };
    });
  }, [logs]);

  const baseFiltered = useMemo(() => {
    if (filter === 'all') return formattedLogs;
    return formattedLogs.filter(a => a.role.toLowerCase().includes(filter));
  }, [formattedLogs, filter]);

  const filtered = useMemo(() => {
    if (!query) return baseFiltered;
    const q = query.toLowerCase();
    return baseFiltered.filter(a =>
      a.user.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      a.target.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  }, [baseFiltered, query]);

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">Semua aksi tercatat. Bisa di-filter per role atau di-export ke CSV.</p>
        </div>
        <button className="btn" onClick={() => window.showToast && window.showToast('Mengekspor audit log ke CSV…', 'info', 'download')}><Icon name="download" size={13} /> Export CSV</button>
      </div>

      <div data-reveal className="flex flex-wrap gap-1.5 mb-3.5" >
        {['all', 'kalab', 'kaprodi', 'admin', 'staf', 'sys'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn sm ${filter === f ? 'primary' : ''}`} style={{textTransform: 'capitalize'}}>{f === 'all' ? 'Semua' : f}</button>
        ))}
      </div>

      {query && filtered.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada audit cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="table-wrap" data-reveal>
        <table className="tbl">
          <thead><tr><th>Waktu</th><th>Pengguna</th><th>Role</th><th>Aksi</th><th>Target</th><th>IP</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono text-xs">{a.ts}</td>
                <td><b>{a.user}</b></td>
                <td><span className="chip">{a.role}</span></td>
                <td className="mono text-xs text-cyan" >{a.action}</td>
                <td className="text-sm">{a.target}</td>
                <td className="mono text-xs text-3">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
