import React, { useState, useEffect } from 'react';
import { useStore, D, useSearch, Icon } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { DraftDetail } from './DraftDetail.jsx';
import { DraftCard } from './PengadaanKalab.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function HistoryKaprodi() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find((r) => r.id === 'kaprodi');

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await apiFetch('/procurement/history');
        const validDrafts = (res.data || []).map((d) => ({
          ...d,
          by: d.creator?.name || d.by,
          role: d.creator?.role || d.role,
          items:
            d.items?.map((it) => ({
              ...it,
              approval:
                it.approval?.status === 'approved'
                  ? 'ok'
                  : it.approval?.status === 'rejected'
                    ? 'no'
                    : null,
            })) || [],
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: validDrafts });
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }
    loadHistory();
  }, [dispatch]);

  const [yearFilter, setYearFilter] = useState('all');

  const reviewed = state.drafts.filter((d) => {
    if (d.status !== 'finalized' && d.status !== 'completed') return false;

    if (yearFilter !== 'all') {
      if (!d.submitted_at) return false;
      const y = String(new Date(d.submitted_at).getFullYear());
      if (y !== yearFilter) return false;
    }

    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.by && d.by.toLowerCase().includes(q))
    );
  });

  const years = [
    ...new Set(
      state.drafts
        .filter((d) => d.status === 'finalized' || d.status === 'completed')
        .map((d) => (d.submitted_at ? String(new Date(d.submitted_at).getFullYear()) : null))
    ),
  ]
    .filter(Boolean)
    .sort();

  const [openCode, setOpenCode] = useState(null);
  const opened = state.drafts.find((d) => d.code === openCode);

  return (
    <AnimatePresence mode="wait">
      {opened ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kaprodi" />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="page"
          style={{ '--role-accent': role.accent }}
        >
          <div className="page-head" data-reveal>
            <div>
              <h1 className="page-title">
                Riwayat <em>draf</em>
              </h1>
              <p className="page-sub">
                Draf yang sudah difinalisasi atau diselesaikan — tidak bisa diubah.
              </p>
            </div>
          </div>

          <div data-reveal className="flex flex-wrap gap-2 mb-[18px]">
            <select
              className="select sm"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              title="Filter tahun"
              style={{ width: '130px' }}
            >
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {query && reviewed.length === 0 && (
            <div className="empty" data-reveal>
              <div className="ico">
                <Icon name="search" size={20} />
              </div>
              <h4>Tidak ada riwayat cocok</h4>
              <div>Coba kata kunci lain atau sesuaikan filter.</div>
            </div>
          )}
          <div
            className="gap-[14px]"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            }}
            data-reveal-children
          >
            {reviewed.map((d) => (
              <DraftCard
                key={d.code}
                d={d}
                onClick={() => setOpenCode(d.code)}
                accent={role.accent}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
