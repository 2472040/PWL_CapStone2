import { Icon } from '../../../../components/app-shell';

interface DraftActionsPanelProps {
  d: any;
  mode: string;
  locked: boolean;
  totals: any;
  submitDraft: () => void;
  requestRevision: () => void;
  approveAll: () => void;
  finalize: () => void;
  completeReceiving: () => void;
  navigate: (path: string) => void;
  eligibleCount: (items: any) => number;
}

export function DraftActionsPanel({
  d,
  mode,
  locked,
  totals,
  submitDraft,
  requestRevision,
  approveAll,
  finalize,
  completeReceiving,
  navigate,
  eligibleCount,
}: DraftActionsPanelProps) {
  return (
    <div className="flex gap-2 items-center">
      {d.status === 'completed' && (
        <a
          href={`/api/procurement/drafts/${d.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            background: 'var(--glass)',
            color: 'var(--green)',
            borderColor: 'rgba(163,230,53,0.3)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Icon name="download" size={13} /> Cetak BAST (PDF)
        </a>
      )}
      {(mode === 'kalab' || mode === 'staflab') &&
        (d.status === 'draft' || d.status === 'revision') && (
          <>
            <span className="chip locked">
              {d.status === 'revision' ? 'Butuh Revisi' : 'Draft'}
            </span>
            <button className="btn primary" onClick={submitDraft}>
              <Icon name="arrow" size={12} />{' '}
              {d.status === 'revision' ? 'Ajukan Ulang ke Kaprodi' : 'Ajukan ke Kaprodi'}
            </button>
          </>
        )}
      {(mode === 'kalab' || mode === 'staflab') && d.status === 'submitted' && (
        <>
          <span className="chip warn">
            <span className="dot" /> Menunggu review Kaprodi
          </span>
          <span
            className="chip locked"
            style={{
              background: 'rgba(251,191,36,0.08)',
              borderColor: 'rgba(251,191,36,0.25)',
              color: 'var(--color-gold)',
              boxShadow: '0 0 12px rgba(251,191,36,0.15)',
            }}
          >
            Locked · tidak bisa diubah
          </span>
        </>
      )}
      {(mode === 'kalab' || mode === 'staflab') &&
        (d.status === 'finalized' || d.status === 'completed') && (
          <span className="chip locked">Locked · tidak bisa diubah</span>
        )}
      {mode === 'kaprodi' && d.status === 'submitted' && (
        <button
          className="btn font-semibold text-rose border-rose/30 bg-rose/5 hover:bg-rose/10"
          onClick={requestRevision}
        >
          <Icon name="x" size={12} /> Minta Revisi
        </button>
      )}
      {mode === 'kaprodi' && !locked && (
        <>
          <span className="chip ok">{totals.ok} OK</span>
          <span className="chip danger">{totals.no} tolak</span>
          <span className="chip">{totals.pending} ?</span>
          {totals.pending > 0 ? (
            <button className="btn" onClick={approveAll}>
              Approve semua
            </button>
          ) : (
            <button className="btn primary" onClick={finalize}>
              <Icon name="check" size={13} strokeWidth={2.4} /> Finalisasi & kunci
            </button>
          )}
        </>
      )}
      {mode === 'admin' && (
        <>
          <span className="chip ok">Locked</span>
          <span className="chip info">
            {totals.rec}/{eligibleCount(d.items)} dilabeli
          </span>
          <button className="btn" onClick={() => navigate('/dashboard/labels')}>
            <Icon name="qr" size={13} /> Cetak label
          </button>
          {d.status === 'finalized' && (
            <button className="btn primary" onClick={completeReceiving}>
              Selesaikan
            </button>
          )}
        </>
      )}
    </div>
  );
}
