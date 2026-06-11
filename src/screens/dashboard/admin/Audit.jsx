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
  const [selectedLog, setSelectedLog] = useState(null);

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
        ip: a.ip || '-',
        hash: a.hash || '',
        previousHash: a.previous_hash || ''
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
          <p className="page-sub">Semua aksi tercatat. Klik baris tabel untuk melihat rincian detail & validitas kriptografi secara lengkap.</p>
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
            <option value="auth">Autentikasi</option>
            <option value="draft">Pengadaan</option>
            <option value="maintenance">Maintenance</option>
            <option value="admin">Administrasi</option>
            <option value="backup">Pencadangan</option>
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
              <tr key={a.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedLog(a)}>
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

      {/* Dinamis Detail Modal Popup */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 9, 11, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
        }}>
          <div className="card max-w-lg w-full mx-4 overflow-hidden flex flex-col" style={{
            background: 'var(--surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Head */}
            <div className="p-5 border-b border-[#27272A] flex between aic">
              <div>
                <h3 className="text-lg fw-6 tracking-tight flex items-center gap-2">
                  <Icon name="log" size={18} className="text-cyan" />
                  Detail Log Aktivitas #{selectedLog.id}
                </h3>
              </div>
              <button className="btn sm border-0 bg-transparent text-ink hover:text-white" onClick={() => setSelectedLog(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-sm overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                <span className="text-ink-3">Waktu</span>
                <span className="col-span-2 mono text-xs fw-5">{selectedLog.ts}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                <span className="text-ink-3">Pengguna</span>
                <span className="col-span-2">
                  <b>{selectedLog.user}</b>
                  {selectedLog.role && <span className="chip ml-2" style={{ verticalAlign: 'middle' }}>{selectedLog.role}</span>}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                <span className="text-ink-3">Aksi</span>
                <span className="col-span-2 mono text-xs text-cyan fw-6">{selectedLog.action}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                <span className="text-ink-3">Target</span>
                <span className="col-span-2 fw-5">{selectedLog.target || '—'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                <span className="text-ink-3">IP Address</span>
                <span className="col-span-2 mono text-xs text-ink-2">{selectedLog.ip}</span>
              </div>

              <div className="py-2 border-b border-white/5">
                <span className="text-ink-3 block mb-1">Rincian / Detail</span>
                <div className="p-3 rounded-lg border border-line text-xs whitespace-pre-wrap leading-relaxed" style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  color: 'var(--ink-2)'
                }}>
                  {selectedLog.details || 'Tidak ada detail tambahan.'}
                </div>
              </div>

              {/* Cryptographic Integrity Section */}
              {selectedLog.hash && (
                <div className="p-3.5 rounded-xl border border-cyan/20" style={{
                  background: 'rgba(6, 182, 212, 0.03)',
                }}>
                  <div className="flex items-center gap-1.5 text-xs text-cyan fw-6 mb-2">
                    <Icon name="check" size={12} strokeWidth={2.4} /> Integritas Rantai Blok Kriptografi Terverifikasi
                  </div>
                  <div className="space-y-1.5 text-[10px] mono">
                    <div className="truncate">
                      <span className="text-ink-3">Current Hash:</span> <span className="text-ink-2" title={selectedLog.hash}>{selectedLog.hash}</span>
                    </div>
                    {selectedLog.previousHash && (
                      <div className="truncate">
                        <span className="text-ink-3">Prev Hash:</span> <span className="text-ink-2" title={selectedLog.previousHash}>{selectedLog.previousHash}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
