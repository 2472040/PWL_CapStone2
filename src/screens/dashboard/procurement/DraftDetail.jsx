import React, { useMemo } from 'react';
import { useStore, useToast, D, Icon } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { AdminReceiveGrid } from './ReceivingAdmin.jsx';

export function DraftDetail({ draft, onBack, mode }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const role = D.roles.find(r => r.id === mode);
  const locked = draft.status === 'finalized' || draft.status === 'completed';
  const d = draft;

  const totals = useMemo(() => {
    let inv = 0, bhp = 0, all = 0, approved = 0, received = 0;
    d.items.forEach(it => {
      const sub = it.qty * it.price; all += sub;
      if (it.kind === 'Inventaris') inv += sub; else bhp += sub;
      if (it.approval === 'ok') approved += sub;
      if (it.received) received += sub;
    });
    const ok = d.items.filter(it => it.approval === 'ok').length;
    const no = d.items.filter(it => it.approval === 'no').length;
    const pending = d.items.length - ok - no;
    const rec = d.items.filter(it => it.received).length;
    return { inv, bhp, all, approved, received, ok, no, pending, rec };
  }, [d]);

  async function approveAll() {
    try {
      const decisions = d.items.filter(it => !it.approval).map(it => ({
        item_id: it.id,
        status: 'approved'
      }));
      if (decisions.length > 0) {
        await apiFetch(`/procurement/drafts/${d.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decisions })
        });
      }
      dispatch({ type: 'APPROVE_ALL', code: d.code });
      toast('Semua item disetujui', 'ok');
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function finalize() {
    if (totals.pending > 0) {
      toast('Masih ada ' + totals.pending + ' item yang belum diputuskan', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/finalize`, { method: 'POST' });
      dispatch({ type: 'FINALIZE_DRAFT', code: d.code });
      toast('Draf difinalisasi & dikunci → Staf Admin', 'ok');
      onBack();
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function markReceived(itemId) {
    const item = d.items.find(it => it.id === itemId);
    if (!item.received) {
      try {
        await apiFetch(`/procurement/receiving`, {
          method: 'POST',
          body: JSON.stringify({
            draft_item_id: itemId,
            qty_received: item.qty,
            received_date: new Date().toISOString().substring(0, 10)
          })
        });
        dispatch({ type: 'MARK_RECEIVED', code: d.code, itemId, date: new Date().toLocaleDateString('id-ID') });
        toast('Status diperbarui', 'info');
      } catch (err) {
        toast(err.message, 'warn');
      }
    } else {
      toast('Item sudah diterima', 'info');
    }
  }

  async function setApproval(itemId, value) {
    try {
      const currentVal = d.items.find(it => it.id === itemId)?.approval;
      const newVal = currentVal === value ? null : value;
      const mappedVal = newVal === 'ok' ? 'approved' : newVal === 'no' ? 'rejected' : 'approved';
      
      if (newVal !== null) {
        await apiFetch(`/procurement/drafts/${d.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decisions: [{ item_id: itemId, status: mappedVal }] })
        });
      }
      dispatch({ type: 'SET_APPROVAL', code: d.code, itemId, value });
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini dari draf?')) return;
    try {
      await apiFetch(`/procurement/items/${itemId}`, { method: 'DELETE' });
      dispatch({ type: 'REMOVE_DRAFT_ITEM', code: d.code, itemId });
      toast('Item berhasil dihapus', 'ok');
    } catch (err) {
      toast('Gagal menghapus item: ' + err.message, 'warn');
    }
  }

  async function submitDraft() {
    try {
      await apiFetch(`/procurement/drafts/${d.id}/submit`, { method: 'POST' });
      
      const res = await apiFetch('/procurement/drafts');
      if (res.data) {
        const formatted = res.data.map(d => ({
          ...d,
          by: d.creator?.name || d.by || 'Kepala Lab',
          role: d.creator?.role || d.role || 'kalab',
          submitted: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
          items: d.items?.map(it => ({
            ...it,
            approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null,
            received: it.receivings && it.receivings.length > 0
          })) || []
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: formatted });
      }
      toast('Draf diajukan · menunggu Kaprodi', 'ok');
      onBack();
    } catch (err) {
      toast('Gagal mengajukan draf: ' + err.message, 'warn');
    }
  }

  async function completeReceiving() {
    if (totals.rec < d.items.filter(it => it.approval !== 'no').length) {
      toast('Masih ada item yang belum diterima', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/complete`, { method: 'POST' });
      dispatch({ type: 'COMPLETE_DRAFT', code: d.code });
      toast('Penerimaan diselesaikan', 'ok');
      onBack();
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div data-reveal className="mb-[18px]" >
        <button className="btn sm" onClick={onBack}><Icon name="chevL" size={12} /> Kembali</button>
      </div>

      <div className="page-head" data-reveal>
        <div>
          <div className="mono text-xs text-3 mb-2 tracking-[0.08em]" >{d.code}</div>
          <h1 className="page-title text-[30px]" >{d.title}</h1>
          <p className="page-sub">{d.by} · {d.role} · diajukan {d.submitted}</p>
        </div>
        <div className="flex gap-2 items-center" >
          {d.status === 'completed' && (
            <a href={`/api/procurement/drafts/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: 'var(--glass)', color: 'var(--green)', borderColor: 'rgba(163,230,53,0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="download" size={13} /> Cetak BAST (PDF)
            </a>
          )}
          {mode === 'kalab' && d.status === 'draft' && <>
            <span className="chip locked">Draft</span>
            <button className="btn primary" onClick={submitDraft}><Icon name="arrow" size={12} /> Ajukan ke Kaprodi</button>
          </>}
          {mode === 'kalab' && d.status === 'submitted' && <>
            <span className="chip warn"><span className="dot" /> Menunggu review Kaprodi</span>
          </>}
          {mode === 'kalab' && locked && <span className="chip locked">Locked · tidak bisa diubah</span>}
          {mode === 'kaprodi' && !locked && <>
            <span className="chip ok">{totals.ok} OK</span>
            <span className="chip danger">{totals.no} tolak</span>
            <span className="chip">{totals.pending} ?</span>
            {totals.pending > 0 ? (
              <button className="btn" onClick={approveAll}>Approve semua</button>
            ) : (
              <button className="btn primary" onClick={finalize}>
                <Icon name="check" size={13} strokeWidth={2.4} /> Finalisasi & kunci
              </button>
            )}
          </>}
          {mode === 'admin' && <>
            <span className="chip ok">Locked</span>
            <span className="chip info">{totals.rec}/{eligibleCount(d.items)} dilabeli</span>
            <button className="btn" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'labels' })}><Icon name="qr" size={13} /> Cetak label</button>
            {d.status === 'finalized' && <button className="btn primary" onClick={completeReceiving}>Selesaikan</button>}
          </>}
        </div>
      </div>

      {mode === 'admin' ? (
        <AdminReceiveGrid draft={d} totals={totals} onToggle={markReceived} />
      ) : (
        <KalabKaprodiItems draft={d} mode={mode} locked={locked} setApproval={setApproval} totals={totals} onRemoveItem={handleRemoveItem} />
      )}
    </div>
  );
}

function eligibleCount(items) {
  return items.filter(it => it.approval !== 'no').length;
}

export function KalabKaprodiItems({ draft, mode, locked, setApproval, totals, onRemoveItem }) {
  return (
    <>
      <div className="items-table with-actions" data-reveal>
        <div className="items-table-head">
          <div>TIPE</div>
          <div>ITEM</div>
          <div>QTY</div>
          <div className="ar">SUBTOTAL</div>
          <div className="ar">{mode === 'kaprodi' && !locked ? 'DECISION' : 'AKSI'}</div>
        </div>
        {draft.items.map(it => {
          const st = it.approval;
          return (
            <div key={it.id} className={`item-row ${st === 'ok' ? 'approved' : ''} ${st === 'no' ? 'rejected' : ''}`}>
              <div className={`item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>{it.kind === 'Inventaris' ? 'INV' : 'BHP'}</div>
              <div>
                <div className="item-name">{it.name}</div>
                <div className="item-sub">
                  <span className="mono">{it.id}</span>
                  <span>·</span>
                  <span>{it.link}</span>
                  {it.replaces && <><span>·</span><span className="replaces">↺ Ganti: {it.replaces}</span></>}
                </div>
              </div>
              <div className="item-qty">{it.qty} <span className="text-3">{it.unit}</span></div>
              <div>
                <div className="item-price">{window.fmtRp(it.qty * it.price)}</div>
                <div className="item-price"><span className="sub">@ {window.fmtRpShort(it.price)}</span></div>
              </div>
              <div className="item-actions">
                {mode === 'kaprodi' && !locked ? (
                  <>
                    <button className={`act-btn ${st === 'no' ? 'no-active' : ''}`} onClick={() => setApproval(it.id, 'no')} title="Tolak">
                      <Icon name="x" size={13} strokeWidth={2.4} />
                    </button>
                    <button className={`act-btn ${st === 'ok' ? 'ok-active' : ''}`} onClick={() => setApproval(it.id, 'ok')} title="Setujui">
                      <Icon name="check" size={13} strokeWidth={2.4} />
                    </button>
                  </>
                ) : (
                  <button className="act-btn" title="Detail"><Icon name="eye" size={12} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary-row" data-reveal>
        <div className="summary-tile">
          <div className="summary-tile-lbl">Total Inventaris</div>
          <div className="summary-tile-val violet">{window.fmtRpShort(totals.inv)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">Total BHP</div>
          <div className="summary-tile-val cyan">{window.fmtRpShort(totals.bhp)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">{mode === 'kaprodi' ? 'Disetujui' : 'Grand total'}</div>
          <div className="summary-tile-val green">{mode === 'kaprodi' ? window.fmtRpShort(totals.approved) : window.fmtRpShort(totals.all)}</div>
        </div>
        {mode === 'kaprodi' && (
          <div className="summary-tile">
            <div className="summary-tile-lbl">Δ Penghematan</div>
            <div className="summary-tile-val gold">{window.fmtRpShort(totals.all - totals.approved)}</div>
          </div>
        )}
      </div>
    </>
  );
}
