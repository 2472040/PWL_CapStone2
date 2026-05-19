import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, useToast, PageBar, PageHost, StatTile, D, Icon, QR, useSearch } from '../../components/app-shell.jsx';
// PENGADAAN — Kalab view: list of drafts + create
// =========================================================
function PengadaanKalab() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'kalab');
  const myDrafts = state.drafts.filter(d => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.by.toLowerCase().includes(q) || d.items.some(it => it.name.toLowerCase().includes(q));
  });
  const [openCode, setOpenCode] = useState(null);
  const opened = state.drafts.find(d => d.code === openCode);

  if (opened) return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kalab" />;

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Draf <em>pengadaan</em></h1>
          <p className="page-sub">Susun, ajukan, dan pantau status draf pengadaan tahunan. Draf yang sudah finalisasi tidak bisa diubah.</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newDraft' } })}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Buat draf baru
        </button>
      </div>

      {query && myDrafts.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada draf cocok</h4>
          <div>Coba kata kunci lain atau kosongkan pencarian.</div>
        </div>
      )}

      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}} data-reveal-children>
        {myDrafts.map(d => <DraftCard key={d.code} d={d} onClick={() => setOpenCode(d.code)} accent={role.accent} />)}
      </div>
    </div>
  );
}

function DraftCard({ d, onClick, accent }) {
  const total = d.items.reduce((s, it) => s + it.qty * it.price, 0);
  const approvedCount = d.items.filter(it => it.approval === 'ok').length;
  const receivedCount = d.items.filter(it => it.received).length;
  const pct = d.status === 'completed' ? 100 :
              d.status === 'finalized' ? 66 + (receivedCount / d.items.length) * 33 :
              d.status === 'submitted' ? 33 + (approvedCount / d.items.length) * 33 : 5;
  const statusChip = {
    submitted: <span className="chip warn"><span className="dot" /> Menunggu review</span>,
    finalized: <span className="chip info"><span className="dot" /> Disetujui</span>,
    completed: <span className="chip ok"><span className="dot" /> Selesai · terkunci</span>,
    draft:     <span className="chip locked">Draft</span>,
  }[d.status];

  return (
    <div className="draft-card tilt-card" data-reveal onClick={onClick} style={{'--role-accent': accent}}>
      <div className="tilt-shine" />
      <div className="draft-card-head">
        <div>
          <div className="draft-card-code">{d.code}</div>
          <div className="draft-card-title">{d.title}</div>
        </div>
        {statusChip}
      </div>
      <div className="mt-2 text-ink-3 text-xs" >{d.by} · {d.role}</div>
      <div className="flex items-baseline justify-between mt-3.5" >
        <div className="draft-card-totals">
          <span className="v mono">{window.fmtRpShort(total)}</span>
          <span className="l">· {d.items.length} item</span>
        </div>
        <span className="text-3 text-xs mono">{d.submitted}</span>
      </div>
      <div className="draft-card-progress" style={{'--p': pct + '%'}} />
    </div>
  );
}

// =========================================================
// PENGADAAN — Kaprodi review
// =========================================================
function ReviewKaprodi() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'kaprodi');
  const inbox = state.drafts.filter(d => {
    if (d.status !== 'submitted') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.by.toLowerCase().includes(q);
  });
  const [openCode, setOpenCode] = useState(inbox[0]?.code || null);
  const opened = state.drafts.find(d => d.code === openCode);

  if (!opened) return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Review <em>pengadaan</em></h1>
          <p className="page-sub">{query && inbox.length === 0 ? 'Tidak ada draf cocok dengan pencarian.' : 'Tidak ada draf yang menunggu review.'}</p>
        </div>
      </div>
    </div>
  );

  return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kaprodi" />;
}

// =========================================================
// PENGADAAN — Receiving (Admin)
// =========================================================
function ReceivingAdmin() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'admin');
  const queue = state.drafts.filter(d => {
    if (d.status !== 'finalized' && d.status !== 'completed') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.by.toLowerCase().includes(q);
  });
  const [openCode, setOpenCode] = useState(queue[0]?.code || null);
  const opened = state.drafts.find(d => d.code === openCode);

  if (!opened) return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Penerimaan barang</h1>
          <p className="page-sub">{query && queue.length === 0 ? 'Tidak ada penerimaan cocok dengan pencarian.' : 'Belum ada barang yang siap diterima.'}</p>
        </div>
      </div>
    </div>
  );

  return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="admin" />;
}

