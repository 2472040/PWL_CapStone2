import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, useToast, PageBar, PageHost, StatTile, D, Icon, QR, useSearch } from '../../components/app-shell.jsx';

function Inventory() {
  const { state, dispatch } = useStore();
  const { query: globalQuery } = useSearch();
  const role = D.roles.find(r => r.id === state.role);
  const [filter, setFilter] = useState('all');
  const [localQuery, setLocalQuery] = useState('');
  const query = globalQuery || localQuery;

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
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Inventaris</h1>
          <p className="page-sub">{filtered.length} dari {state.inventory.length} aset. Klik kartu untuk membuka detail dan riwayat maintenance.</p>
        </div>
        <div className="flex gap-2" >
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

// Inventory detail drawer
function InventoryDetail({ payload, close }) {
  const it = payload;
  const { state, dispatch } = useStore();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);
  const logs = state.maintLog.filter(l => l.asset === it.code);
  const canMaintain = state.role === 'staflab';
  const canEdit = state.role === 'admin';

  return (
    <>
      <div className="drawer-bar">
        <div>
          <div className="mono text-xs text-3 mb-2 tracking-[0.06em]" >{it.code}</div>
          <div className="drawer-title">{it.name}</div>
        </div>
        <button className="x-btn" onClick={close}><Icon name="x" size={14} /></button>
      </div>
      <div className="drawer-body">
        <div className="flex gap-4 items-start mb-[22px]" >
          <QR seed={it.code} size={9} />
          <div className="flex-1" >
            <div className="mono text-xs text-3 mb-2 tracking-[0.06em]" >SCAN QR untuk maintenance · log otomatis</div>
            <div className="flex flex-wrap gap-2" >
              <span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span>
              <span className="chip">{it.cat}</span>
              <span className="chip"><Icon name="pin" size={11} /> {it.room}</span>
            </div>
          </div>
        </div>

        <div className="spec-grid mb-6">
          <div className="spec-cell"><div className="spec-k">Serial</div><div className="spec-v mono">{it.serial}</div></div>
          <div className="spec-cell"><div className="spec-k">Diperoleh</div><div className="spec-v">{it.acquired}</div></div>
          <div className="spec-cell"><div className="spec-k">Nilai</div><div className="spec-v mono">{window.fmtRpShort(it.value)}</div></div>
          <div className="spec-cell"><div className="spec-k">Last used</div><div className="spec-v text-sm">{it.last}</div></div>
        </div>

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase" >— Spesifikasi</div>
        <div className="card compact mb-6 text-[13px] text-ink-2" >{it.specs}</div>

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase" >— Riwayat maintenance</div>
        {logs.length === 0 ? (
          <div className="empty">
            <div className="ico"><Icon name="wrench" size={20} /></div>
            <h4>Belum ada log</h4>
            <div>Riwayat maintenance akan muncul di sini.</div>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {logs.map(l => (
              <div key={l.id} className="card compact p-3.5" >
                <div className="flex between aic mb-2">
                  <div className="fw-5 text-sm">{l.action}</div>
                  <div className="mono text-xs text-3">{l.date}</div>
                </div>
                <div className="text-xs text-3">oleh {l.tech} · kondisi setelah: <span className={`cond ${l.cond.toLowerCase().replace(' ', '-')}`}>{l.cond}</span></div>
                {l.bhp.length > 0 && (
                  <div className="text-xs text-3 mt-2">
                    BHP terpakai: {l.bhp.map(b => `${b.qty} ${b.unit} (${b.id})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="drawer-foot">
        {canEdit && <button className="btn"><Icon name="edit" size={12} /> Update label</button>}
        {canMaintain && (
          <button className="btn primary" onClick={() => {
            close();
            setTimeout(() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: { asset: it.code } } }), 200);
          }}>
            <Icon name="wrench" size={13} /> Log maintenance
          </button>
        )}
      </div>
    </>
  );
}



export { Inventory, InventoryDetail };

