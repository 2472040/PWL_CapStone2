import React, { useState, useEffect } from 'react';
import { useStore, D, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
import { DraftDetail } from './DraftDetail.jsx';

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