// =========================================================
// DRAFT DETAIL — adapts per mode (kalab/kaprodi/admin)
// =========================================================
function DraftDetail({ draft, onBack, mode }) {
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

  function approveAll() {
    dispatch({ type: 'APPROVE_ALL', code: d.code });
    toast('Semua item disetujui', 'ok');
  }
  function finalize() {
    if (totals.pending > 0) {
      toast('Masih ada ' + totals.pending + ' item yang belum diputuskan', 'warn');
      return;
    }
    dispatch({ type: 'FINALIZE_DRAFT', code: d.code });
    toast('Draf difinalisasi & dikunci → Staf Admin', 'ok');
  }
  function markReceived(itemId) {
    dispatch({ type: 'MARK_RECEIVED', code: d.code, itemId, date: new Date().toLocaleDateString('id-ID') });
    toast('Status diperbarui', 'info');
  }
  function setApproval(itemId, value) {
    dispatch({ type: 'SET_APPROVAL', code: d.code, itemId, value });
  }
  function submitDraft() {
    // for kalab demo — already submitted, but we can show toast
    toast('Draf sudah submitted, menunggu Kaprodi', 'info');
  }
  function completeReceiving() {
    if (totals.rec < d.items.filter(it => it.approval !== 'no').length) {
      toast('Masih ada item yang belum diterima', 'warn');
      return;
    }
    dispatch({ type: 'COMPLETE_DRAFT', code: d.code });
    toast('Penerimaan diselesaikan', 'ok');
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
          {mode === 'kalab' && !locked && <>
            <span className="chip warn"><span className="dot" /> Menunggu review Kaprodi</span>
            <button className="btn"><Icon name="edit" size={12} /> Ubah</button>
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
            <span className="chip info">{totals.rec}/{d.items.filter(it => it.approval !== 'no').length} dilabeli</span>
            <button className="btn"><Icon name="qr" size={13} /> Cetak label</button>
            {d.status === 'finalized' && <button className="btn primary" onClick={completeReceiving}>Selesaikan</button>}
          </>}
        </div>
      </div>

      {mode === 'admin' ? (
        <AdminReceiveGrid draft={d} totals={totals} onToggle={markReceived} />
      ) : (
        <KalabKaprodiItems draft={d} mode={mode} locked={locked} setApproval={setApproval} totals={totals} />
      )}
    </div>
  );
}

function KalabKaprodiItems({ draft, mode, locked, setApproval, totals }) {
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
                  <button className="act-btn" title="Edit"><Icon name="edit" size={12} /></button>
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

function AdminReceiveGrid({ draft, totals, onToggle }) {
  const eligible = draft.items.filter(it => it.approval !== 'no');
  return (
    <>
      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}>
        {eligible.map(it => {
          const isRec = it.received;
          const newCode = 'LK-' + (it.kind === 'Inventaris' ? 'NEW' : 'BHP') + '-' + it.id.replace(/-/g,'');
          return (
            <div key={it.id} data-reveal className="p-5 rounded-[18px]" style={{background: isRec ? 'rgba(163,230,53,0.1)' : '', border: '1px solid ' + (isRec ? 'rgba(163,230,53,0.3)' : 'var(--color-line)'), transition: 'all 0.25s'}}>
              <div className="flex items-start justify-between mb-3.5" >
                <div>
                  <div className={`item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'} mb-2`} >
                    {it.kind === 'Inventaris' ? 'INV' : 'BHP'}
                  </div>
                  <div className="mono text-xs text-3 tracking-[0.06em]" >{newCode}</div>
                </div>
                <QR seed={newCode + (isRec ? '!' : '')} size={7} />
              </div>
              <div className="leading-[1.3] mb-1.5 text-sm" >{it.name}</div>
              <div className="text-3 text-xs mono mb-4 tracking-[0.04em]" >{it.qty} {it.unit} · @ {window.fmtRpShort(it.price)}</div>
              {it.replaces && <div className="text-xs" style={{color: 'var(--gold)', marginBottom: 12}}>↺ {it.replaces}</div>}
              <button onClick={() => onToggle(it.id)} className={`btn ${isRec ? 'ok' : ''} justify-center`} >
                {isRec ? (
                  <><Icon name="check" size={13} strokeWidth={2.4} /> Diterima · {it.receivedDate || 'hari ini'}</>
                ) : 'Tandai diterima'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

// =========================================================
// History (Kaprodi)
// =========================================================
function HistoryKaprodi() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'kaprodi');
  const reviewed = state.drafts.filter(d => {
    if (d.status !== 'finalized' && d.status !== 'completed') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.by.toLowerCase().includes(q);
  });
  const [openCode, setOpenCode] = useState(null);
  const opened = state.drafts.find(d => d.code === openCode);
  if (opened) return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kaprodi" />;
  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Riwayat <em>draf</em></h1>
          <p className="page-sub">Draf yang sudah difinalisasi atau diselesaikan — tidak bisa diubah.</p>
        </div>
      </div>
      {query && reviewed.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada riwayat cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}
      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}} data-reveal-children>
        {reviewed.map(d => <DraftCard key={d.code} d={d} onClick={() => setOpenCode(d.code)} accent={role.accent} />)}
      </div>
    </div>
  );
}

export { PengadaanKalab, ReviewKaprodi, ReceivingAdmin, HistoryKaprodi };

