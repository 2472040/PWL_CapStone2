import { Icon, QR } from '../../../../components/app-shell';

interface InventoryGridProps {
  loading: boolean;
  filtered: any[];
  dispatch: (action: any) => void;
}

export function InventoryGrid({ loading, filtered, dispatch }: InventoryGridProps) {
  return (
    <div className="inv-grid" data-reveal>
      {loading ? (
        Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="skeleton-card shimmer">
            <div
              className="flex between aic"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '100px',
                  height: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div
              style={{
                width: '80%',
                height: '20px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                marginTop: '12px',
              }}
            />
            <div
              style={{
                width: '50%',
                height: '14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                marginTop: '8px',
              }}
            />
            <div
              style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div
                style={{
                  height: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        ))
      ) : filtered.length === 0 ? (
        <div
          className="empty"
          style={{
            gridColumn: '1 / -1',
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
          <h4>Aset tidak ditemukan</h4>
          <div className="text-3" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            Coba ubah kata kunci pencarian atau filter kategori.
          </div>
        </div>
      ) : (
        filtered.map((it: any) => (
          <div
            key={it.code}
            className="inv-card tilt-card"
            onClick={() =>
              dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'inventory', payload: it } })
            }
          >
            <div className="tilt-shine" />
            <div className="inv-card-head">
              <div>
                <div className="inv-code">{it.code}</div>
              </div>
              <QR seed={it.code} size={7} />
            </div>
            <div className="inv-name">{it.name}</div>
            <div className="inv-spec">
              {it.cat} · {it.specs}
            </div>
            <div className="inv-meta">
              <div className="inv-meta-row">
                <span className="k">Ruangan</span>
                <span className="v">{it.room}</span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Kondisi</span>
                <span>
                  <span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>
                    {it.cond}
                  </span>
                </span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Terakhir digunakan</span>
                <span className="v mono text-xs">{it.last}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
