import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, useToast, PageBar, PageHost, StatTile, D, Icon, QR, useSearch } from '../../components/app-shell.jsx';
import { apiFetch } from '../../services/api';

// Helper to map inventory database structures to frontend structures
const mapFrontendInventory = (items) => {
  if (!items) return [];
  return items.map(it => ({
    code: it.code,
    name: it.name,
    cat: it.category,
    room: it.Room ? it.Room.code : 'R-301',
    cond: it.condition || 'Baik',
    last: it.last_checked ? new Date(it.last_checked).toLocaleDateString('id-ID') : 'baru saja',
    acquired: it.acquired_date ? it.acquired_date.substring(0, 7) : '',
    value: parseFloat(it.value) || 0,
    serial: it.serial || '',
    specs: it.specs || ''
  }));
};

// =========================================================
// MAINTENANCE — Staf Lab
// =========================================================
function Maintenance() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === 'staflab');
  const [maintData, setMaintData] = useState([]);

  useEffect(() => {
    async function loadAllData() {
      try {
        const [maintResult, bhpResult, invResult] = await Promise.all([
          apiFetch('/maintenance'),
          apiFetch('/bhp'),
          apiFetch('/inventory')
        ]);

        setMaintData(maintResult.data);
        dispatch({ type: 'SET_BHP', bhp: bhpResult.data });
        dispatch({ type: 'SET_INVENTORY', inventory: mapFrontendInventory(invResult.data) });
      } catch (error) {
        console.error('Gagal mengambil data:', error);
      }
    }

    loadAllData();
  }, [dispatch]);

  const filteredLogs = maintData.filter(l => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.asset || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.tech || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
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
        <StatTile label="Log bulan ini" value={maintData.length} icon="log" fmt="int" />
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
            {(filteredLogs || []).map(l => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td>{l.date}</td>
                <td><b>{l.name}</b><div className="mono text-xs">{l.asset}</div></td>
                <td className="text-2">{l.action}</td>
                <td>{l.tech}</td>
                <td><span className={`cond ${(l.cond || '').toLowerCase().replace(' ', '-')}`}>{l.cond}</span></td>
                <td className="text-xs mono">
                  {!l.bhp || l.bhp.length === 0 ? (
                    <span className="text-3">—</span>
                  ) : (
                    l.bhp.map((b, i) => (
                      <div key={i}>{b.id}: −{b.qty}{b.unit}</div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Maintenance log drawer
function MaintenanceForm({ payload, close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [assetCode, setAssetCode] = useState(payload?.asset || '');
  const [action, setAction] = useState('');
  const [cond, setCond] = useState('Baik');
  const [bhpRows, setBhpRows] = useState([]);
  const asset = state.inventory.find(i => i.code === assetCode);

  function addBhp() {
    if (state.bhp.length === 0) {
      toast('Tidak ada BHP tersedia', 'warn');
      return;
    }
    const first = state.bhp[0];
    setBhpRows(r => [...r, { id: first.id, qty: 1 }]);
  }

  function updateBhp(idx, patch) {
    setBhpRows(r => r.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }

  function removeBhp(idx) {
    setBhpRows(r => r.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!asset) {
      toast('Pilih aset dulu', 'warn');
      return;
    }

    if (!action) {
      toast('Isi tindakan maintenance', 'warn');
      return;
    }

    try {
      const log = {
        inventory_id: asset.code,
        action: action,
        condition_after: cond,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        bhp_used: bhpRows.map(b => ({
          bhp_id: b.id,
          qty: parseFloat(b.qty),
        })),
      };

      const response = await apiFetch('/maintenance', {
        method: 'POST',
        body: JSON.stringify(log),
      });

      dispatch({ type: 'ADD_MAINT_LOG', log: response.data });

      const decrementMsg = bhpRows.length ? ` · ${bhpRows.length} BHP didekrementasi` : '';
      toast('Log tersimpan' + decrementMsg, 'ok');
      close();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Gagal menyimpan log', 'err');
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">Log maintenance baru</div>
        <button className="x-btn" onClick={close}><Icon name="x" size={14} /></button>
      </div>
      <div className="drawer-body">
        <div className="field">
          <div className="field-lbl">Aset <span className="req">*</span></div>
          <select
            className="select"
            value={assetCode}
            onChange={e => setAssetCode(e.target.value)}
            style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <option value="" style={{ background: '#111', color: '#888' }}>Pilih aset…</option>
            {(state.inventory || []).map(i => (
              <option key={i.code} value={i.code} style={{ background: '#111', color: '#fff' }}>
                {i.code || 'NO-CODE'} — {i.name || 'Tanpa Nama'}
              </option>
            ))}
          </select>
        </div>

        {asset && (
          <div className="card compact mb-4 flex gap-3 items-center">
            <div className="flex-1">
              <div className="fw-5 text-sm">{asset.name}</div>
              <div className="text-xs text-3 mt-2">
                {asset?.room || 'Ruangan tidak diketahui'} · kondisi saat ini:{' '}
                <span className={`cond ${((asset?.cond) || '').toLowerCase().replace(' ', '-')}`}>
                  {asset?.cond || 'Tidak diketahui'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="field">
          <div className="field-lbl">Tindakan <span className="req">*</span></div>
          <textarea
            className="textarea"
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Misal: Kalibrasi probe, cleaning kontak, ganti termal paste…"
          />
        </div>

        <div className="field">
          <div className="field-lbl">Kondisi setelah maintenance</div>
          <div className="flex gap-1.5">
            {['Baik', 'Perlu cek', 'Maintenance'].map(c => (
              <button key={c} className={`btn sm ${cond === c ? 'primary' : ''}`} onClick={() => setCond(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="flex between aic mb-2">
            <div className="field-lbl">BHP yang dipakai</div>
            <button className="btn sm" onClick={addBhp}><Icon name="plus" size={11} /> Tambah BHP</button>
          </div>
          {bhpRows.length === 0 && <div className="text-3 text-xs mono" style={{ padding: '8px 0' }}>// tidak ada BHP yang dipakai</div>}
          {bhpRows.map((b, i) => {
            const bd = state.bhp.find(x => x.id === b.id);
            return (
              <div key={i} className="gap-2 grid mb-1.5" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 30px', alignItems: 'center' }}>
                <select
                  className="select"
                  value={b.id}
                  onChange={e => updateBhp(i, { id: e.target.value })}
                  style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {state.bhp.map(x => (
                    <option key={x.id} value={x.id} style={{ background: '#111', color: '#fff' }}>
                      {x.id} — {x.name} | stok: {x.stock} {x.unit}
                    </option>
                  ))}
                </select>
                <input
                  className="input mono"
                  type="number"
                  step="0.01"
                  value={b.qty}
                  onChange={e => updateBhp(i, { qty: e.target.value })}
                  placeholder={bd?.unit}
                />
                <button className="x-btn" onClick={() => removeBhp(i)}><Icon name="x" size={12} /></button>
              </div>
            );
          })}
          {bhpRows.length > 0 && (
            <div className="text-xs text-3 mt-2" style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--line-2)' }}>
              <Icon name="info" size={11} /> Stok BHP akan otomatis berkurang setelah disimpan
            </div>
          )}
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close}>Batal</button>
        <button className="btn primary" onClick={save}>
          <Icon name="check" size={13} strokeWidth={2.4} /> Simpan log
        </button>
      </div>
    </>
  );
}

// =========================================================
// BHP stock — Staf Lab
// =========================================================
function BHP() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);
  const [bhpData, setBhpData] = useState([]);

  useEffect(() => {
    async function loadBHP() {
      try {
        const result = await apiFetch('/bhp');
        setBhpData(result.data);
        dispatch({ type: 'SET_BHP', bhp: result.data });
      } catch (error) {
        console.error('Gagal mengambil data BHP:', error);
      }
    }
    loadBHP();
  }, [dispatch]);

  async function restock(id) {
    const b = bhpData.find(x => x.id === id);
    const amount = prompt(
      `Restock ${b.name} (stok: ${b.stock} ${b.unit})\nMasukkan jumlah:`,
      '10'
    );

    if (!amount) return;

    try {
      const newStock = parseFloat((parseFloat(b.stock) + parseFloat(amount)).toFixed(2));
      const today = new Date().toISOString().split('T')[0];

      await apiFetch(`/bhp/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock,
          last_in: today
        }),
      });

      setBhpData(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, stock: newStock, lastIn: today }
            : item
        )
      );

      dispatch({
        type: 'BHP_RESTOCK',
        id: id,
        amount: parseFloat(amount),
        date: today
      });

      toast(`+${amount} ${b.unit} ditambahkan`, 'ok');
    } catch (error) {
      console.error(error);
      toast('Gagal update stok', 'err');
    }
  }

  const filteredBhp = bhpData.filter(b => {
    if (!query) return true;
    const q = query.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.cat.toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Stok <em>BHP</em></h1>
          <p className="page-sub">Barang Habis Pakai · {bhpData.filter(b => b.stock <= b.min).length} item rendah dan perlu restock.</p>
        </div>
        <button className="btn primary" onClick={() => window.showToast && window.showToast('Form restock manual akan segera hadir', 'warn', 'info')}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Restock manual
        </button>
      </div>

      {query && filteredBhp.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada BHP cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="bhp-list" data-reveal>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 100px 1fr 100px 80px', gap: 14, padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
          <div>ID</div>
          <div>NAMA / KATEGORI</div>
          <div>STOK</div>
          <div>BAR</div>
          <div>TERAKHIR MASUK</div>
          <div>AKSI</div>
        </div>
        {filteredBhp.map(b => {
          const pct = Math.min(100, (b.stock / (b.min * 3)) * 100);
          const status = b.stock <= b.min ? 'low' : b.stock <= b.min * 1.5 ? 'warn' : 'ok';
          return (
            <div key={b.id} className={`bhp-row ${b.stock <= b.min ? 'low' : ''}`}>
              <div className="bhp-id">{b.id}</div>
              <div>
                <div className="bhp-name">{b.name}</div>
                <div className="bhp-cat">{b.cat}</div>
              </div>
              <div className="bhp-stock-v">{b.stock}<span className="bhp-unit" style={{ marginLeft: 4 }}>{b.unit}</span></div>
              <div>
                <div className={`bhp-stock-bar ${status === 'low' ? 'low' : status === 'warn' ? 'warn' : ''}`}>
                  <span style={{ width: pct + '%' }} />
                </div>
                <div className="text-3 mono text-xs mt-2">min: {b.min} {b.unit}</div>
              </div>
              <div className="text-3 mono text-xs">{b.lastIn}</div>
              <div className="flex gap-1">
                <button className="act-btn" onClick={() => restock(b.id)} title="Restock" aria-label={`Restock ${b.name}`}>
                  <Icon name="plus" size={12} strokeWidth={2.4} />
                </button>
                <button
                  className="act-btn"
                  onClick={async () => {
                    const amount = prompt(`Kurangi stok ${b.name}\nMasukkan jumlah:`, '10');
                    if (!amount) return;
                    try {
                      const newStock = parseFloat((parseFloat(b.stock) - parseFloat(amount)).toFixed(2));
                      await apiFetch(`/bhp/${b.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ stock: newStock })
                      });
                      setBhpData(prev => prev.map(item => item.id === b.id ? { ...item, stock: newStock } : item));
                      dispatch({ type: 'BHP_DELTA', id: b.id, delta: -parseFloat(amount) });
                      toast(`−${amount} ${b.unit}`, 'info');
                    } catch (error) {
                      console.error(error);
                      toast('Gagal update stok', 'err');
                    }
                  }}
                  title="−"
                  aria-label={`Kurangi stok ${b.name}`}
                >
                  <Icon name="minus" size={12} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { Maintenance, MaintenanceForm, BHP };
