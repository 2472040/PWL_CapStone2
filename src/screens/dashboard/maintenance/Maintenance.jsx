import React, { useEffect, useState } from 'react';
import { useStore, D, Icon, StatTile, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Maintenance() {
  const { state, dispatch } = useStore();
  const { query, setQuery } = useSearch();
  const role = D.roles.find(r => r.id === 'staflab');
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    async function loadMaintLogs() {
      try {
        const res = await apiFetch('/maintenance');
        if (res.data) {
          const formatted = res.data.map(l => ({
            id: l.code || l.id,
            dbId: l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: l.date,
            asset: l.Inventory?.code,
            name: l.Inventory?.name,
            action: l.action,
            tech: l.technician?.name || 'Teknisi',
            cond: l.condition_after,
            bhp: l.bhpUsed?.map(bu => ({
              id: bu.Bhp?.code || bu.bhp_id,
              qty: parseFloat(bu.qty_used) || 0,
              unit: bu.Bhp?.unit || 'pcs'
            })) || []
          }));
          dispatch({ type: 'SET_MAINT_LOGS', logs: formatted });
        }
      } catch (err) {
        console.error('Failed to load maintenance logs:', err);
      }
    }

    async function loadBhpData() {
      try {
        const res = await apiFetch('/bhp');
        if (res.data) {
          const formatted = res.data.map(b => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General'
          }));
          dispatch({ type: 'SET_BHP', bhp: formatted });
        }
      } catch (err) {
        console.error('Failed to load BHP:', err);
      }
    }

    loadMaintLogs();
    loadBhpData();
  }, [dispatch]);

  async function handleQuickResolve(inventoryId, code, condition, actionText) {
    if (!confirm(`Apakah Anda yakin ingin memperbarui kondisi aset ${code} menjadi "${condition}"?`)) return;
    
    try {
      const res = await apiFetch('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          inventory_id: inventoryId,
          action: actionText,
          condition_after: condition,
          date: new Date().toISOString().substring(0, 10),
          bhp_used: []
        })
      });
      if (res.data) {
        // Reload maintenance logs
        const resLogs = await apiFetch('/maintenance');
        if (resLogs.data) {
          const formattedLogs = resLogs.data.map(l => ({
            id: l.code || l.id,
            dbId: l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: l.date,
            asset: l.Inventory?.code,
            name: l.Inventory?.name,
            action: l.action,
            tech: l.technician?.name || 'Teknisi',
            cond: l.condition_after,
            bhp: l.bhpUsed?.map(bu => ({
              id: bu.Bhp?.code || bu.bhp_id,
              qty: parseFloat(bu.qty_used) || 0,
              unit: bu.Bhp?.unit || 'pcs'
            })) || []
          }));
          dispatch({ type: 'SET_MAINT_LOGS', logs: formattedLogs });
        }
        
        // Reload inventory condition in store
        const resInv = await apiFetch('/inventory');
        if (resInv.data) {
          const formattedInv = resInv.data.map(i => ({
            id: i.id,
            code: i.code,
            name: i.name,
            cat: i.category,
            room: i.Room?.name || 'Gudang',
            roomId: i.room_id || (i.Room ? i.Room.id : null),
            cond: i.condition || 'Baik',
            last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
            acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
            value: i.value || 0,
            serial: i.serial || '-',
            specs: i.specs || '-'
          }));
          dispatch({ type: 'SET_INVENTORY', inventory: formattedInv });
        }
        
        alert(`Kondisi aset ${code} berhasil diperbarui menjadi "${condition}"!`);
      }
    } catch (err) {
      alert(`Gagal memperbarui kondisi aset: ${err.message}`);
    }
  }

  const filteredLogs = state.maintLog.filter(l => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (l.name || '').toLowerCase().includes(q) || (l.asset || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q) || (l.tech || '').toLowerCase().includes(q) || (l.id || '').toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Log <em>maintenance</em></h1>
          <p className="page-sub">Catat pemeliharaan, update kondisi aset. BHP yang dipakai otomatis berkurang dari stok.</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: {} } })}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Log baru
        </button>
      </div>

      <div className="stats">
        <div onClick={() => setActiveModal('log')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile label="Log bulan ini" value={state.maintLog.length} icon="log" fmt="int" />
        </div>
        <div onClick={() => setActiveModal('maint')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile label="Aset di-maintain" value={state.inventory.filter(i => i.cond === 'Maintenance').length} icon="wrench" fmt="int" />
        </div>
        <div onClick={() => setActiveModal('check')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile label="Aset perlu cek" value={state.inventory.filter(i => i.cond === 'Perlu cek').length} icon="alert" fmt="int" accent="var(--gold)" />
        </div>
        <div onClick={() => setActiveModal('bhp')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile label="BHP rendah" value={state.bhp.filter(b => b.stock <= b.min).length} icon="flask" fmt="int" accent="var(--rose)" />
        </div>
      </div>

      {query && filteredLogs.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada log cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

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
            {filteredLogs.map(l => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td>{l.date}</td>
                <td><b>{l.name}</b><div className="mono text-xs">{l.asset}</div></td>
                <td className="text-2">{l.action}</td>
                <td>{l.tech}</td>
                <td><span className={`cond ${(l.cond || 'Baik').toLowerCase().replace(' ', '-')}`}>{l.cond}</span></td>
                <td className="text-xs mono">
                  {(!l.bhp || l.bhp.length === 0) ? <span className="text-3">—</span> : l.bhp.map((b, i) => (
                    <div key={i}>{b.id}: −{b.qty}{b.unit}</div>
                  ))}
                </td>
                <td>
                  <button className="act-btn" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: l } })} title="Ubah Log" aria-label={`Ubah Log ${l.id}`}>
                    <Icon name="edit" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Filter Modal */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 9, 11, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
        }}>
          <div className="card max-w-4xl w-full mx-4 overflow-hidden flex flex-col" style={{
            background: 'var(--surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '16px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Head */}
            <div className="p-5 border-b border-[#27272A] flex between aic">
              <div>
                <h3 className="text-xl fw-5 tracking-tight flex items-center gap-2">
                  <Icon name={
                    activeModal === 'log' ? 'log' :
                    activeModal === 'maint' ? 'wrench' :
                    activeModal === 'check' ? 'alert' : 'flask'
                  } size={18} strokeWidth={1.8} style={{ color: activeModal === 'check' ? 'var(--gold)' : activeModal === 'bhp' ? 'var(--rose)' : 'var(--role-accent)' }} />
                  {
                    activeModal === 'log' ? 'Log Maintenance Bulan Ini' :
                    activeModal === 'maint' ? 'Aset Sedang Maintenance' :
                    activeModal === 'check' ? 'Aset Perlu Pengecekan' : 'Stok BHP Kritis / Rendah'
                  }
                </h3>
                <p className="text-xs text-ink-3 mt-1">
                  {
                    activeModal === 'log' ? 'Klik baris log untuk memfilter dan mengarahkannya di tabel utama secara otomatis.' :
                    activeModal === 'maint' ? 'Daftar semua peralatan laboratorium yang saat ini berada dalam kondisi perbaikan/maintenance.' :
                    activeModal === 'check' ? 'Daftar semua peralatan laboratorium yang dilaporkan mengalami kendala atau membutuhkan pengecekan.' :
                    'Bahan habis pakai dengan jumlah stok di bawah batas minimal persediaan.'
                  }
                </p>
              </div>
              <button className="btn sm border-0 bg-transparent text-ink hover:text-white" onClick={() => setActiveModal(null)}>
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
                      {state.maintLog.map(l => (
                        <tr key={l.id} className="hover:bg-white/5 cursor-pointer" onClick={() => {
                          setQuery(l.id);
                          setActiveModal(null);
                        }}>
                          <td className="mono text-cyan">{l.id}</td>
                          <td>{l.date}</td>
                          <td><b>{l.name}</b><div className="mono text-xs">{l.asset}</div></td>
                          <td>{l.action}</td>
                          <td>{l.tech}</td>
                        </tr>
                      ))}
                      {state.maintLog.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-xs text-ink-3 py-6">Belum ada log terekam bulan ini.</td>
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
                      {state.inventory.filter(i => i.cond === 'Maintenance').map(i => (
                        <tr key={i.id}>
                          <td className="mono">{i.code}</td>
                          <td><b>{i.name}</b><div className="text-xs text-3">{i.cat}</div></td>
                          <td>{i.room}</td>
                          <td className="text-xs max-w-xs truncate">{i.specs}</td>
                          <td>
                            <div className="flex gap-2">
                              <button 
                                className="btn sm ok" 
                                title="Tandai Selesai (Langsung)" 
                                onClick={() => handleQuickResolve(i.id, i.code, 'Baik', 'Perbaikan selesai (langsung via checklist). Kondisi aset kembali normal.')}
                              >
                                <Icon name="check" size={12} strokeWidth={2.4} /> Ceklis Selesai
                              </button>
                              <button 
                                className="btn sm border border-line" 
                                title="Log Detail & BHP" 
                                onClick={() => {
                                  setActiveModal(null);
                                  dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: { asset: i.code, cond: 'Baik' } } });
                                }}
                              >
                                <Icon name="edit" size={12} /> Log Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {state.inventory.filter(i => i.cond === 'Maintenance').length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-xs text-ink-3 py-6">Tidak ada aset yang sedang dalam maintenance! 🎉</td>
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
                      {state.inventory.filter(i => i.cond === 'Perlu cek').map(i => (
                        <tr key={i.id}>
                          <td className="mono">{i.code}</td>
                          <td><b>{i.name}</b><div className="text-xs text-3">{i.cat}</div></td>
                          <td>{i.room}</td>
                          <td><span className="cond maintenance">{i.cond}</span></td>
                          <td>
                            <div className="flex gap-2">
                              <button 
                                className="btn sm ok" 
                                title="Tandai Kondisi Baik" 
                                onClick={() => handleQuickResolve(i.id, i.code, 'Baik', 'Pemeriksaan selesai (langsung via checklist). Kondisi aset terverifikasi Baik.')}
                              >
                                <Icon name="check" size={12} strokeWidth={2.4} /> Ceklis Baik
                              </button>
                              <button 
                                className="btn sm warn" 
                                title="Mulai Maintenance" 
                                onClick={() => handleQuickResolve(i.id, i.code, 'Maintenance', 'Pemeriksaan menunjukkan perlu pemeliharaan/perbaikan lebih lanjut.')}
                              >
                                <Icon name="wrench" size={12} /> Maintain
                              </button>
                              <button 
                                className="btn sm border border-line" 
                                title="Log Detail & BHP" 
                                onClick={() => {
                                  setActiveModal(null);
                                  dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: { asset: i.code } } });
                                }}
                              >
                                <Icon name="edit" size={12} /> Log Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {state.inventory.filter(i => i.cond === 'Perlu cek').length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-xs text-ink-3 py-6">Tidak ada aset yang membutuhkan pengecekan.</td>
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
                      {state.bhp.filter(b => b.stock <= b.min).map(b => (
                        <tr key={b.id} className="hover:bg-white/5">
                          <td className="mono text-rose">{b.id}</td>
                          <td><b>{b.name}</b></td>
                          <td>{b.cat}</td>
                          <td className="mono text-rose fw-6">{b.stock} {b.unit}</td>
                          <td className="mono text-3">{b.min} {b.unit}</td>
                          <td>
                            <button 
                              className="btn sm ok" 
                              title="Lakukan Restock" 
                              onClick={() => {
                                setActiveModal(null);
                                dispatch({ type: 'SET_SCREEN', screen: 'bhp' });
                              }}
                            >
                              <Icon name="plus" size={12} /> Restock
                            </button>
                          </td>
                        </tr>
                      ))}
                      {state.bhp.filter(b => b.stock <= b.min).length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center text-xs text-ink-3 py-6">Stok seluruh BHP dalam kondisi aman.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
