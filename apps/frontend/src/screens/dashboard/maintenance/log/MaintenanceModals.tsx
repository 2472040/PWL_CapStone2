import { Icon } from '../../../../components/app-shell';

interface MaintenanceModalsProps {
  activeModal: 'log' | 'maint' | 'check' | 'bhp' | null;
  onClose: () => void;
  maintLog: any[];
  inventory: any[];
  bhp: any[];
  setQuery: (q: string) => void;
  dispatch: (action: any) => void;
  handleQuickResolve: (
    inventoryId: number,
    code: string,
    condition: string,
    actionText: string
  ) => void;
  navigate: (path: string) => void;
}

export function MaintenanceModals({
  activeModal,
  onClose,
  maintLog,
  inventory,
  bhp,
  setQuery,
  dispatch,
  handleQuickResolve,
  navigate,
}: MaintenanceModalsProps) {
  if (!activeModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(9, 9, 11, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="card max-w-4xl w-full mx-4 overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--color-line)',
          borderRadius: '16px',
          maxHeight: '85vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Head */}
        <div className="p-5 border-b border-[#27272A] flex between aic">
          <div>
            <h3 className="text-xl fw-5 tracking-tight flex items-center gap-2">
              <Icon
                name={
                  activeModal === 'log'
                    ? 'log'
                    : activeModal === 'maint'
                      ? 'wrench'
                      : activeModal === 'check'
                        ? 'alert'
                        : 'flask'
                }
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    activeModal === 'check'
                      ? 'var(--gold)'
                      : activeModal === 'bhp'
                        ? 'var(--rose)'
                        : 'var(--role-accent)',
                }}
              />
              {activeModal === 'log'
                ? 'Log Maintenance Bulan Ini'
                : activeModal === 'maint'
                  ? 'Aset Sedang Maintenance'
                  : activeModal === 'check'
                    ? 'Aset Perlu Pengecekan'
                    : 'Stok BHP Kritis / Rendah'}
            </h3>
            <p className="text-xs text-ink-3 mt-1">
              {activeModal === 'log'
                ? 'Klik baris log untuk memfilter dan mengarahkannya di tabel utama secara otomatis.'
                : activeModal === 'maint'
                  ? 'Daftar semua peralatan laboratorium yang saat ini berada dalam kondisi perbaikan/maintenance.'
                  : activeModal === 'check'
                    ? 'Daftar semua peralatan laboratorium yang dilaporkan mengalami kendala atau membutuhkan pengecekan.'
                    : 'Bahan habis pakai dengan jumlah stok di bawah batas minimal persediaan.'}
            </p>
          </div>
          <button
            className="btn sm border-0 bg-transparent text-ink hover:text-white"
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          {activeModal === 'log' && (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Tanggal</th>
                    <th>Aset</th>
                    <th>Tindakan</th>
                    <th>Teknisi</th>
                  </tr>
                </thead>
                <tbody>
                  {maintLog.map((l: any) => (
                    <tr
                      key={l.id}
                      className="hover:bg-white/5 cursor-pointer"
                      onClick={() => {
                        setQuery(l.id);
                        onClose();
                      }}
                    >
                      <td className="mono text-cyan">{l.id}</td>
                      <td>{l.date}</td>
                      <td>
                        <b>{l.name}</b>
                        <div className="mono text-xs">{l.asset}</div>
                      </td>
                      <td>{l.action}</td>
                      <td>{l.tech}</td>
                    </tr>
                  ))}
                  {maintLog.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-xs text-ink-3 py-6">
                        Belum ada log terekam bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeModal === 'maint' && (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kode Aset</th>
                    <th>Nama Aset</th>
                    <th>Ruangan</th>
                    <th>Spesifikasi</th>
                    <th>Aksi Perbaikan</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter((i: any) => i.cond === 'Maintenance')
                    .map((i: any) => (
                      <tr key={i.id}>
                        <td className="mono">{i.code}</td>
                        <td>
                          <b>{i.name}</b>
                          <div className="text-xs text-3">{i.cat}</div>
                        </td>
                        <td>{i.room}</td>
                        <td className="text-xs max-w-xs truncate">{i.specs}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn sm ok"
                              title="Tandai Selesai (Langsung)"
                              onClick={() =>
                                handleQuickResolve(
                                  i.id,
                                  i.code,
                                  'Baik',
                                  'Perbaikan selesai (langsung via checklist). Kondisi aset kembali normal.'
                                )
                              }
                            >
                              <Icon name="check" size={12} strokeWidth={2.4} /> Ceklis Selesai
                            </button>
                            <button
                              className="btn sm border border-line"
                              title="Log Detail & BHP"
                              onClick={() => {
                                onClose();
                                setTimeout(() => {
                                  dispatch({
                                    type: 'OPEN_DRAWER',
                                    drawer: {
                                      kind: 'maintenance',
                                      payload: { asset: i.code, cond: 'Baik' },
                                    },
                                  });
                                }, 200);
                              }}
                            >
                              <Icon name="edit" size={12} /> Log Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {inventory.filter((i: any) => i.cond === 'Maintenance').length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-xs text-ink-3 py-6">
                        Tidak ada aset yang sedang dalam maintenance! 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeModal === 'check' && (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kode Aset</th>
                    <th>Nama Aset</th>
                    <th>Ruangan</th>
                    <th>Kondisi Saat Ini</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter((i: any) => i.cond === 'Perlu cek')
                    .map((i: any) => (
                      <tr key={i.id}>
                        <td className="mono">{i.code}</td>
                        <td>
                          <b>{i.name}</b>
                          <div className="text-xs text-3">{i.cat}</div>
                        </td>
                        <td>{i.room}</td>
                        <td>
                          <span className="cond maintenance">{i.cond}</span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn sm ok"
                              title="Tandai Kondisi Baik"
                              onClick={() =>
                                handleQuickResolve(
                                  i.id,
                                  i.code,
                                  'Baik',
                                  'Pemeriksaan selesai (langsung via checklist). Kondisi aset terverifikasi Baik.'
                                )
                              }
                            >
                              <Icon name="check" size={12} strokeWidth={2.4} /> Ceklis Baik
                            </button>
                            <button
                              className="btn sm warn"
                              title="Mulai Maintenance"
                              onClick={() =>
                                handleQuickResolve(
                                  i.id,
                                  i.code,
                                  'Maintenance',
                                  'Pemeriksaan menunjukkan perlu pemeliharaan/perbaikan lebih lanjut.'
                                )
                              }
                            >
                              <Icon name="wrench" size={12} /> Maintain
                            </button>
                            <button
                              className="btn sm border border-line"
                              title="Log Detail & BHP"
                              onClick={() => {
                                onClose();
                                setTimeout(() => {
                                  dispatch({
                                    type: 'OPEN_DRAWER',
                                    drawer: { kind: 'maintenance', payload: { asset: i.code } },
                                  });
                                }, 200);
                              }}
                            >
                              <Icon name="edit" size={12} /> Log Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {inventory.filter((i: any) => i.cond === 'Perlu cek').length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-xs text-ink-3 py-6">
                        Tidak ada aset yang membutuhkan pengecekan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeModal === 'bhp' && (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kode BHP</th>
                    <th>Nama Barang</th>
                    <th>Kategori</th>
                    <th>Stok Saat Ini</th>
                    <th>Stok Minimum</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bhp
                    .filter((b: any) => b.stock <= b.min)
                    .map((b: any) => (
                      <tr key={b.id} className="hover:bg-white/5">
                        <td className="mono text-rose">{b.id}</td>
                        <td>
                          <b>{b.name}</b>
                        </td>
                        <td>{b.cat}</td>
                        <td className="mono text-rose fw-6">
                          {b.stock} {b.unit}
                        </td>
                        <td className="mono text-3">
                          {b.min} {b.unit}
                        </td>
                        <td>
                          <button
                            className="btn sm ok"
                            title="Lakukan Restock"
                            onClick={() => {
                              onClose();
                              navigate('/dashboard/bhp');
                            }}
                          >
                            <Icon name="plus" size={12} /> Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  {bhp.filter((b: any) => b.stock <= b.min).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-xs text-ink-3 py-6">
                        Stok seluruh BHP dalam kondisi aman.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
