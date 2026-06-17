import { Icon } from '../../../components/app-shell';

interface StatsHeaderProps {
  firstName: string;
  roleTitle: string;
  stateRole: string;
  onExportCSV: () => void;
  onNewDraft: () => void;
}

export function StatsHeader({
  firstName,
  roleTitle,
  stateRole,
  onExportCSV,
  onNewDraft,
}: StatsHeaderProps) {
  return (
    <div className="page-head" data-reveal>
      <div>
        <h1 className="page-title">
          Halo, <em>{firstName}.</em>
        </h1>
        <p className="page-sub">
          {roleTitle} ·{' '}
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={onExportCSV} title="Export ke CSV">
          <Icon name="download" size={13} /> Export
        </button>
        {stateRole === 'kalab' && (
          <button className="btn primary" onClick={onNewDraft}>
            <Icon name="plus" size={13} strokeWidth={2.4} /> Pengajuan Baru
          </button>
        )}
      </div>
    </div>
  );
}
