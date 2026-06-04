import React, { useState, useEffect } from 'react';
import { useStore, D, QR, Icon, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { DraftDetail } from './DraftDetail.jsx';
import { DraftCard } from './PengadaanKalab.jsx';

export function ReceivingAdmin() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'admin');
  
  useEffect(() => {
    async function loadReceiving() {
      try {
        const res = await apiFetch('/procurement/receiving');
        const validDrafts = (res.data || []).map(d => ({
          ...d,
          by: d.creator?.name || d.by,
          role: d.creator?.role || d.role,
          items: d.items?.map(it => ({
            ...it,
            approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null,
            received: it.receivings && it.receivings.length > 0,
            receivedDate: it.receivings && it.receivings.length > 0 ? new Date(it.receivings[0].received_date).toLocaleDateString('id-ID') : null
          })) || []
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: validDrafts });
      } catch (err) {
        console.error('Failed to load receiving drafts:', err);
      }
    }
    loadReceiving();
  }, [dispatch]);

  const queue = state.drafts.filter(d => {
    if (d.status !== 'finalized' && d.status !== 'completed') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.by && d.by.toLowerCase().includes(q));
  });
  
  const [openCode, setOpenCode] = useState(null);

  if (openCode) {
    const opened = state.drafts.find(d => d.code === openCode && (d.status === 'finalized' || d.status === 'completed'));
    if (opened) {
      return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="admin" />;
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Penerimaan barang</h1>
          <p className="page-sub">Terima barang fisik dari draf pengadaan yang telah difinalisasi, catat aset baru, dan cetak label inventaris.</p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name={query ? "search" : "box"} size={20} /></div>
          <h4>{query ? 'Tidak ada penerimaan cocok' : 'Tidak ada penerimaan'}</h4>
          <div>{query ? 'Coba kata kunci lain atau kosongkan pencarian.' : 'Belum ada barang yang siap diterima.'}</div>
        </div>
      ) : (
        <div className="gap-[14px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }} data-reveal-children>
          {queue.map(d => (
            <DraftCard key={d.code} d={d} onClick={() => setOpenCode(d.code)} accent={role.accent} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminReceiveGrid({ draft, totals, onToggle }) {
  const [openForms, setOpenForms] = useState({});
  const [formsData, setFormsData] = useState({});

  const eligible = draft.items.filter(it => it.approval !== 'no');

  const handleOpenForm = (id) => {
    setOpenForms(prev => ({ ...prev, [id]: true }));
    setFormsData(prev => ({ ...prev, [id]: { received_date: new Date().toISOString().substring(0, 10), code: '', qr_photo: null } }));
  };

  const handleCancelForm = (id) => {
    setOpenForms(prev => ({ ...prev, [id]: false }));
  };

  const handleChange = (id, field, value) => {
    setFormsData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleFileChange = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => handleChange(id, 'qr_photo', e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (id) => {
    const data = formsData[id];
    const item = eligible.find(it => it.id === id);
    if (item.kind === 'Inventaris' && (!data.code || !data.qr_photo)) {
      alert('Untuk inventaris, Penomoran Label Aset dan Foto QR/Barcode wajib diisi.');
      return;
    }
    onToggle(id, data);
  };

  return (
    <>
      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}>
        {eligible.map(it => {
          const isRec = it.received;
          const showForm = openForms[it.id];
          const data = formsData[it.id] || {};

          return (
            <div key={it.id} data-reveal className="p-5 rounded-[18px]" style={{background: isRec ? 'rgba(163,230,53,0.1)' : '', border: '1px solid ' + (isRec ? 'rgba(163,230,53,0.3)' : 'var(--color-line)'), transition: 'all 0.25s'}}>
              <div className="flex items-start justify-between mb-3.5" >
                <div>
                  <div className={`item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'} mb-2`} >
                    {it.kind === 'Inventaris' ? 'INV' : 'BHP'}
                  </div>
                  {isRec && <div className="mono text-xs text-3 tracking-[0.06em]" >DITERIMA</div>}
                </div>
              </div>
              <div className="leading-[1.3] mb-1.5 text-sm" >{it.name}</div>
              <div className="text-3 text-xs mono mb-4 tracking-[0.04em]" >{it.qty} {it.unit} · @ {window.fmtRpShort(it.price)}</div>
              {it.replaces && <div className="text-xs" style={{color: 'var(--gold)', marginBottom: 12}}>↺ {it.replaces}</div>}
              
              {!isRec && !showForm && (
                <button onClick={() => handleOpenForm(it.id)} className="btn justify-center" >
                  Tandai diterima
                </button>
              )}

              {isRec && (
                <div className="btn ok justify-center" >
                  <Icon name="check" size={13} strokeWidth={2.4} /> Diterima · {it.receivedDate || 'hari ini'}
                </div>
              )}

              {showForm && !isRec && (
                <div className="mt-4 p-3 rounded-xl" style={{background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'}}>
                  <div className="mb-3">
                    <label className="text-xs text-3 mb-1 block">Tanggal Terima</label>
                    <input type="date" className="inp w-full" value={data.received_date || ''} onChange={e => handleChange(it.id, 'received_date', e.target.value)} />
                  </div>
                  {it.kind === 'Inventaris' && (
                    <>
                      <div className="mb-3">
                        <label className="text-xs text-3 mb-1 block">Penomoran Label Aset</label>
                        <input type="text" className="inp w-full" placeholder="Cth: INV/2026/001" value={data.code || ''} onChange={e => handleChange(it.id, 'code', e.target.value)} />
                      </div>
                      <div className="mb-4">
                        <label className="text-xs text-3 mb-1 block">Foto QR / Barcode</label>
                        <input type="file" accept="image/*" className="inp w-full text-xs" onChange={e => handleFileChange(it.id, e.target.files[0])} />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <button className="btn primary flex-1 justify-center" onClick={() => handleSubmit(it.id)}>Simpan</button>
                    <button className="btn flex-1 justify-center" onClick={() => handleCancelForm(it.id)}>Batal</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
