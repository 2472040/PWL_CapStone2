import type { InventoryItem } from '../../../store/store.types';

interface AssetConditionProps {
  inventory: InventoryItem[];
}

export function AssetCondition({ inventory }: AssetConditionProps) {
  const baikCount = inventory.filter((i) => i.cond === 'Baik').length;
  const cekCount = inventory.filter((i) => i.cond === 'Perlu cek').length;
  const maintCount = inventory.filter((i) => i.cond === 'Maintenance').length;
  const totalItems = baikCount + cekCount + maintCount || 1;
  const pctBaik = (baikCount / totalItems) * 100;
  const pctCek = (cekCount / totalItems) * 100;
  const pctMaint = (maintCount / totalItems) * 100;

  return (
    <div className="card">
      <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">— Kondisi Aset</div>
      <h3 className="text-xl fw-5 mb-4 tracking-tight">Distribusi Kondisi</h3>

      <div className="flex flex-col sm:flex-row gap-5 items-center justify-center py-2 h-full">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="3"
            />

            {/* Segments */}
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3.6"
              strokeDasharray={`${pctBaik} ${100 - pctBaik}`}
              strokeDashoffset="0"
              className="transition-all duration-500 ease-out"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#eab308"
              strokeWidth="3.6"
              strokeDasharray={`${pctCek} ${100 - pctCek}`}
              strokeDashoffset={-pctBaik}
              className="transition-all duration-500 ease-out"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#a855f7"
              strokeWidth="3.6"
              strokeDasharray={`${pctMaint} ${100 - pctMaint}`}
              strokeDashoffset={-(pctBaik + pctCek)}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-xl fw-6 mono" style={{ color: 'var(--color-ink)' }}>
              {inventory.length}
            </div>
            <div className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">
              Total
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2.5 w-full">
          <div className="flex justify-between items-center text-xs">
            <div className="flex gap-2 items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} />{' '}
              <b>Baik</b>
            </div>
            <span className="mono text-ink-3">
              {baikCount} ({pctBaik.toFixed(0)}%)
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex gap-2 items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#eab308' }} />{' '}
              <b>Perlu cek</b>
            </div>
            <span className="mono text-ink-3">
              {cekCount} ({pctCek.toFixed(0)}%)
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex gap-2 items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#a855f7' }} />{' '}
              <b>Maintenance</b>
            </div>
            <span className="mono text-ink-3">
              {maintCount} ({pctMaint.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
