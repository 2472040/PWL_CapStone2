import React, { useState, useEffect } from 'react';
import {
  useStore,
  useToast,
  D,
  Icon,
  useSearch,
  CustomSelect,
} from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { DraftDetail } from './DraftDetail';
import { motion, AnimatePresence } from 'framer-motion';

const monthOptions = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export function PengadaanKalab() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find((r: any) => r.id === state.role) || { accent: 'var(--color-violet)' };
  const toast = useToast();

  useEffect(() => {
    async function loadDrafts() {
      try {
        const res = await apiFetch('/procurement/drafts');
        if (res.data) {
          const formatted = res.data.map((draftObj: any) => ({
            ...draftObj,
            by: draftObj.creator?.name || draftObj.by || 'Kepala Lab',
            role: draftObj.creator?.role || draftObj.role || 'kalab',
            submitted: draftObj.submitted_at
              ? new Date(draftObj.submitted_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '-',
            items:
              draftObj.items?.map((it: any) => ({
                ...it,
                approval:
                  it.approval?.status === 'approved'
                    ? 'ok'
                    : it.approval?.status === 'rejected'
                      ? 'no'
                      : null,
                received: it.receivings && it.receivings.length > 0,
              })) || [],
          }));
          dispatch({ type: 'SET_DRAFTS', drafts: formatted });
        }
      } catch (err: any) {
        toast('Gagal memuat data draf: ' + err.message, 'warn');
      }
    }
    loadDrafts();
  }, [dispatch, toast]);

  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  const myDrafts = state.drafts
    .filter((d: any) => {
      if (yearFilter !== 'all' || monthFilter !== 'all') {
        if (!d.submitted_at) return false;
        const dateObj = new Date(d.submitted_at);
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = String(dateObj.getFullYear());
        if (yearFilter !== 'all' && y !== yearFilter) return false;
        if (monthFilter !== 'all' && m !== monthFilter) return false;
      }

      if (!query) return true;
      const q = query.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.by && d.by.toLowerCase().includes(q)) ||
        d.items.some((it: any) => it.name.toLowerCase().includes(q))
      );
    })
    .sort((a: any, b: any) => {
      const dateA = a.submitted_at
        ? new Date(a.submitted_at).getTime()
        : a.created_at
          ? new Date(a.created_at).getTime()
          : 0;
      const dateB = b.submitted_at
        ? new Date(b.submitted_at).getTime()
        : b.created_at
          ? new Date(b.created_at).getTime()
          : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const years = [
    ...new Set(
      state.drafts.map((d: any) =>
        d.submitted_at ? String(new Date(d.submitted_at).getFullYear()) : null
      )
    ),
  ]
    .filter(Boolean)
    .sort();

  const [openCode, setOpenCode] = useState<string | null>(null);
  const opened = state.drafts.find((d: any) => d.code === openCode);

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
          <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode={state.role} />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="page"
          style={{ '--role-accent': role.accent } as React.CSSProperties}
        >
          <div className="page-head" data-reveal>
            <div>
              <h1 className="page-title">
                Draf <em>pengadaan</em>
              </h1>
              <p className="page-sub">
                Susun, ajukan, dan pantau status draf pengadaan tahunan. Draf yang sudah finalisasi
                tidak bisa diubah.
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newDraft' } })}
            >
              <Icon name="plus" size={13} strokeWidth={2.4} /> Buat draf baru
            </button>
          </div>

          <div data-reveal className="flex flex-wrap gap-2 mb-[18px]">
            <CustomSelect
              value={monthFilter}
              onChange={setMonthFilter}
              options={monthOptions}
              style={{ width: '130px' }}
              placeholder="Semua Bulan"
            />
            <CustomSelect
              value={yearFilter}
              onChange={setYearFilter}
              options={[
                { value: 'all', label: 'Semua Tahun' },
                ...years.map((y: any) => ({ value: y, label: y })),
              ]}
              style={{ width: '130px' }}
              placeholder="Semua Tahun"
            />
            <button
              className="btn sm"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={
                sortOrder === 'asc' ? 'Urutan: Terlama → Terbaru' : 'Urutan: Terbaru → Terlama'
              }
              style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 'fit-content' }}
            >
              <Icon
                name={sortOrder === 'asc' ? 'arrowUp' : 'arrowDown'}
                size={13}
                strokeWidth={2}
              />
              {sortOrder === 'asc' ? 'Terlama' : 'Terbaru'}
            </button>
          </div>

          {query && myDrafts.length === 0 && (
            <div className="empty" data-reveal>
              <div className="ico">
                <Icon name="search" size={20} />
              </div>
              <h4>Tidak ada draf cocok</h4>
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
            {myDrafts.map((d: any) => (
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

interface DraftCardProps {
  d: any;
  onClick: () => void;
  accent: string;
}

export function DraftCard({ d, onClick, accent }: DraftCardProps) {
  const total = d.items.reduce((s: number, it: any) => s + it.qty * it.price, 0);
  const approvedCount = d.items.filter((it: any) => it.approval === 'ok').length;
  const receivedCount = d.items.filter((it: any) => it.received).length;
  const pct =
    d.status === 'completed'
      ? 100
      : d.status === 'finalized'
        ? 66 + (receivedCount / d.items.length) * 33
        : d.status === 'submitted'
          ? 33 + (approvedCount / d.items.length) * 33
          : d.status === 'revision'
            ? 10
            : 5;
  const statusChip = {
    submitted: (
      <span className="chip warn">
        <span className="dot" /> Menunggu review
      </span>
    ),
    finalized: (
      <span className="chip info">
        <span className="dot" /> Disetujui
      </span>
    ),
    completed: (
      <span className="chip ok">
        <span className="dot" /> Selesai · terkunci
      </span>
    ),
    draft: <span className="chip locked">Draft</span>,
    revision: (
      <span className="chip danger">
        <span className="dot" /> Butuh Revisi
      </span>
    ),
  }[d.status as 'submitted' | 'finalized' | 'completed' | 'draft' | 'revision'];

  const win = window as any;

  return (
    <div
      className="draft-card tilt-card"
      data-reveal
      onClick={onClick}
      style={{ '--role-accent': accent, cursor: 'pointer' } as React.CSSProperties}
    >
      <div className="tilt-shine" />
      <div className="draft-card-head">
        <div>
          <div className="draft-card-code">{d.code}</div>
          <div className="draft-card-title">{d.title}</div>
        </div>
        {statusChip}
      </div>
      <div className="mt-2 text-ink-3 text-xs">
        {d.by} · {d.role}
      </div>
      <div className="flex items-baseline justify-between mt-3.5">
        <div className="draft-card-totals">
          <span className="v mono">{win.fmtRpShort(total)}</span>
          <span className="l">· {d.items.length} item</span>
        </div>
        <span className="text-3 text-xs mono">{d.submitted}</span>
      </div>
      <div className="draft-card-progress" style={{ '--p': pct + '%' } as React.CSSProperties} />
    </div>
  );
}
