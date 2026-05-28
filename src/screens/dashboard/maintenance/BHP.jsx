import React, { useEffect, useState } from 'react';
import { useStore, useToast, Icon, D, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function BHP() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);

  const [reductionItem, setReductionItem] = useState(null);
  const [reductionQty, setReductionQty] = useState('');
  const [reductionReason, setReductionReason] = useState('');
  const [reducing, setReducing] = useState(false);

  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockReason, setRestockReason] = useState('');
  const [restocking, setRestocking] = useState(false);

  useEffect(() => {
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
    loadBhpData();
  }, [dispatch]);

  async function submitRestock() {
    if (!restockQty || isNaN(parseFloat(restockQty)) || parseFloat(restockQty) <= 0) {
      toast('Jumlah penambahan tidak valid!', 'warn');
      return;
    }
    if (!restockReason.trim()) {
      toast('Keterangan sumber barang wajib diisi!', 'warn');
      return;
    }

    setRestocking(true);
    try {
      const qty = parseFloat(restockQty);
      const newStock = restockItem.stock + qty;

      const res = await apiFetch(`/bhp/${restockItem.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock,
          last_in: new Date().toISOString().substring(0, 10),
          reason: restockReason.trim()
        })
      });
      if (res.data) {
        dispatch({ type: 'BHP_RESTOCK', id: restockItem.id, amount: qty, date: new Date().toISOString().slice(0, 10) });
        toast(`+${qty} ${restockItem.unit} (${restockItem.name}) berhasil ditambahkan`, 'ok');
        setRestockItem(null);
      }
    } catch (err) {
      toast('Gagal melakukan restock: ' + err.message, 'warn');
    } finally {
      setRestocking(false);
    }
  }

  async function submitReduction() {
    if (!reductionQty || isNaN(parseFloat(reductionQty)) || parseFloat(reductionQty) <= 0) {
      toast('Jumlah pengurangan tidak valid!', 'warn');
      return;
    }
    if (parseFloat(reductionQty) > reductionItem.stock) {
      toast(`Jumlah melebihi stok yang ada (${reductionItem.stock} ${reductionItem.unit})!`, 'warn');
      return;
    }
    if (!reductionReason.trim()) {
      toast('Keterangan keperluan wajib diisi!', 'warn');
      return;
    }

    setReducing(true);
    try {
      const qty = parseFloat(reductionQty);
      const newStock = Math.max(0, reductionItem.stock - qty);
      
      const res = await apiFetch(`/bhp/${reductionItem.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock,
          reason: reductionReason.trim()
        })
      });
      
      if (res.data) {
        dispatch({ type: 'BHP_DELTA', id: reductionItem.id, delta: -qty });
        toast(`−${qty} ${reductionItem.unit} (${reductionItem.name}) berhasil dikurangi`, 'ok');
        setReductionItem(null);
      }
    } catch (err) {
      toast('Gagal mengurangi stok: ' + err.message, 'warn');
    } finally {
      setReducing(false);
    }
  }

  const filteredBhp = state.bhp.filter(b => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (b.name || '').toLowerCase().includes(q) || (b.id || '').toLowerCase().includes(q) || (b.cat || '').toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{'--role-accent': role ? role.accent : undefined}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Stok <em>BHP</em></h1>
          <p className="page-sub">Barang Habis Pakai · {state.bhp.filter(b => b.stock <= b.min).length} item rendah dan perlu restock.</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newBhp' } })}><Icon name="plus" size={13} strokeWidth={2.4} /> Restock manual</button>
      </div>

      {query && filteredBhp.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada BHP cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="bhp-list" data-reveal>
        <div className="" style={{display: 'grid', gridTemplateColumns: '90px 1fr 100px 1fr 100px 110px', gap: 14, padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace'}}>
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
              <div className="bhp-stock-v">{b.stock}<span className="bhp-unit" style={{marginLeft: 4}}>{b.unit}</span></div>
              <div>
                <div className={`bhp-stock-bar ${status === 'low' ? 'low' : status === 'warn' ? 'warn' : ''}`}><span className="" style={{width: pct + '%'}} /></div>
                <div className="text-3 mono text-xs mt-2">min: {b.min} {b.unit}</div>
              </div>
              <div className="text-3 mono text-xs">{b.lastIn}</div>
              <div className="flex gap-1" >
                <button className="act-btn text-violet hover:bg-violet/10" style={{ color: '#a855f7' }} onClick={() => dispatch({ type: 'OPEN_MODAL', modal: { kind: 'aiPredictive', payload: { bhpId: b.dbId, bhpName: b.name } } })} title="AI Predictive Analysis"><Icon name="bolt" size={12} strokeWidth={2.4} /></button>
                <button className="act-btn" onClick={() => { setRestockItem(b); setRestockQty(''); setRestockReason(''); }} title="Tambah Stok" aria-label={`Tambah stok ${b.name}`}><Icon name="plus" size={12} strokeWidth={2.4} /></button>
                <button className="act-btn" onClick={() => { setReductionItem(b); setReductionQty('1'); setReductionReason(''); }} title="Kurangi Stok" aria-label={`Kurangi stok ${b.name}`}><Icon name="minus" size={12} strokeWidth={2.4} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reduction Modal ── */}
      {reductionItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#111113',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fade-in 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '90%',
            maxWidth: '440px',
            background: 'var(--surface)',
            border: '1px solid var(--line-2)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            borderRadius: '16px',
            padding: '28px',
            animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}>
              <div style={{width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <Icon name="minus" size={20} strokeWidth={2.4} />
              </div>
              <div>
                <h3 style={{fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em'}}>Pengurangan Stok BHP</h3>
                <p style={{fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0', lineHeight: 1.5}}>Kurangi stok <b>{reductionItem.name}</b> · Stok saat ini: <b>{reductionItem.stock} {reductionItem.unit}</b></p>
              </div>
            </div>
            
            <div className="field" style={{marginBottom: 14}}>
              <label className="field-lbl">Jumlah Pengurangan ({reductionItem.unit}) <span className="req">*</span></label>
              <input 
                className="input" 
                type="number" 
                step="any" 
                min="0.1" 
                max={reductionItem.stock}
                value={reductionQty} 
                onChange={e => setReductionQty(e.target.value)} 
                placeholder={`Maksimal ${reductionItem.stock} ${reductionItem.unit}`} 
                disabled={reducing}
                autoFocus 
                style={{width: '100%'}}
              />
            </div>
            
            <div className="field" style={{marginBottom: 24}}>
              <label className="field-lbl">Keterangan / Keperluan Penggunaan <span className="req">*</span></label>
              <textarea 
                className="textarea" 
                value={reductionReason} 
                onChange={e => setReductionReason(e.target.value)} 
                placeholder="Contoh: Digunakan untuk bahan praktikum Jaringan Komputer Kelas B" 
                disabled={reducing}
                rows={3}
                style={{width: '100%'}}
              />
            </div>
            
            <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--line)'}}>
              <button className="btn" onClick={() => setReductionItem(null)} disabled={reducing}>Batal</button>
              <button className="btn danger" onClick={submitReduction} disabled={reducing}>
                {reducing ? 'Mengurangi...' : 'Kurangi Stok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock (Addition) Modal ── */}
      {restockItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#111113',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fade-in 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '90%',
            maxWidth: '440px',
            background: 'var(--surface)',
            border: '1px solid var(--line-2)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            borderRadius: '16px',
            padding: '28px',
            animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}>
              <div style={{width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <Icon name="plus" size={20} strokeWidth={2.4} />
              </div>
              <div>
                <h3 style={{fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em'}}>Penambahan Stok BHP</h3>
                <p style={{fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0', lineHeight: 1.5}}>Tambah stok <b>{restockItem.name}</b> · Stok saat ini: <b>{restockItem.stock} {restockItem.unit}</b></p>
              </div>
            </div>
            
            <div className="field" style={{marginBottom: 14}}>
              <label className="field-lbl">Jumlah Penambahan ({restockItem.unit}) <span className="req">*</span></label>
              <input 
                className="input" 
                type="number" 
                step="any" 
                min="0.1" 
                value={restockQty} 
                onChange={e => setRestockQty(e.target.value)} 
                placeholder="Misal: 50" 
                disabled={restocking}
                autoFocus 
                style={{width: '100%'}}
              />
            </div>
            
            <div className="field" style={{marginBottom: 24}}>
              <label className="field-lbl">Keterangan / Sumber Barang <span className="req">*</span></label>
              <textarea 
                className="textarea" 
                value={restockReason} 
                onChange={e => setRestockReason(e.target.value)} 
                placeholder="Contoh: Pengadaan semester ganjil 2025/2026, PO #12345" 
                disabled={restocking}
                rows={3}
                style={{width: '100%'}}
              />
            </div>
            
            <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--line)'}}>
              <button className="btn" onClick={() => setRestockItem(null)} disabled={restocking}>Batal</button>
              <button className="btn primary" onClick={submitRestock} disabled={restocking}>
                {restocking ? 'Menambahkan...' : 'Tambah Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NewBhpForm({ payload, close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  
  const [mode, setMode] = useState('restock'); // 'restock' or 'new'
  const [loading, setLoading] = useState(false);

  // Mode Restock
  const [selectedId, setSelectedId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [drawerReason, setDrawerReason] = useState('');

  // Mode New
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [category, setCategory] = useState('General');

  // Pre-fill if payload is provided
  useEffect(() => {
    if (payload?.bhpId) {
      setMode('restock');
      setSelectedId(payload.bhpId);
    }
  }, [payload]);

  const categories = ['General', 'Networking', 'Fabrikasi', 'Workstation', 'Instrumen', 'Embedded'];

  async function handleSave() {
    setLoading(true);
    try {
      if (mode === 'restock') {
        if (!selectedId) {
          toast('Silakan pilih item BHP.', 'warn');
          setLoading(false);
          return;
        }
        const qty = parseFloat(restockQty);
        if (isNaN(qty) || qty <= 0) {
          toast('Jumlah restock harus lebih besar dari 0.', 'warn');
          setLoading(false);
          return;
        }
        const b = state.bhp.find(x => x.id === selectedId);
        if (!b) {
          toast('Item BHP tidak ditemukan.', 'warn');
          setLoading(false);
          return;
        }

        const res = await apiFetch(`/bhp/${b.dbId}`, {
          method: 'PUT',
          body: JSON.stringify({
            stock: b.stock + qty,
            last_in: new Date().toISOString().substring(0, 10),
            reason: drawerReason.trim() || 'Restock manual via drawer'
          })
        });

        if (res.data) {
          dispatch({ type: 'BHP_RESTOCK', id: selectedId, amount: qty, date: new Date().toISOString().slice(0, 10) });
          toast(`+${qty} ${b.unit} ${b.name} ditambahkan`, 'ok');
          close();
        }
      } else {
        // Mode New
        if (!code || !name || !unit) {
          toast('Kode, Nama, dan Satuan wajib diisi.', 'warn');
          setLoading(false);
          return;
        }

        // Check if code already exists
        const exists = state.bhp.some(x => x.id.toLowerCase() === code.toLowerCase());
        if (exists) {
          toast(`Kode BHP "${code}" sudah terdaftar.`, 'warn');
          setLoading(false);
          return;
        }

        const res = await apiFetch('/bhp', {
          method: 'POST',
          body: JSON.stringify({
            code,
            name,
            unit,
            stock: parseFloat(stock) || 0,
            min_stock: parseFloat(minStock) || 0,
            category,
            last_in: stock ? new Date().toISOString().substring(0, 10) : null
          })
        });

        if (res.data) {
          const b = res.data;
          const formattedNewItem = {
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General'
          };
          dispatch({ type: 'SET_BHP', bhp: [...state.bhp, formattedNewItem] });
          toast(`BHP "${name}" berhasil ditambahkan.`, 'ok');
          close();
        }
      }
    } catch (err) {
      toast('Gagal memproses manual restock: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">Restock Manual BHP</div>
        <button className="x-btn" onClick={close} disabled={loading}><Icon name="x" size={14} /></button>
      </div>

      <div className="drawer-body">
        {/* Toggle mode */}
        <div className="flex gap-1.5 p-1 bg-surface border border-line rounded-lg mb-4" style={{ background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 10 }}>
          <button 
            type="button" 
            className={`btn sm flex-1 ${mode === 'restock' ? 'primary' : 'ghost'}`} 
            onClick={() => setMode('restock')}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            Restock Item Terdaftar
          </button>
          <button 
            type="button" 
            className={`btn sm flex-1 ${mode === 'new' ? 'primary' : 'ghost'}`} 
            onClick={() => setMode('new')}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            Tambah Item Baru
          </button>
        </div>

        {mode === 'restock' ? (
          <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <div className="field-lbl">Pilih Item BHP <span className="req">*</span></div>
              <select 
                className="select" 
                value={selectedId} 
                onChange={e => setSelectedId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Pilih Barang --</option>
                {state.bhp.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} - {b.name} (Stok: {b.stock} {b.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="field">
              <div className="field-lbl">Jumlah Ditambahkan <span className="req">*</span></div>
              <div className="flex gap-2 items-center" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="number" 
                  className="input" 
                  value={restockQty} 
                  onChange={e => setRestockQty(e.target.value)} 
                  placeholder="Misal: 50" 
                  disabled={loading} 
                />
                <span className="text-sm font-semibold mono color-ink-3" style={{ opacity: 0.5, fontFamily: 'monospace' }}>
                  {selectedId ? state.bhp.find(x => x.id === selectedId)?.unit : ''}
                </span>
              </div>
            </div>

            <div className="field">
              <div className="field-lbl">Keterangan / Sumber Barang</div>
              <textarea 
                className="textarea" 
                value={drawerReason} 
                onChange={e => setDrawerReason(e.target.value)} 
                placeholder="Contoh: Pengadaan semester ganjil 2025/2026" 
                disabled={loading}
                rows={2}
                style={{width: '100%'}}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="field-lbl">Kode BHP <span className="req">*</span></div>
                <input 
                  type="text" 
                  className="input" 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  placeholder="B-011" 
                  disabled={loading} 
                />
              </div>
              <div className="field">
                <div className="field-lbl">Kategori</div>
                <select 
                  className="select" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  disabled={loading}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <div className="field-lbl">Nama Barang <span className="req">*</span></div>
              <input 
                type="text" 
                className="input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Misal: Solder Tin 1.0mm Goot" 
                disabled={loading} 
              />
            </div>

            <div className="grid grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="field-lbl">Stok Awal</div>
                <input 
                  type="number" 
                  className="input" 
                  value={stock} 
                  onChange={e => setStock(e.target.value)} 
                  placeholder="0" 
                  disabled={loading} 
                />
              </div>
              <div className="field">
                <div className="field-lbl">Batas Min</div>
                <input 
                  type="number" 
                  className="input" 
                  value={minStock} 
                  onChange={e => setMinStock(e.target.value)} 
                  placeholder="10" 
                  disabled={loading} 
                />
              </div>
              <div className="field">
                <div className="field-lbl">Satuan <span className="req">*</span></div>
                <input 
                  type="text" 
                  className="input" 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  placeholder="pcs / roll" 
                  disabled={loading} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>Batal</button>
        <button className="btn primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Memproses...' : 'Simpan'}
        </button>
      </div>
    </>
  );
}
