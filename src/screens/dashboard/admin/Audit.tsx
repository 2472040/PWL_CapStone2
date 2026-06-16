import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore, useToast, D, Icon, useSearch } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';

interface AuditLog {
  id: number;
  user_id?: number | string;
  User?: {
    name: string;
    role: string;
  };
  action: string;
  target: string;
  details: string;
  ip: string;
  hash: string;
  previous_hash: string;
  created_at?: string;
  createdAt?: string;
}

function CustomDatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day', 'year', 'month'
  const [decadeStart, setDecadeStart] = useState(
    () => Math.floor(new Date().getFullYear() / 12) * 12
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setViewMode('day');
    }
  }, [open]);

  const displayValue = useMemo(() => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }, [value]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (date: Date | null) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref} style={{ zIndex: 99 }}>
      <button
        type="button"
        data-no-sound
        onClick={() => setOpen(!open)}
        className="btn sm border border-line flex items-center gap-2"
        style={{
          background: 'var(--color-surface-2, rgba(255, 255, 255, 0.08))',
          color: value ? 'var(--color-ink)' : 'var(--color-ink-3)',
          borderRadius: '8px',
          padding: '4px 12px',
          fontSize: '12px',
          height: '32px',
          minWidth: '120px',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <Icon name="cal" size={13} className="opacity-60" />
      </button>

      {open && (
        <div
          className="absolute mt-1.5 p-4 rounded-xl border border-line z-[999] animate-fade-in text-left"
          style={{
            background: '#121214', // Solid dark charcoal, fully opaque
            width: '260px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            left: 0,
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            {viewMode === 'day' && (
              <>
                <button
                  type="button"
                  data-no-sound
                  className="p-1 hover:bg-white/10 rounded-lg text-ink-2 hover:text-white cursor-pointer"
                  style={{ minWidth: 'auto', background: 'transparent', border: 0 }}
                  onClick={handlePrevMonth}
                >
                  <Icon name="chevL" size={14} />
                </button>
                <button
                  type="button"
                  data-no-sound
                  onClick={() => {
                    setDecadeStart(Math.floor(currentMonth.getFullYear() / 12) * 12);
                    setViewMode('year');
                  }}
                  className="text-xs font-semibold text-ink px-2 py-1 rounded hover:bg-white/10 transition-all cursor-pointer bg-transparent border-0"
                >
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </button>
                <button
                  type="button"
                  data-no-sound
                  className="p-1 hover:bg-white/10 rounded-lg text-ink-2 hover:text-white cursor-pointer"
                  style={{ minWidth: 'auto', background: 'transparent', border: 0 }}
                  onClick={handleNextMonth}
                >
                  <Icon name="chevR" size={14} />
                </button>
              </>
            )}

            {viewMode === 'year' && (
              <>
                <button
                  type="button"
                  data-no-sound
                  className="p-1 hover:bg-white/10 rounded-lg text-ink-2 hover:text-white cursor-pointer"
                  style={{ minWidth: 'auto', background: 'transparent', border: 0 }}
                  onClick={() => setDecadeStart(decadeStart - 12)}
                >
                  <Icon name="chevL" size={14} />
                </button>
                <span className="text-xs font-semibold text-ink">
                  {decadeStart} - {decadeStart + 11}
                </span>
                <button
                  type="button"
                  data-no-sound
                  className="p-1 hover:bg-white/10 rounded-lg text-ink-2 hover:text-white cursor-pointer"
                  style={{ minWidth: 'auto', background: 'transparent', border: 0 }}
                  onClick={() => setDecadeStart(decadeStart + 12)}
                >
                  <Icon name="chevR" size={14} />
                </button>
              </>
            )}

            {viewMode === 'month' && (
              <>
                <button
                  type="button"
                  data-no-sound
                  className="p-1 hover:bg-white/10 rounded-lg text-ink-2 hover:text-white cursor-pointer"
                  style={{ minWidth: 'auto', background: 'transparent', border: 0 }}
                  onClick={() => setViewMode('year')}
                >
                  <Icon name="chevL" size={14} />
                </button>
                <span className="text-xs font-semibold text-ink">
                  Pilih Bulan ({currentMonth.getFullYear()})
                </span>
                <div style={{ width: 22 }} /> {/* Balancer */}
              </>
            )}
          </div>

          {/* Body */}
          {viewMode === 'day' && (
            <>
              {/* Weekday Names */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <span key={d} className="text-[10px] text-ink-3 font-semibold">
                    {d}
                  </span>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  const y = day.getFullYear();
                  const m = String(day.getMonth() + 1).padStart(2, '0');
                  const d = String(day.getDate()).padStart(2, '0');
                  const formattedStr = `${y}-${m}-${d}`;
                  const isSelected = value === formattedStr;
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <button
                      key={formattedStr}
                      type="button"
                      data-no-sound
                      onClick={() => handleSelectDay(day)}
                      className="h-7 w-7 text-[11px] rounded-lg transition-all flex items-center justify-center font-medium cursor-pointer"
                      style={{
                        background: isSelected
                          ? 'var(--color-violet, #a78bfa)'
                          : isToday
                            ? 'rgba(255,255,255,0.08)'
                            : 'transparent',
                        color: isSelected
                          ? '#000'
                          : isToday
                            ? 'var(--color-ink)'
                            : 'var(--color-ink-2)',
                        border: isToday ? '1px solid rgba(255,255,255,0.15)' : 'none',
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'year' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((yr) => {
                const isSelected = currentMonth.getFullYear() === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    data-no-sound
                    onClick={() => {
                      setCurrentMonth(new Date(yr, currentMonth.getMonth(), 1));
                      setViewMode('month');
                    }}
                    className="py-2 text-xs rounded-lg transition-all text-ink-2 hover:bg-white/10 hover:text-white cursor-pointer bg-transparent border-0"
                    style={{
                      background: isSelected ? 'var(--color-violet, #a78bfa)' : 'transparent',
                      color: isSelected ? '#000' : 'var(--color-ink-2)',
                      fontWeight: isSelected ? '600' : 'normal',
                    }}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'month' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {monthNames.map((name, idx) => {
                const isSelected = currentMonth.getMonth() === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    data-no-sound
                    onClick={() => {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1));
                      setViewMode('day');
                    }}
                    className="py-2 text-xs rounded-lg transition-all text-ink-2 hover:bg-white/10 hover:text-white cursor-pointer bg-transparent border-0"
                    style={{
                      background: isSelected ? 'var(--color-violet, #a78bfa)' : 'transparent',
                      color: isSelected ? '#000' : 'var(--color-ink-2)',
                      fontWeight: isSelected ? '600' : 'normal',
                    }}
                  >
                    {name.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
            <button
              type="button"
              data-no-sound
              className="text-[10px] text-rose font-medium hover:underline cursor-pointer bg-transparent border-0"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Hapus
            </button>
            <button
              type="button"
              data-no-sound
              className="text-[10px] text-cyan font-medium hover:underline cursor-pointer bg-transparent border-0"
              onClick={() => {
                const today = new Date();
                handleSelectDay(today);
              }}
            >
              Hari ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Audit() {
  const role = D.roles.find((r) => r.id === 'sysadmin') || D.roles[0];
  const { query } = useSearch();
  const { dispatch } = useStore();
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState('all');
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target as Node)) {
        setActionDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tableWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await apiFetch('/audit-logs');
        if (res.data) {
          setLogs(res.data);
        }
      } catch (err: any) {
        toast('Gagal memuat audit log: ' + err.message, 'warn');
      }
    }
    loadLogs();
  }, [toast]);

  // Buttery-smooth X-axis horizontal scrolling implementation for the table
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    let targetScrollLeft = el.scrollLeft;
    let currentScrollLeft = el.scrollLeft;
    let animationFrameId: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      // Determine if scrolling horizontally (e.deltaX) or vertically with Shift key
      const delta = e.shiftKey
        ? e.deltaY
        : e.deltaX || (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? 0 : e.deltaX);

      // Only smooth horizontal scrolling, let vertical scrolls propagate to Lenis
      if (delta === 0) return;

      e.preventDefault();
      targetScrollLeft = Math.max(
        0,
        Math.min(el.scrollWidth - el.clientWidth, targetScrollLeft + delta)
      );

      if (!animationFrameId) {
        const animate = () => {
          const diff = targetScrollLeft - currentScrollLeft;
          if (Math.abs(diff) > 0.5) {
            currentScrollLeft += diff * 0.15; // lerp interpolation speed
            el.scrollLeft = currentScrollLeft;
            animationFrameId = requestAnimationFrame(animate);
          } else {
            el.scrollLeft = targetScrollLeft;
            currentScrollLeft = targetScrollLeft;
            animationFrameId = null;
          }
        };
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  function exportAuditToCSV() {
    if (logs.length === 0) {
      toast('Tidak ada data audit log untuk diekspor.', 'warn');
      return;
    }

    try {
      const headers = [
        'ID',
        'User ID',
        'Nama Pengguna',
        'Aksi',
        'Target',
        'IP Address',
        'Detail',
        'Hash',
        'Previous Hash',
        'Waktu',
      ];

      const parseDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return isNaN(date.getTime()) ? String(d) : date.toISOString();
      };

      const rows = logs.map((l: AuditLog) => {
        const userName = l.User?.name || 'Sistem';
        const cleanName = String(userName).replace(/"/g, '""');
        const cleanTarget = String(l.target || '').replace(/"/g, '""');
        const cleanDetails = String(l.details || '').replace(/"/g, '""');
        const actionStr = l.action ? String(l.action).replace(/"/g, '""') : '';
        const ipStr = l.ip ? String(l.ip).replace(/"/g, '""') : '';
        const hashStr = l.hash ? String(l.hash).replace(/"/g, '""') : '';
        const prevHashStr = l.previous_hash ? String(l.previous_hash).replace(/"/g, '""') : '';

        const timestamp = l.created_at
          ? parseDate(l.created_at)
          : l.createdAt
            ? parseDate(l.createdAt)
            : '';

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
          `"${timestamp}"`,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((r: (string | number)[]) => r.join(',')),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `lokalab_audit_logs_${new Date().toISOString().substring(0, 10)}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast('Audit log berhasil diekspor ke CSV!', 'ok');
    } catch (err: any) {
      console.error(err);
      toast('Gagal mengekspor audit log CSV: ' + err.message, 'warn');
    }
  }

  const formattedLogs = useMemo(() => {
    return logs.map((a: AuditLog, i: number) => {
      const uRole = a.User?.role || '';
      const rawDate = a.created_at
        ? new Date(a.created_at)
        : a.createdAt
          ? new Date(a.createdAt)
          : null;
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
        previousHash: a.previous_hash || '',
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    return formattedLogs.filter((a) => {
      if (filter !== 'all') {
        const mappedFilter = filter === 'staf' ? 'staflab' : filter === 'sys' ? 'sysadmin' : filter;
        if (!a.role.toLowerCase().includes(mappedFilter.toLowerCase())) {
          return false;
        }
      }

      if (actionType !== 'all') {
        const act = a.action.toLowerCase();
        if (actionType === 'auth') {
          if (!act.startsWith('auth.')) return false;
        } else if (actionType === 'draft') {
          if (
            !act.startsWith('draft.') &&
            !act.startsWith('receiving.') &&
            !act.startsWith('procurement.')
          )
            return false;
        } else if (actionType === 'maintenance') {
          if (!act.startsWith('maintenance.') && !act.startsWith('bhp.')) return false;
        } else if (actionType === 'admin') {
          if (
            !act.startsWith('user.') &&
            !act.startsWith('room.') &&
            !act.startsWith('inventory.') &&
            !act.startsWith('label.')
          )
            return false;
        } else if (actionType === 'backup') {
          if (!act.startsWith('backup.')) return false;
        }
      }

      if (startDate && a.rawDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (a.rawDate < start) return false;
      }
      if (endDate && a.rawDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (a.rawDate > end) return false;
      }

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
    <div className="page" style={{ '--role-accent': role.accent } as any}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">
            Semua aksi tercatat. Klik baris tabel untuk melihat rincian detail & validitas
            kriptografi secara lengkap.
          </p>
        </div>
        <button className="btn" onClick={exportAuditToCSV}>
          <Icon name="download" size={13} /> Export CSV
        </button>
      </div>

      <div
        data-reveal
        className="flex flex-wrap items-center gap-3.5 mb-4 p-3.5 border border-line rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 20, // Elevate stacking context of filter bar above table wrap
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-3 fw-5 mr-1">Role:</span>
          {['all', 'kalab', 'kaprodi', 'admin', 'staf', 'sys'].map((f) => (
            <button
              key={f}
              data-no-sound
              onClick={() => setFilter(f)}
              className={`btn sm ${filter === f ? 'primary' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'Semua' : f === 'staf' ? 'Staf Lab' : f === 'sys' ? 'Sysadmin' : f}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-2"
          ref={actionDropdownRef}
          style={{ position: 'relative' }}
        >
          <span className="text-xs text-ink-3 fw-5">Aksi:</span>
          <button
            type="button"
            data-no-sound
            onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
            className="btn sm border border-line flex items-center gap-2"
            style={{
              background: 'var(--color-surface-2, rgba(255, 255, 255, 0.08))',
              color: 'var(--color-ink)',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '12px',
              height: '32px',
              justifyContent: 'space-between',
              cursor: 'pointer',
              minWidth: '130px',
            }}
          >
            <span>
              {actionType === 'all'
                ? 'Semua Aksi'
                : actionType === 'auth'
                  ? 'Autentikasi'
                  : actionType === 'draft'
                    ? 'Pengadaan'
                    : actionType === 'maintenance'
                      ? 'Maintenance'
                      : actionType === 'admin'
                        ? 'Administrasi'
                        : actionType === 'backup'
                          ? 'Pencadangan'
                          : actionType}
            </span>
            <Icon name="chevD" size={12} className="opacity-60" />
          </button>

          {actionDropdownOpen && (
            <div
              className="absolute mt-1.5 p-1 rounded-xl border border-line z-[999] animate-fade-in text-left"
              style={{
                background: '#121214', // Solid dark charcoal, fully opaque
                width: '180px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                top: '100%',
                left: 'auto',
                right: 0,
              }}
            >
              {[
                { value: 'all', label: 'Semua Aksi' },
                { value: 'auth', label: 'Autentikasi' },
                { value: 'draft', label: 'Pengadaan' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'admin', label: 'Administrasi' },
                { value: 'backup', label: 'Pencadangan' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-no-sound
                  onClick={() => {
                    setActionType(opt.value);
                    setActionDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/10 text-ink-2 hover:text-white cursor-pointer bg-transparent border-0"
                  style={{
                    display: 'block',
                    background: actionType === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: actionType === opt.value ? 'var(--color-ink)' : 'var(--color-ink-2)',
                    fontWeight: actionType === opt.value ? '600' : 'normal',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Themed Date Picker Filter */}
        <div className="flex items-center gap-2 flex-wrap" style={{ position: 'relative' }}>
          <span className="text-xs text-ink-3 fw-5">Tanggal:</span>
          <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Mulai" />
          <span className="text-xs text-ink-3">—</span>
          <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="Selesai" />

          {(startDate || endDate || actionType !== 'all' || filter !== 'all') && (
            <button
              className="btn sm text-xs border border-line cursor-pointer"
              data-no-sound
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setActionType('all');
                setFilter('all');
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-rose)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {query && filtered.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico">
            <Icon name="search" size={20} />
          </div>
          <h4>Tidak ada audit cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      {/* Removed data-lenis-prevent so vertical scroll propagates to Lenis (smooth), 
          and bound tableWrapRef for smooth custom X scroll */}
      <div ref={tableWrapRef} className="table-wrap" data-reveal>
        <table className="tbl" style={{ minWidth: '1100px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px', minWidth: '160px' }}>Waktu</th>
              <th style={{ width: '160px', minWidth: '160px' }}>Pengguna</th>
              <th style={{ width: '100px', minWidth: '100px' }}>Role</th>
              <th style={{ width: '160px', minWidth: '160px' }}>Aksi</th>
              <th style={{ width: '160px', minWidth: '160px' }}>Target</th>
              <th style={{ width: '320px', minWidth: '320px' }}>Detail</th>
              <th style={{ width: '120px', minWidth: '120px' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="hover:bg-white/5 cursor-pointer"
                onClick={() =>
                  dispatch({ type: 'OPEN_MODAL', modal: { kind: 'auditDetail', payload: a } })
                }
              >
                <td className="mono text-xs">{a.ts}</td>
                <td>
                  <b>{a.user}</b>
                </td>
                <td>
                  <span className="chip">{a.role}</span>
                </td>
                <td className="mono text-xs text-cyan">{a.action}</td>
                <td className="text-sm">{a.target}</td>
                <td
                  className="text-xs"
                  style={{
                    minWidth: '320px',
                    width: '320px',
                    wordBreak: 'break-word',
                    color: 'var(--color-ink-2)',
                    lineHeight: '1.5',
                  }}
                >
                  {a.details || <span style={{ opacity: 0.3 }}>—</span>}
                </td>
                <td className="mono text-xs text-3">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
