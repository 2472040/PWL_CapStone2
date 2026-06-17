import { Icon } from '../../../../components/app-shell';

interface MaintenanceTableProps {
  filteredLogs: any[];
  dispatch: (action: any) => void;
}

export function MaintenanceTable({ filteredLogs, dispatch }: MaintenanceTableProps) {
  return (
    <div className="table-wrap" data-reveal>
      <table className="tbl">
        <thead>
          <tr>
            <th>Log ID</th>
            <th>Tanggal</th>
            <th>Aset</th>
            <th>Tindakan</th>
            <th>Teknisi</th>
            <th>Kondisi</th>
            <th>BHP</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((l: any) => (
            <tr key={l.id}>
              <td className="mono">{l.id}</td>
              <td>{l.date}</td>
              <td>
                <b>{l.name}</b>
                <div className="mono text-xs">{l.asset}</div>
              </td>
              <td className="text-2">{l.action}</td>
              <td>{l.tech}</td>
              <td>
                <span className={`cond ${(l.cond || 'Baik').toLowerCase().replace(' ', '-')}`}>
                  {l.cond}
                </span>
              </td>
              <td className="text-xs mono">
                {!l.bhp || l.bhp.length === 0 ? (
                  <span className="text-3">—</span>
                ) : (
                  l.bhp.map((b: any, i: number) => (
                    <div key={i}>
                      {b.id}: −{b.qty}
                      {b.unit}
                    </div>
                  ))
                )}
              </td>
              <td>
                <button
                  className="act-btn"
                  onClick={() =>
                    dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: l } })
                  }
                  title="Ubah Log"
                  aria-label={`Ubah Log ${l.id}`}
                >
                  <Icon name="edit" size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
