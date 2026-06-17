import React from 'react';
import { Icon } from '../../../components/app-shell';

export interface MappedActivity {
  who: string;
  role: string;
  act: string;
  target: string;
  when: string;
}

interface RecentActivityProps {
  activities: MappedActivity[];
  roleAccent: string;
}

export function RecentActivity({ activities, roleAccent }: RecentActivityProps) {
  return (
    <div
      className="card glow"
      style={{ '--role-accent': roleAccent } as React.CSSProperties}
      data-reveal
    >
      <div className="flex between aic mb-4">
        <div>
          <div className="text-3 text-xs mono tracking-[0.1em] uppercase">— Aktivitas tim</div>
          <h3 className="text-xl fw-5 mt-2 tracking-tight">Apa yang baru terjadi</h3>
        </div>
        <button className="btn sm">
          <Icon name="refresh" size={12} /> Live
        </button>
      </div>
      <div>
        {activities.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 text-center"
            style={{ opacity: 0.7 }}
          >
            <Icon
              name="log"
              size={32}
              style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--role-accent)' }}
            />
            <p className="text-sm font-medium">Belum ada aktivitas terbaru</p>
            <p className="text-xs text-ink-3 mt-1">
              Aktivitas sistem dan pengguna akan tercatat otomatis di sini.
            </p>
          </div>
        ) : (
          activities.slice(0, 6).map((a, i) => (
            <div
              key={i}
              className="act-row"
              style={{ '--role-accent': roleAccent } as React.CSSProperties}
            >
              <div className="act-avatar">{a.who[0]}</div>
              <div className="act-text">
                <b>{a.who}</b>
                <span className="role-pill">{a.role}</span> {a.act}{' '}
                <span className="tgt">{a.target}</span>
              </div>
              <div className="act-when">{a.when}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
