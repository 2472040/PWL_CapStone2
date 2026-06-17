import React from 'react';
import { Icon } from '../../../components/app-shell';
import type { DashboardStats } from '../../../store/store.types';

interface CollaborationTrackerProps {
  dashboardData: DashboardStats | null;
  stateRole: string;
}

export function CollaborationTracker({ dashboardData, stateRole }: CollaborationTrackerProps) {
  if (stateRole !== 'kaprodi' && stateRole !== 'kalab') {
    return null;
  }

  return (
    <div className="grid md:grid-cols-2 gap-3.5 mt-6" data-reveal>
      {/* Average Approval Card */}
      <div
        className="card glow"
        style={{ '--role-accent': 'var(--color-violet)' } as React.CSSProperties}
      >
        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
          — Durasi Persetujuan
        </div>
        <h3 className="text-xl fw-5 mb-4 tracking-tight">Rata-rata Waktu Respons</h3>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="mono text-4xl font-bold text-violet tracking-tight glow-text flex items-center gap-3">
            <Icon name="clock" size={28} className="text-violet" />
            {dashboardData?.avgApprovalTimeHours !== undefined
              ? `${dashboardData.avgApprovalTimeHours} Jam`
              : '4.2 Jam'}
          </div>
          <p className="text-xs text-ink-3 mt-4 text-center leading-relaxed">
            Waktu rata-rata dari draf diajukan oleh Kalab hingga disetujui & difinalisasi oleh
            Kaprodi di database MySQL.
          </p>
        </div>
      </div>

      {/* Low-stock BHP Alert Widget */}
      <div className="card" style={{ '--role-accent': 'var(--color-cyan)' } as React.CSSProperties}>
        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
          — Sisa Stok BHP Kritis
        </div>
        <h3 className="text-xl fw-5 mb-4 tracking-tight">BHP Perlu Restock Segera</h3>
        <div className="flex flex-col gap-3.5 w-full">
          {dashboardData?.top3LowBhp && dashboardData.top3LowBhp.length > 0 ? (
            dashboardData.top3LowBhp.map((b) => {
              const displayPct = isNaN(Number(b.pct)) ? 100 : Number(b.pct);
              return (
                <div key={b.code}>
                  <div className="flex between aic mb-1.5">
                    <div className="text-[13px]">
                      <b>{b.name}</b> <span className="text-3 mono text-xs">· {b.code}</span>
                    </div>
                    <span className="mono text-xs text-rose font-semibold">
                      {b.stock} / {b.min_stock} {b.unit}
                    </span>
                  </div>
                  <div
                    className="h-[6px]"
                    style={{
                      background: 'var(--color-surface-2)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="rounded-sm"
                      style={{
                        height: '100%',
                        width: `${Math.max(5, Math.min(100, displayPct))}%`,
                        background: 'linear-gradient(90deg, var(--color-rose), var(--color-gold))',
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-ink-3 text-center py-4">
              Semua stok BHP di atas batas minimum. Aman.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
