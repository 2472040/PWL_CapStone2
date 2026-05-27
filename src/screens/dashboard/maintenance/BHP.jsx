import React, { useEffect } from 'react';
import { useStore, useToast, Icon, D, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function BHP() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);

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

  async function restock(id) {
    const b = state.bhp.find(x => x.id === id);
    const amount = prompt(`Restock ${b.name} (stok: ${b.stock} ${b.unit})\nMasukkan jumlah:`, '10');
    if (!amount) return;
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0) return;

    try {
      const res = await apiFetch(`/bhp/${b.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: b.stock + addAmt,
          last_in: new Date().toISOString().substring(0, 10)
        })
      });
      if (res.data) {
        dispatch({ type: 'BHP_RESTOCK', id, amount: addAmt, date: new Date().toISOString().slice(0, 10) });
        toast(`+${addAmt} ${b.unit} ditambahkan`, 'ok');
      }
    } catch (err) {
      toast('Gagal melakukan restock: ' + err.message, 'warn');
    }
  }

  async function decrement(id) {
    const b = state.bhp.find(x => x.id === id);
    const newStock = Math.max(0, b.stock - 1);
    try {
      const res = await apiFetch(`/bhp/${b.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock
        })
      });
      if (res.data) {
        dispatch({ type: 'BHP_DELTA', id, delta: -1 });
        toast(`−1 ${b.unit}`, 'info');
      }
    } catch (err) {
      toast('Gagal mengurangi stok: ' + err.message, 'warn');
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
        <button className="btn primary" onClick={() => window.showToast && window.showToast('Form restock manual akan segera hadir', 'warn', 'info')}><Icon name="plus" size={13} strokeWidth={2.4} /> Restock manual</button>
      </div>

      {query && filteredBhp.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada BHP cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="bhp-list" data-reveal>
        <div className="" style={{display: 'grid', gridTemplateColumns: '90px 1fr 100px 1fr 100px 80px', gap: 14, padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace'}}>
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
                <button className="act-btn" onClick={() => restock(b.id)} title="Restock" aria-label={`Restock ${b.name}`}><Icon name="plus" size={12} strokeWidth={2.4} /></button>
                <button className="act-btn" onClick={() => decrement(b.id)} title="−1" aria-label={`Kurangi 1 ${b.unit} ${b.name}`}><Icon name="minus" size={12} strokeWidth={2.4} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
