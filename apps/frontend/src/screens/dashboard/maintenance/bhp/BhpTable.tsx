import { Icon } from '../../../../components/app-shell';
import { BhpItem } from '../../../../store/store.types';

interface BhpTableProps {
  loadingList: boolean;
  filteredBhp: BhpItem[];
  role: string;
  dispatch: (action: any) => void;
  onReduceClick: (item: BhpItem) => void;
}

export function BhpTable({
  loadingList,
  filteredBhp,
  role,
  dispatch,
  onReduceClick,
}: BhpTableProps) {
  return (
    <div className="bhp-list" data-reveal>
      <div
        className=""
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 100px 1fr 100px 110px',
          gap: 14,
          padding: '12px 18px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid var(--color-line)',
          fontSize: 10.5,
          fontWeight: 600,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <div>ID</div>
        <div>NAMA / KATEGORI</div>
        <div>STOK</div>
        <div>BAR</div>
        <div>TERAKHIR MASUK</div>
        <div>AKSI</div>
      </div>
      {loadingList ? (
        Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="skeleton-row shimmer"
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 100px 1fr 100px 110px',
              gap: 14,
              padding: '12px 18px',
              alignItems: 'center',
              height: 'auto',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  width: '120px',
                  height: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  width: '60px',
                  height: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '3px',
                }}
              />
            </div>
            <div
              style={{
                width: '40px',
                height: '14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                width: '30px',
                height: '24px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
              }}
            />
          </div>
        ))
      ) : filteredBhp.length === 0 ? (
        <div
          className="empty"
          style={{
            padding: '48px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="ico"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Icon name="search" size={20} />
          </div>
          <h4>Tidak ada BHP cocok</h4>
          <div className="text-3" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            Coba ubah kata kunci pencarian atau filter tanggal.
          </div>
        </div>
      ) : (
        filteredBhp.map((b: BhpItem) => {
          const pct = Math.min(100, (b.stock / (b.min * 3)) * 100);
          const status = b.stock <= b.min ? 'low' : b.stock <= b.min * 1.5 ? 'warn' : 'ok';
          return (
            <div key={b.id} className={`bhp-row ${b.stock <= b.min ? 'low' : ''}`}>
              <div className="bhp-id">{b.id}</div>
              <div>
                <div className="bhp-name">{b.name}</div>
                <div className="bhp-cat">
                  {b.cat} · {b.roomName || 'Gudang'}
                </div>
              </div>
              <div className="bhp-stock-v">
                {b.stock}
                <span className="bhp-unit" style={{ marginLeft: 4 }}>
                  {b.unit}
                </span>
              </div>
              <div>
                <div
                  className={`bhp-stock-bar ${status === 'low' ? 'low' : status === 'warn' ? 'warn' : ''}`}
                >
                  <span className="" style={{ width: pct + '%' }} />
                </div>
                <div className="text-3 mono text-xs mt-2">
                  min: {b.min} {b.unit}
                </div>
              </div>
              <div className="text-3 mono text-xs">{b.lastIn}</div>
              <div className="flex gap-1">
                <button
                  className="act-btn text-violet hover:bg-violet/10"
                  style={{ color: '#a855f7' }}
                  onClick={() =>
                    dispatch({
                      type: 'OPEN_MODAL',
                      modal: {
                        kind: 'aiPredictive',
                        payload: { bhpId: b.dbId, bhpName: b.name },
                      },
                    })
                  }
                  title="AI Predictive Analysis"
                >
                  <Icon name="bolt" size={12} strokeWidth={2.4} />
                </button>
                {role === 'staflab' && (
                  <>
                    <button
                      className="act-btn"
                      onClick={() => onReduceClick(b)}
                      title="Kurangi Stok"
                      aria-label={`Kurangi stok ${b.name}`}
                    >
                      <Icon name="minus" size={12} strokeWidth={2.4} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
