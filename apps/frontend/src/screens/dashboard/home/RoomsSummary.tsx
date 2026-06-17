import type { Room } from '../../../store/store.types';

interface RoomsSummaryProps {
  rooms: Room[];
}

export function RoomsSummary({ rooms }: RoomsSummaryProps) {
  return (
    <div className="card">
      <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">— Ringkasan ruangan</div>
      <h3 className="text-xl fw-5 mb-4 tracking-tight">{rooms.length} laboratorium</h3>
      <div
        className="flex flex-col gap-4 overflow-y-auto"
        style={{ maxHeight: '250px', paddingRight: '6px', marginTop: '4px' }}
      >
        {rooms.map((r) => {
          const pct = Math.min(100, ((Number(r.assets) || 0) / 35) * 100);
          return (
            <div key={r.code} className="flex flex-col gap-2">
              <div className="flex between aic">
                <div className="text-[13px]">
                  <b>{r.name}</b> <span className="text-3 mono text-xs">· {r.code}</span>
                </div>
                <div className="mono text-xs text-2">{r.assets || 0} aset</div>
              </div>
              <div
                className="h-[3px] w-full"
                style={{ background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}
              >
                <div
                  className="rounded-sm"
                  style={{
                    height: '100%',
                    width: pct + '%',
                    background: 'linear-gradient(90deg, var(--color-violet), var(--color-cyan))',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
