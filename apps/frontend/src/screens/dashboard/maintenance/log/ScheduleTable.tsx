import { Icon } from '../../../../components/app-shell';

interface ScheduleTableProps {
  schedules: any[];
  role: string;
  onEdit: (schedule: any) => void;
  onDelete: (id: number) => void;
}

export function ScheduleTable({ schedules, role, onEdit, onDelete }: ScheduleTableProps) {
  const isStafLab = role === 'staflab';

  return (
    <div className="table-wrap" data-reveal>
      <table className="tbl">
        <thead>
          <tr>
            <th>Aset</th>
            <th>Nama Jadwal</th>
            <th>Frekuensi</th>
            <th>Terakhir Dicek</th>
            <th>Jadwal Berikutnya</th>
            <th>Status</th>
            {isStafLab && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {schedules.map((s: any) => {
            const assetCode = s.Inventory?.code || '—';
            const assetName = s.Inventory?.name || 'Aset Terhapus';

            // Format dates
            const lastMaint = s.last_maintenance_date
              ? new Date(s.last_maintenance_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            const nextMaint = new Date(s.next_maintenance_date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            // Map status badges
            let statusText = 'Akan Datang';
            let statusClass = 'cond baik';

            if (s.status === 'overdue') {
              statusText = 'Terlambat';
              statusClass = 'cond maintenance'; // Rose background/text
            } else if (s.status === 'completed') {
              statusText = 'Selesai';
              statusClass = 'cond baik';
            }

            return (
              <tr key={s.id}>
                <td>
                  <b>{assetName}</b>
                  <div className="mono text-xs">{assetCode}</div>
                </td>
                <td className="text-1 font-medium">{s.title}</td>
                <td>{s.frequency_days} Hari</td>
                <td>{lastMaint}</td>
                <td>
                  <b className={s.status === 'overdue' ? 'text-rose' : 'text-green'}>{nextMaint}</b>
                </td>
                <td>
                  <span className={statusClass}>{statusText}</span>
                </td>
                {isStafLab && (
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="act-btn"
                        onClick={() => onEdit(s)}
                        title="Ubah Jadwal"
                        aria-label={`Ubah Jadwal ${s.title}`}
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        className="act-btn text-rose hover:bg-rose/10"
                        onClick={() => onDelete(s.id)}
                        title="Hapus Jadwal"
                        aria-label={`Hapus Jadwal ${s.title}`}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {schedules.length === 0 && (
            <tr>
              <td colSpan={isStafLab ? 7 : 6} className="text-center text-xs text-ink-3 py-8">
                Belum ada jadwal pemeliharaan preventif yang dibuat.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
