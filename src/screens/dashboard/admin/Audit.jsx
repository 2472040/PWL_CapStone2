import React, { useState, useEffect, useMemo } from 'react';
import { useStore, useToast, D, Icon, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Audit() {
  const role = D.roles.find(r => r.id === 'sysadmin');
  const { query } = useSearch();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState('all');
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

  function exportAuditToCSV() {
    if (logs.length === 0) {
      toast('Tidak ada data audit log untuk diekspor.', 'warn');
      return;
    }
    
    try {
      // CSV headers
      const headers = ['ID', 'User ID', 'Nama Pengguna', 'Aksi', 'Target', 'IP Address', 'Detail', 'Hash', 'Previous Hash', 'Waktu'];
      
      const parseDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        return isNaN(date.getTime()) ? String(d) : date.toISOString();
      };

      // CSV rows
      const rows = logs.map(l => {
        const userName = l.User?.name || 'Sistem';
        const cleanName = String(userName).replace(/"/g, '""');
        const cleanTarget = String(l.target || '').replace(/"/g, '""');
        const cleanDetails = String(l.details || '').replace(/"/g, '""');
        const actionStr = l.action ? String(l.action).replace(/"/g, '""') : '';
        const ipStr = l.ip ? String(l.ip).replace(/"/g, '""') : '';
        const hashStr = l.hash ? String(l.hash).replace(/"/g, '""') : '';
        const prevHashStr = l.previous_hash ? String(l.previous_hash).replace(/"/g, '""') : '';
        
        const timestamp = l.created_at ? parseDate(l.created_at) : (l.createdAt ? parseDate(l.createdAt) : '');

        return [
          l.id,
          l.user_id || '',
          `"${cleanName}"`,
          `"${actionStr}"`,
          `"${cleanTarget}"`,
          `"${ipStr}"`,
          `"${cleanDetails}"`,
          `"${hashStr}"`,
          `"${prevHashStr}"`,
          `"${timestamp}"`
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `lokalab_audit_logs_${new Date().toISOString().substring(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast('Audit log berhasil diekspor ke CSV!', 'ok');
    } catch (err) {
      console.error(err);
      toast('Gagal mengekspor audit log CSV: ' + err.message, 'warn');
    }
  }

  const formattedLogs = useMemo(() => {
    return logs.map((a, i) => {
      const uRole = a.User?.role || '';
      const rawDate = a.created_at ? new Date(a.created_at) : (a.createdAt ? new Date(a.createdAt) : null);
      return {
        id: a.id || i,
        ts: rawDate ? rawDate.toLocaleString('id-ID') : '-',
        rawDate,
        user: a.User?.name || 'Sistem',
        role: uRole,
        action: a.action || '',
        target: a.target || '',
        details: a.details || '',
        ip: a.ip || '-'
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    return formattedLogs.filter(a => {
      // 1. Role Filter
      if (filter !== 'all') {
        const mappedFilter = filter === 'staf' ? 'staflab' : filter === 'sys' ? 'sysadmin' : filter;
        if (!a.role.toLowerCase().includes(mappedFilter.toLowerCase())) {
          return false;
        }
      }

      // 2. Action Type Filter
      if (actionType !== 'all') {
        const act = a.action.toLowerCase();
        if (actionType === 'auth') {
          if (!act.startsWith('auth.')) return false;
        } else if (actionType === 'draft') {
          if (!act.startsWith('draft.') && !act.startsWith('receiving.') && !act.startsWith('procurement.')) return false;
        } else if (actionType === 'maintenance') {
          if (!act.startsWith('maintenance.') && !act.startsWith('bhp.')) return false;
        } else if (actionType === 'admin') {
          if (!act.startsWith('user.') && !act.startsWith('room.') && !act.startsWith('inventory.') && !act.startsWith('label.')) return false;
        } else if (actionType === 'backup') {
          if (!act.startsWith('backup.')) return false;
        }
      }

      // 3. Date Range Filter
      if (startDate && a.rawDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (a.rawDate < start) return false;
      }
      if (endDate && a.rawDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (a.rawDate > end) return false;
      }

      // 4. Global Search Query
      if (query) {
        const q = query.toLowerCase();
        return (
          a.user.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.target.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.details.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [formattedLogs, filter, actionType, startDate, endDate, query]);

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">Semua aksi tercatat. Bisa di-filter per tanggal, tipe aksi, role, atau di-export ke CSV.</p>
        </div>
        <button className="btn" onClick={exportAuditToCSV}><Icon name="download" size={13} /> Export CSV</button>
      </div>

      <div data-reveal className="flex flex-wrap items-center gap-3.5 mb-4 p-3.5 border border-line rounded-xl" style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Role Filters (Original buttons) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-3 fw-5 mr-1">Role:</span>
          {['all', 'kalab', 'kaprodi', 'admin', 'staf', 'sys'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn sm ${filter === f ? 'primary' : ''}`} style={{textTransform: 'capitalize'}}>
              {f === 'all' ? 'Semua' : f === 'staf' ? 'Staf Lab' : f === 'sys' ? 'Sysadmin' : f}
            </button>
          ))}
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3 fw-5">Aksi:</span>
          <select value={actionType} onChange={e => setActionType(e.target.value)} className="btn sm border border-line" style={{
            background: 'var(--surface)',
            color: 'var(--ink)',
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '12px',
          }}>
            <option value="all">Semua Aksi</option>
            <option value="auth">Autentikasi (auth.*)</option>
            <option value="draft">Pengadaan (draft.*, receiving.*)</option>
            <option value="maintenance">Maintenance (maintenance.*, bhp.*)</option>
            <option value="admin">Administrasi (user.*, room.*, inv.*)</option>
            <option value="backup">Pencadangan (backup.*)</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-3 fw-5">Tanggal:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="btn sm border border-line" style={{
            background: 'var(--surface)',
            color: 'var(--ink)',
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '12px',
          }} placeholder="Mulai" />
          <span className="text-xs text-ink-3">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="btn sm border border-line" style={{
            background: 'var(--surface)',
            color: 'var(--ink)',
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '12px',
          }} placeholder="Selesai" />

          {(startDate || endDate || actionType !== 'all' || filter !== 'all') && (
            <button className="btn sm text-xs border border-line" onClick={() => {
              setStartDate('');
              setEndDate('');
              setActionType('all');
              setFilter('all');
            }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--rose)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              Reset Filter
            </button>
          )}
        </div>
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
          <thead><tr><th>Waktu</th><th>Pengguna</th><th>Role</th><th>Aksi</th><th>Target</th><th>Detail</th><th>IP</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono text-xs">{a.ts}</td>
                <td><b>{a.user}</b></td>
                <td><span className="chip">{a.role}</span></td>
                <td className="mono text-xs text-cyan" >{a.action}</td>
                <td className="text-sm">{a.target}</td>
                <td className="text-xs" style={{maxWidth: 260, wordBreak: 'break-word', color: 'var(--ink-2)'}}>{a.details || <span style={{opacity: 0.3}}>—</span>}</td>
                <td className="mono text-xs text-3">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
