import React, { useState, useEffect } from 'react';
import { useStore, D, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { DraftDetail } from './DraftDetail.jsx';
import { DraftCard } from './PengadaanKalab.jsx';

export function ReviewKaprodi() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find(r => r.id === 'kaprodi');
  
  useEffect(() => {
    async function loadReviewDrafts() {
      try {
        const res = await apiFetch('/procurement/review');
        const validDrafts = (res.data || []).map(d => ({
          ...d,
          by: d.creator?.name || d.by,
          role: d.creator?.role || d.role,
          items: d.items?.map(it => ({
            ...it,
            approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null
          })) || []
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: validDrafts });
      } catch (err) {
        console.error('Failed to load drafts:', err);
      }
    }
    loadReviewDrafts();
  }, [dispatch]);

  const inbox = state.drafts.filter(d => {
    if (d.status !== 'submitted') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.by && d.by.toLowerCase().includes(q));
  });
  const [openCode, setOpenCode] = useState(null);
  const opened = state.drafts.find(d => d.code === openCode && d.status === 'submitted') || inbox[0];

  if (openCode) {
    const opened = state.drafts.find(d => d.code === openCode && d.status === 'submitted');
    if (opened) {
      return (
        <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kaprodi" />
      );
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Review <em>pengadaan</em></h1>
          <p className="page-sub">Review draf pengadaan yang diajukan oleh Kepala Laboratorium. Approve atau tolak item, dan finalisasi draf.</p>
        </div>
      </div>

      {inbox.length === 0 ? (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name={query ? "search" : "check"} size={20} /></div>
          <h4>{query ? 'Tidak ada draf cocok' : 'Tidak ada draf'}</h4>
          <div>{query ? 'Coba kata kunci lain atau kosongkan pencarian.' : 'Tidak ada draf yang menunggu review.'}</div>
        </div>
      ) : (
        <div className="gap-[14px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }} data-reveal-children>
          {inbox.map(d => (
            <DraftCard key={d.code} d={d} onClick={() => setOpenCode(d.code)} accent={role.accent} />
          ))}
        </div>
      )}
    </div>
  );
}
