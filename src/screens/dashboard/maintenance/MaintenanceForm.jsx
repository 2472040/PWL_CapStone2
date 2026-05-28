import React, { useState, useEffect } from 'react';
import { useStore, useToast, Icon, QR } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function MaintenanceForm({ payload, close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  
  const isEdit = !!payload?.dbId;
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assetCode, setAssetCode] = useState(payload?.asset || '');
  const [action, setAction] = useState(payload?.action || '');
  const [cond, setCond] = useState(payload?.cond || 'Baik');
  const [maintDate, setMaintDate] = useState(payload?.rawDate ? payload.rawDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [bhpRows, setBhpRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const asset = state.inventory.find(i => i.code === assetCode);

  useEffect(() => {
    if (isEdit && asset) {
      setSelectedRoomId(asset.roomId || '');
    }
  }, [isEdit, asset]);

  function addBhp() {
    const first = state.bhp[0];
    if (!first) { toast('Tidak ada data BHP tersedia', 'warn'); return; }
    setBhpRows(r => [...r, { id: first.id, qty: 1 }]);
  }
  function updateBhp(idx, patch) { setBhpRows(r => r.map((x, i) => i === idx ? { ...x, ...patch } : x)); }
  function removeBhp(idx) { setBhpRows(r => r.filter((_, i) => i !== idx)); }

  const filteredAssets = state.inventory.filter(i => String(i.roomId) === String(selectedRoomId));

  async function save() {
    if (!asset) { toast('Pilih aset dulu', 'warn'); return; }
    if (!action) { toast('Isi tindakan maintenance', 'warn'); return; }
    if (!maintDate) { toast('Pilih tanggal maintenance', 'warn'); return; }
    
    setLoading(true);
    try {
      const endpoint = isEdit ? `/maintenance/${payload.dbId}` : '/maintenance';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? {
        action,
        condition_after: cond,
        date: maintDate
      } : {
        inventory_id: asset.id,
        action,
        condition_after: cond,
        date: maintDate,
        bhp_used: bhpRows.map(b => {
          const bd = state.bhp.find(x => x.id === b.id);
          return {
            bhp_id: bd.dbId,
            qty: parseFloat(b.qty)
          };
        })
      };

      const res = await apiFetch(endpoint, {
        method: method,
        body: JSON.stringify(body)
      });

      if (res.data) {
        const resLogs = await apiFetch('/maintenance');
        if (resLogs.data) {
          const formattedLogs = resLogs.data.map(l => ({
            id: l.code || l.id,
            dbId: l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: l.date,
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
          dispatch({ type: 'SET_MAINT_LOGS', logs: formattedLogs });
        }
        const resBhp = await apiFetch('/bhp');
        if (resBhp.data) {
          const formattedBhp = resBhp.data.map(b => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General'
          }));
          dispatch({ type: 'SET_BHP', bhp: formattedBhp });
        }
        const updatedInventory = state.inventory.map(x => x.code !== asset.code ? x : ({ ...x, cond: cond, last: 'baru saja' }));
        dispatch({ type: 'SET_INVENTORY', inventory: updatedInventory });

        toast(isEdit ? 'Log maintenance berhasil diperbarui!' : 'Log maintenance disimpan ke database!', 'ok');
        close();
      }
    } catch (err) {
      toast('Gagal menyimpan log: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">{isEdit ? 'Ubah log maintenance' : 'Log maintenance baru'}</div>
        <button className="x-btn" onClick={close} disabled={loading}><Icon name="x" size={14} /></button>
      </div>
      <div className="drawer-body">
        <div className="field">
          <div className="field-lbl">Ruangan <span className="req">*</span></div>
          <select className="select" value={selectedRoomId} onChange={e => { setSelectedRoomId(e.target.value); setAssetCode(''); }} disabled={loading || isEdit}>
            <option value="">Pilih ruangan…</option>
            {state.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="field">
          <div className="field-lbl">Aset <span className="req">*</span></div>
          <select className="select" value={assetCode} onChange={e => setAssetCode(e.target.value)} disabled={loading || !selectedRoomId || isEdit}>
            <option value="">{selectedRoomId ? 'Pilih aset…' : 'Pilih ruangan terlebih dahulu'}</option>
            {filteredAssets.map(i => <option key={i.code} value={i.code}>{i.code} — {i.name}</option>)}
          </select>
        </div>

        {asset && (
          <div className="card compact mb-4 flex gap-3 items-center" >
            <QR seed={asset.code} size={7} />
            <div className="flex-1" >
              <div className="fw-5 text-sm">{asset.name}</div>
              <div className="text-xs text-3 mt-2">{asset.room} · kondisi saat ini: <span className={`cond ${asset.cond.toLowerCase().replace(' ', '-')}`}>{asset.cond}</span></div>
            </div>
          </div>
        )}

        <div className="field">
          <div className="field-lbl">Tanggal Maintenance <span className="req">*</span></div>
          <input className="input w-full" type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} disabled={loading} />
        </div>

        <div className="field">
          <div className="field-lbl">Tindakan <span className="req">*</span></div>
          <textarea className="textarea" value={action} onChange={e => setAction(e.target.value)} placeholder="Misal: Kalibrasi probe, cleaning kontak, ganti termal paste…" disabled={loading} />
        </div>

        <div className="field">
          <div className="field-lbl">Kondisi setelah maintenance</div>
          <div className="flex gap-1.5" >
            {['Baik', 'Perlu cek', 'Maintenance'].map(c => (
              <button key={c} disabled={loading} className={`btn sm ${cond === c ? 'primary' : ''}`} onClick={() => setCond(c)}>{c}</button>
            ))}
          </div>
        </div>

        {isEdit ? (
          <div className="field">
            <div className="field-lbl">BHP yang telah digunakan</div>
            {(!payload.bhp || payload.bhp.length === 0) ? (
              <div className="text-3 text-xs mono">// tidak ada BHP yang digunakan</div>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {payload.bhp.map((b, i) => (
                  <div key={i} className="text-xs px-3 py-2 bg-surface/50 border border-line-2 rounded flex justify-between">
                    <b>{b.id}</b>
                    <span className="mono text-rose">−{b.qty} {b.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="field">
            <div className="flex between aic mb-2">
              <div className="field-lbl">BHP yang dipakai</div>
              <button className="btn sm" onClick={addBhp} disabled={loading}><Icon name="plus" size={11} /> Tambah BHP</button>
            </div>
            {bhpRows.length === 0 && <div className="text-3 text-xs mono" style={{padding: '8px 0'}}>// tidak ada BHP yang dipakai</div>}
            {bhpRows.map((b, i) => {
              const bd = state.bhp.find(x => x.id === b.id);
              return (
                <div key={i} className="gap-2 grid mb-1.5" style={{ gridTemplateColumns: '1fr 100px auto' }} >
                  <select className="select" value={b.id} onChange={e => updateBhp(i, { id: e.target.value })} disabled={loading}>
                    {state.bhp.map(x => <option key={x.id} value={x.id}>{x.id} — {x.name} (stok: {x.stock} {x.unit})</option>)}
                  </select>
                  <input className="input mono" type="number" step="0.1" value={b.qty} onChange={e => updateBhp(i, { qty: e.target.value })} placeholder={bd?.unit} disabled={loading} />
                  <button className="x-btn" onClick={() => removeBhp(i)} disabled={loading}><Icon name="x" size={12} /></button>
                </div>
              );
            })}
            {bhpRows.length > 0 && (
              <div className="text-xs text-3 mt-2" style={{padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--line-2)'}}>
                <Icon name="info" size={11} /> Stok BHP akan otomatis berkurang setelah disimpan
              </div>
            )}
          </div>
        )}
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>Batal</button>
        <button className="btn primary" onClick={save} disabled={loading}><Icon name="check" size={13} strokeWidth={2.4} /> Simpan log</button>
      </div>
    </>
  );
}
