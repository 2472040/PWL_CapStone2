import React, { useState, useEffect } from 'react';
import { useStore, StatTile, D, Icon, QR, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Inventory() {
  const { state, dispatch } = useStore();
  const { query: globalQuery } = useSearch();
  const role = D.roles.find(r => r.id === state.role);
  const [filter, setFilter] = useState('all');
  const [localQuery, setLocalQuery] = useState('');
  const query = globalQuery || localQuery;

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await apiFetch('/inventory');
        if (res.data) {
          const inv = res.data.map(i => ({
            id: i.id,
            code: i.code,
            name: i.name,
            cat: i.category,
            room: i.Room?.name || 'Gudang',
            cond: i.condition || 'Baik',
            last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
            acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
            value: i.value || 0,
            serial: i.serial || '-',
            specs: i.specs || '-'
          }));
          dispatch({ type: 'SET_INVENTORY', inventory: inv });
        }
      } catch (err) {
        console.error('Failed to load inventory', err);
      }
    }
    fetchInventory();
  }, [dispatch]);

  const filtered = state.inventory.filter(it => {
    if (filter !== 'all' && it.cat !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q) || it.room.toLowerCase().includes(q) || it.specs.toLowerCase().includes(q);
    }
    return true;
  });

  const cats = ['all', ...new Set(state.inventory.map(it => it.cat))];

  return (
    <div className="page" style={{'--role-accent': role ? role.accent : undefined}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Inventaris</h1>
          <p className="page-sub">{filtered.length} dari {state.inventory.length} aset. Klik kartu untuk membuka detail dan riwayat maintenance.</p>
        </div>
        <div className="flex gap-2" >
          {(state.role === 'admin' || state.role === 'sysadmin') && (
            <button className="btn" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'bulkImport' } })} style={{ borderColor: 'rgba(168,85,247,0.35)', color: 'var(--color-violet)' }}>
              <Icon name="upload" size={13} /> Import CSV
            </button>
          )}
          {state.role === 'admin' && <button className="btn" onClick={() => window.showToast && window.showToast('Generate bulk label QR…', 'info', 'qr')}><Icon name="qr" size={13} /> Bulk label</button>}
          {state.role === 'admin' && <button className="btn primary" onClick={() => window.showToast && window.showToast('Form tambah aset akan segera hadir', 'warn', 'info')}><Icon name="plus" size={13} strokeWidth={2.4} /> Tambah aset</button>}
        </div>
      </div>

      <div data-reveal className="flex flex-wrap gap-2 mb-[18px]" >
        <div className="searchbox min-w-[260px]" >
          <Icon name="search" size={13} strokeWidth={2} className="text-ink-3"  />
          <input value={localQuery} onChange={e => setLocalQuery(e.target.value)} placeholder={globalQuery ? `Filter: "${globalQuery}"` : "Cari aset…"} />
        </div>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`btn sm ${filter === c ? 'primary' : ''}`} style={{textTransform: 'capitalize'}}>
            {c === 'all' ? 'Semua' : c}
          </button>
        ))}
      </div>

      <div className="inv-grid">
        {filtered.map(it => (
          <div key={it.code} className="inv-card tilt-card" data-reveal onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'inventory', payload: it } })}>
            <div className="tilt-shine" />
            <div className="inv-card-head">
              <div>
                <div className="inv-code">{it.code}</div>
              </div>
              <QR seed={it.code} size={7} />
            </div>
            <div className="inv-name">{it.name}</div>
            <div className="inv-spec">{it.cat} · {it.specs}</div>
            <div className="inv-meta">
              <div className="inv-meta-row">
                <span className="k">Ruangan</span>
                <span className="v">{it.room}</span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Kondisi</span>
                <span><span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span></span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Terakhir digunakan</span>
                <span className="v mono text-xs">{it.last}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
