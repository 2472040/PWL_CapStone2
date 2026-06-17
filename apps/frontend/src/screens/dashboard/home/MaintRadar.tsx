import React from 'react';
import type { DashboardStats } from '../../../store/store.types';

interface MaintRadarProps {
  dashboardData: DashboardStats | null;
  stateRole: string;
}

export function MaintRadar({ dashboardData, stateRole }: MaintRadarProps) {
  if (stateRole !== 'staflab' && stateRole !== 'kalab') {
    return null;
  }

  return (
    <div
      className="card mt-6"
      data-reveal
      style={{ '--role-accent': 'var(--color-violet)' } as React.CSSProperties}
    >
      <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
        — Beban Kerusakan Ruangan
      </div>
      <h3 className="text-xl fw-5 mb-4 tracking-tight">Radar Pemeliharaan Lab (MySQL)</h3>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        {dashboardData?.maintLoadByRoom && dashboardData.maintLoadByRoom.length > 0 ? (
          dashboardData.maintLoadByRoom.map((r, idx: number) => {
            const isHighest = idx === 0;
            return (
              <div
                key={r.code}
                className="card compact flex flex-col justify-between"
                style={{
                  background: isHighest ? 'rgba(167, 139, 250, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: isHighest
                    ? '1px solid rgba(167, 139, 250, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'default',
                }}
              >
                <div className="flex between items-start">
                  <div className="mono text-[10px] text-3 uppercase tracking-wider font-semibold">
                    {r.code}
                  </div>
                  <span
                    className="badge new"
                    style={{
                      background: isHighest
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(167, 139, 250, 0.1)',
                      color: isHighest ? '#ef4444' : 'var(--color-violet)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {r.count} Insiden
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm fw-6 truncate">{r.name}</div>
                  <p className="text-[11px] text-ink-3 mt-1 leading-normal">
                    {isHighest
                      ? '🚨 Memerlukan inspeksi prioritas tinggi.'
                      : 'Kondisi terpantau aman.'}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-xs text-ink-3 text-center py-4">
            Belum ada catatan log pemeliharaan aset masuk.
          </div>
        )}
      </div>
    </div>
  );
}
