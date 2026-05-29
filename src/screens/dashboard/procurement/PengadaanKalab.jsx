import React, { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { DraftDetail } from './DraftDetail.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function PengadaanKalab() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'kalab');
  const toast = useToast();

  useEffect(() => {
    async function loadDrafts() {
      try {
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
      } catch (err) {
        toast('Gagal memuat data draf: ' + err.message, 'warn');
      }
    }
    loadDrafts();
  }, [dispatch, toast]);

  const myDrafts = state.drafts.filter(d => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.by && d.by.toLowerCase().includes(q)) || d.items.some(it => it.name.toLowerCase().includes(q));
  });
  const [openCode, setOpenCode] = useState(null);
  const opened = state.drafts.find(d => d.code === openCode);

  return (
    <AnimatePresence mode="wait">
      {opened ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kalab" />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, y: -15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="page"
          style={{ '--role-accent': role.accent }}
        >
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

          <div className="gap-[14px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }} data-reveal-children>
            {myDrafts.map(d => (
              <DraftCard key={d.code} d={d} onClick={() => setOpenCode(d.code)} accent={role.accent} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DraftCard({ d, onClick, accent }) {
  const total = d.items.reduce((s, it) => s + it.qty * it.price, 0);
  const approvedCount = d.items.filter(it => it.approval === 'ok').length;
  const receivedCount = d.items.filter(it => it.received).length;
  const pct = d.status === 'completed' ? 100 :
              d.status === 'finalized' ? 66 + (receivedCount / d.items.length) * 33 :
              d.status === 'submitted' ? 33 + (approvedCount / d.items.length) * 33 : 
              d.status === 'revision' ? 10 : 5;
  const statusChip = {
    submitted: <span className="chip warn"><span className="dot" /> Menunggu review</span>,
    finalized: <span className="chip info"><span className="dot" /> Disetujui</span>,
    completed: <span className="chip ok"><span className="dot" /> Selesai · terkunci</span>,
    draft:     <span className="chip locked">Draft</span>,
    revision:  <span className="chip danger"><span className="dot" /> Butuh Revisi</span>,
  }[d.status];

  return (
    <div 
      className="draft-card tilt-card" 
      data-reveal 
      onClick={onClick} 
      style={{'--role-accent': accent, cursor: 'pointer'}}
    >
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
