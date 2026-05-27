import React, { useState, useEffect } from 'react';
import { useStore, D, QR, Icon, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { DraftDetail } from './DraftDetail.jsx';

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
  const opened = state.drafts.find(d => d.code === openCode && (d.status === 'finalized' || d.status === 'completed')) || queue[0];

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

export function AdminReceiveGrid({ draft, totals, onToggle }) {
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
