import React, { useState } from 'react';
import { Icon } from './app-shell.jsx';

export function FinancialChart({ data }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartData = data && data.length > 0 ? data : [
    { month: 'Jan', requested: 15000000, approved: 12000000, saved: 3000000 },
    { month: 'Feb', requested: 25000000, approved: 20000000, saved: 5000000 },
    { month: 'Mar', requested: 18000000, approved: 15000000, saved: 3000000 },
    { month: 'Apr', requested: 30000000, approved: 22000000, saved: 8000000 },
    { month: 'Mei', requested: 22000000, approved: 19000000, saved: 3000000 },
    { month: 'Jun', requested: 35000000, approved: 28000000, saved: 7000000 }
  ];

  // Calculations for dynamic SVG sizing
  const width = 500;
  const height = 220;
  const padding = 35;
  
  const maxVal = Math.max(...chartData.map(d => Math.max(d.requested, d.approved, 1000000)));
  const getX = (idx) => padding + (idx / (chartData.length - 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - (val / maxVal) * (height - 2 * padding);

  const formatRpShort = (val) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
    return `Rp ${(val / 1000).toFixed(0)}rb`;
  };

  const formatRpLong = (val) => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const handleMouseMove = (e, idx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({ x, y });
    setActiveIdx(idx);
  };

  return (
    <div className="card glow relative overflow-visible" style={{ '--role-accent': 'var(--color-violet)' }}>
      <div className="flex between aic mb-5">
        <div>
          <span className="text-3 text-xs mono tracking-[0.1em] uppercase">— Data Analitik</span>
          <h3 className="text-xl fw-5 mt-1 tracking-tight">Tren Keuangan Pengadaan (MySQL)</h3>
        </div>
        <div className="flex gap-4 text-xs font-semibold">
          <div className="flex gap-1.5 items-center"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#a855f7' }} /> <span className="text-ink-3">Pengajuan</span></div>
          <div className="flex gap-1.5 items-center"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} /> <span className="text-ink-3">Disetujui</span></div>
          <div className="flex gap-1.5 items-center"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#eab308' }} /> <span className="text-ink-3">Penghematan</span></div>
        </div>
      </div>

      <div className="relative w-full h-[220px] select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="requestedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <line x1={padding} y1={(height - 2*padding)/2 + padding} x2={width - padding} y2={(height - 2*padding)/2 + padding} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />

          {/* Area under charts (Requested) */}
          <path
            d={`
              M ${getX(0)} ${height - padding}
              ${chartData.map((d, i) => `L ${getX(i)} ${getY(d.requested)}`).join(' ')}
              L ${getX(chartData.length - 1)} ${height - padding} Z
            `}
            fill="url(#requestedGrad)"
          />

          {/* Area under charts (Approved) */}
          <path
            d={`
              M ${getX(0)} ${height - padding}
              ${chartData.map((d, i) => `L ${getX(i)} ${getY(d.approved)}`).join(' ')}
              L ${getX(chartData.length - 1)} ${height - padding} Z
            `}
            fill="url(#approvedGrad)"
          />

          {/* Grid axis labels */}
          <text x={padding - 5} y={padding + 4} fill="rgba(255,255,255,0.25)" fontSize={7.5} fontFamily="monospace" textAnchor="end">{formatRpShort(maxVal)}</text>
          <text x={padding - 5} y={(height - 2*padding)/2 + padding + 3} fill="rgba(255,255,255,0.25)" fontSize={7.5} fontFamily="monospace" textAnchor="end">{formatRpShort(maxVal / 2)}</text>
          <text x={padding - 5} y={height - padding + 3} fill="rgba(255,255,255,0.25)" fontSize={7.5} fontFamily="monospace" textAnchor="end">Rp 0</text>

          {/* Sparklines (Requested) */}
          <path
            d={chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.requested)}`).join(' ')}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2}
          />

          {/* Sparklines (Approved) */}
          <path
            d={chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.approved)}`).join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Interactive vertical hover indicator */}
          {activeIdx !== null && (
            <line
              x1={getX(activeIdx)}
              y1={padding}
              x2={getX(activeIdx)}
              y2={height - padding}
              stroke="rgba(168,85,247,0.3)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          )}

          {/* Data Points circles */}
          {chartData.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.requested)} r={activeIdx === i ? 5 : 3.5} fill="#a855f7" stroke="var(--color-surface)" strokeWidth={activeIdx === i ? 2 : 1} />
              <circle cx={getX(i)} cy={getY(d.approved)} r={activeIdx === i ? 5 : 3.5} fill="#22c55e" stroke="var(--color-surface)" strokeWidth={activeIdx === i ? 2 : 1} />
              <circle cx={getX(i)} cy={getY(d.requested - d.approved)} r={activeIdx === i ? 4.5 : 3} fill="#eab308" stroke="var(--color-surface)" strokeWidth={activeIdx === i ? 1.5 : 1} />
              
              {/* Invisible interactive column hover zones */}
              <rect
                x={getX(i) - 20}
                y={padding}
                width={40}
                height={height - 2 * padding}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => handleMouseMove(e, i)}
                onMouseLeave={() => setActiveIdx(null)}
              />

              {/* Month label */}
              <text x={getX(i)} y={height - padding + 15} fill={activeIdx === i ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)'} fontSize={8.5} fontWeight={activeIdx === i ? 'bold' : 'normal'} textAnchor="middle">{d.month}</text>
            </g>
          ))}
        </svg>

        {/* Hovering Glassmorphic Tooltip */}
        {activeIdx !== null && (
          <div
            className="absolute rounded-lg border border-line p-3 select-none flex flex-col gap-1.5 shadow-xl transition-all duration-75 pointer-events-none z-[100]"
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y - 45,
              background: 'rgba(20,20,30,0.85)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255,255,255,0.08)',
              minWidth: '150px'
            }}
          >
            <div className="text-[10px] text-ink-3 uppercase font-bold tracking-wider mb-0.5">{`Bulan ${chartData[activeIdx].month}`}</div>
            <div className="flex justify-between items-center text-xs gap-3">
              <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: '#a855f7' }} /> Pengajuan:</span>
              <span className="mono font-semibold text-ink">{formatRpLong(chartData[activeIdx].requested)}</span>
            </div>
            <div className="flex justify-between items-center text-xs gap-3">
              <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: '#22c55e' }} /> Disetujui:</span>
              <span className="mono font-semibold text-green">{formatRpLong(chartData[activeIdx].approved)}</span>
            </div>
            <div className="flex justify-between items-center text-xs gap-3 border-t border-surface pt-1.5 mt-0.5">
              <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: '#eab308' }} /> Penghematan:</span>
              <span className="mono font-semibold text-gold">{formatRpLong(chartData[activeIdx].saved)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
