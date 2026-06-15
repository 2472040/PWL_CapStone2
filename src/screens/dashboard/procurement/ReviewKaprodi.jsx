import React, { useState, useEffect, useMemo } from 'react';
import { useStore, D, useSearch, useToast, Icon } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api';
import { DraftDetail } from './DraftDetail.jsx';

function formatThousand(val) {
  if (!val) return '0';
  return Number(val).toLocaleString('id-ID');
}

export function ReviewKaprodi() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find((r) => r.id === 'kaprodi');
  const toast = useToast();

  useEffect(() => {
    async function loadReviewDrafts() {
      try {
        const res = await apiFetch('/procurement/review');
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
        console.error('Failed to load drafts:', err);
      }
    }
    loadReviewDrafts();
  }, [dispatch]);

  const inbox = state.drafts.filter((d) => {
    if (d.status !== 'submitted') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.by && d.by.toLowerCase().includes(q))
    );
  });

  const [openCode, setOpenCode] = useState(null);

  if (openCode) {
    const opened = state.drafts.find((d) => d.code === openCode && d.status === 'submitted');
    if (opened) {
      return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="kaprodi" />;
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">
            Review <em>pengadaan</em>
          </h1>
          <p className="page-sub">
            Review draf pengadaan yang diajukan oleh Kepala Laboratorium. Approve atau tolak item,
            dan finalisasi draf.
          </p>
        </div>
      </div>

      {inbox.length === 0 ? (
        <div className="empty" data-reveal>
          <div className="ico">
            <Icon name={query ? 'search' : 'check'} size={20} />
          </div>
          <h4>{query ? 'Tidak ada draf cocok' : 'Tidak ada draf'}</h4>
          <div>
            {query
              ? 'Coba kata kunci lain atau kosongkan pencarian.'
              : 'Tidak ada draf yang menunggu review.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-reveal-children>
          {inbox.map((d) => (
            <ReviewCard
              key={d.code}
              d={d}
              accent={role.accent}
              toast={toast}
              dispatch={dispatch}
              onOpen={() => setOpenCode(d.code)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ d, accent, toast, dispatch, onOpen }) {
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    let all = 0,
      approved = 0;
    d.items.forEach((it) => {
      const sub = it.qty * it.price;
      all += sub;
      if (it.approval === 'ok') approved += sub;
    });
    const ok = d.items.filter((it) => it.approval === 'ok').length;
    const no = d.items.filter((it) => it.approval === 'no').length;
    const pending = d.items.length - ok - no;
    return { all, approved, ok, no, pending };
  }, [d]);

  async function handleApproveReject(itemId, status) {
    try {
      setLoading(true);
      await apiFetch(`/procurement/drafts/${d.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          decisions: [{ item_id: itemId, status: status }],
        }),
      });
      dispatch({
        type: 'ITEM_APPROVAL',
        draftId: d.id,
        itemId,
        status: status === 'approved' ? 'ok' : 'no',
      });
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  async function approveAll() {
    try {
      setLoading(true);
      const decisions = d.items
        .filter((it) => !it.approval)
        .map((it) => ({
          item_id: it.id,
          status: 'approved',
        }));
      if (decisions.length > 0) {
        await apiFetch(`/procurement/drafts/${d.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decisions }),
        });
      }
      dispatch({ type: 'APPROVE_ALL', code: d.code });
      toast('Semua item disetujui', 'ok');
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  async function finalize() {
    if (totals.pending > 0) {
      toast(`Masih ada ${totals.pending} item yang belum diputuskan`, 'warn');
      return;
    }
    try {
      setLoading(true);
      await apiFetch(`/procurement/drafts/${d.id}/finalize`, { method: 'POST' });
      dispatch({ type: 'FINALIZE_DRAFT', code: d.code });
      toast('Draf difinalisasi & dikunci', 'ok');
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{ '--role-accent': accent, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: 'var(--role-accent)',
        }}
      />
      <div className="flex between aic mb-4">
        <div>
          <div className="flex gap-2 items-center mb-1">
            <span className="mono text-xs fw-6 text-3">{d.code}</span>
            <span className="chip warn">
              <span className="dot" /> Menunggu review
            </span>
          </div>
          <h3
            className="text-xl fw-5 tracking-tight cursor-pointer hover:underline"
            onClick={onOpen}
          >
            {d.title}
          </h3>
          <div className="text-sm text-ink-3 mt-1">
            Diajukan oleh: <b>{d.by}</b> pada{' '}
            {d.submitted_at
              ? new Date(d.submitted_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-3 mono mb-1">TOTAL AJUAN</div>
          <div className="text-xl fw-6 font-mono tracking-tight text-ink">
            Rp {formatThousand(totals.all)}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-md border border-line-2 overflow-hidden mb-4">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-xs text-3 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium w-32">Harga Satuan</th>
              <th className="px-3 py-2 font-medium w-16 text-center">Qty</th>
              <th className="px-3 py-2 font-medium w-32 text-right">Subtotal</th>
              <th className="px-3 py-2 font-medium w-40 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-2/50">
            {d.items.map((it) => (
              <tr key={it.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="fw-5">{it.name}</div>
                  <div className="text-xs text-3 flex gap-2 items-center mt-0.5">
                    <span className="chip text-[10px] py-0">{it.kind}</span>
                    {it.link && (
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline flex items-center gap-1"
                      >
                        <Icon name="external-link" size={10} /> Link
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 mono text-xs">Rp {formatThousand(it.price)}</td>
                <td className="px-3 py-2.5 text-center">{it.qty}</td>
                <td className="px-3 py-2.5 mono text-xs text-right fw-5">
                  Rp {formatThousand(it.qty * it.price)}
                </td>
                <td className="px-3 py-2.5">
                  {it.approval === 'ok' ? (
                    <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-xs fw-5">
                      <Icon name="check" size={12} /> Disetujui
                    </div>
                  ) : it.approval === 'no' ? (
                    <div className="flex items-center justify-center gap-1.5 text-rose-500 text-xs fw-5">
                      <Icon name="x" size={12} /> Ditolak
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-center">
                      <button
                        className="btn sm ok w-full justify-center"
                        onClick={() => handleApproveReject(it.id, 'approved')}
                        disabled={loading}
                        title="Setujui"
                      >
                        <Icon name="check" size={12} />
                      </button>
                      <button
                        className="btn sm danger w-full justify-center"
                        onClick={() => handleApproveReject(it.id, 'rejected')}
                        disabled={loading}
                        title="Tolak"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-line-2">
        <div className="text-sm">
          <span className="text-emerald-500 fw-6">{totals.ok} disetujui</span> ·{' '}
          <span className="text-rose-500 fw-6">{totals.no} ditolak</span> ·{' '}
          <span className="text-amber-500 fw-6">{totals.pending} pending</span>
        </div>
        <div className="flex gap-2">
          {totals.pending > 0 && (
            <button className="btn outline" onClick={approveAll} disabled={loading}>
              <Icon name="check-circle" size={14} /> Setujui Semua
            </button>
          )}
          <button
            className={`btn ${totals.pending === 0 ? 'primary' : ''}`}
            onClick={finalize}
            disabled={loading || totals.pending > 0}
          >
            <Icon name="send" size={14} /> Finalisasi Draf
          </button>
        </div>
      </div>
    </div>
  );
}
