import { useEffect, useState } from 'react';
import { useStore, D, Icon, StatTile, useSearch, useToast } from '../../../components/app-shell';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

try {
  if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts) {
    pdfMake.vfs = pdfFonts.vfs || pdfFonts;
  }
} catch (e) {
  console.error('Error binding pdfmake vfs:', e);
}

export function Maintenance() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  const role = D.roles.find((r) => r.id === 'staflab') || D.roles[0];
  const [activeModal, setActiveModal] = useState<'log' | 'maint' | 'check' | 'bhp' | null>(null);

  useEffect(() => {
    async function loadMaintLogs() {
      try {
        const res = await apiFetch('/maintenance');
        if (res.data) {
          const formatted = res.data.map((l: any) => ({
            id: l.code || l.id,
            dbId: l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            rawDate: l.date,
            asset: l.Inventory?.code,
            name: l.Inventory?.name,
            action: l.action,
            tech: l.technician?.name || 'Teknisi',
            cond: l.condition_after,
            bhp:
              l.bhpUsed?.map((bu: any) => ({
                id: bu.Bhp?.code || bu.bhp_id,
                qty: parseFloat(bu.qty_used) || 0,
                unit: bu.Bhp?.unit || 'pcs',
              })) || [],
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
          const formatted = res.data.map((b: any) => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General',
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

  function handleQuickResolve(
    inventoryId: number,
    code: string,
    condition: string,
    actionText: string
  ) {
    dispatch({
      type: 'OPEN_MODAL',
      modal: {
        kind: 'confirm',
        payload: {
          title: 'Perbarui Kondisi Aset',
          message: `Apakah Anda yakin ingin memperbarui kondisi aset ${code} menjadi "${condition}"?`,
          confirmText: 'Ya, Perbarui',
          cancelText: 'Batal',
          onConfirm: async () => {
            try {
              const res = await apiFetch('/maintenance', {
                method: 'POST',
                body: JSON.stringify({
                  inventory_id: inventoryId,
                  action: actionText,
                  condition_after: condition,
                  date: new Date().toISOString().substring(0, 10),
                  bhp_used: [],
                }),
              });
              if (res.data) {
                // Reload maintenance logs
                const resLogs = await apiFetch('/maintenance');
                if (resLogs.data) {
                  const formattedLogs = resLogs.data.map((l: any) => ({
                    id: l.code || l.id,
                    dbId: l.id,
                    date: new Date(l.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                    rawDate: l.date,
                    asset: l.Inventory?.code,
                    name: l.Inventory?.name,
                    action: l.action,
                    tech: l.technician?.name || 'Teknisi',
                    cond: l.condition_after,
                    bhp:
                      l.bhpUsed?.map((bu: any) => ({
                        id: bu.Bhp?.code || bu.bhp_id,
                        qty: parseFloat(bu.qty_used) || 0,
                        unit: bu.Bhp?.unit || 'pcs',
                      })) || [],
                  }));
                  dispatch({ type: 'SET_MAINT_LOGS', logs: formattedLogs });
                }

                // Reload inventory condition in store
                const resInv = await apiFetch('/inventory');
                if (resInv.data) {
                  const formattedInv = resInv.data.map((i: any) => ({
                    id: i.id,
                    code: i.code,
                    name: i.name,
                    cat: i.category,
                    room: i.Room?.name || 'Gudang',
                    roomId: i.room_id || (i.Room ? i.Room.id : null),
                    cond: i.condition || 'Baik',
                    last: i.last_checked
                      ? new Date(i.last_checked).toLocaleDateString('id-ID')
                      : 'Baru saja',
                    acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
                    value: i.value || 0,
                    serial: i.serial || '-',
                    specs: i.specs || '-',
                  }));
                  dispatch({ type: 'SET_INVENTORY', inventory: formattedInv });
                }

                toast(`Kondisi aset ${code} berhasil diperbarui menjadi "${condition}"!`, 'ok');
              }
            } catch (err: any) {
              toast(`Gagal memperbarui kondisi aset: ${err.message}`, 'warn');
            }
          },
        },
      },
    });
  }

  const filteredLogs = state.maintLog.filter((l: any) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.asset || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.tech || '').toLowerCase().includes(q) ||
      (l.id || '').toLowerCase().includes(q)
    );
  });

  const generateMaintenancePDF = () => {
    if (window.showToast) window.showToast('Menyiapkan Laporan PDF…', 'info', 'log');

    const tableBody = [
      [
        { text: 'NO', style: 'tableHeader' },
        { text: 'LOG ID', style: 'tableHeader' },
        { text: 'TANGGAL', style: 'tableHeader' },
        { text: 'NAMA ASET', style: 'tableHeader' },
        { text: 'TINDAKAN', style: 'tableHeader' },
        { text: 'TEKNISI', style: 'tableHeader' },
        { text: 'KONDISI AKHIR', style: 'tableHeader' },
      ],
    ];

    filteredLogs.forEach((l: any, idx: number) => {
      tableBody.push([
        { text: (idx + 1).toString(), style: 'tableCellCenter' },
        { text: l.id, style: 'tableCellCode' },
        { text: l.date, style: 'tableCellCenter' },
        { text: `${l.name}\n(${l.asset})`, style: 'tableCellBold' },
        { text: l.action, style: 'tableCell' },
        { text: l.tech, style: 'tableCellCenter' },
        { text: l.cond, style: 'tableCellCenter' },
      ]);
    });

    const docDefinition = {
      content: [
        // Kop Surat Resmi
        { text: 'LOKALAB SUITE — LAPORAN MAINTENANCE', style: 'kopHeader' },
        { text: 'Fakultas Teknologi Informasi · Universitas Loka Kampus', style: 'kopSub' },
        {
          text: 'Bandung, Jawa Barat · Email: support@lokalab.id · Telp: (022) 123456',
          style: 'kopContact',
        },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, strokeColor: '#1a1a2e' },
          ],
        },
        { text: '\n' },

        // Title
        { text: 'LAPORAN KEGIATAN PEMELIHARAAN & PERBAIKAN ASET', style: 'docTitle' },
        {
          text: `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          style: 'docSub',
        },
        { text: '\n' },

        // Description
        {
          text: `Laporan ini memuat riwayat log tindakan pemeliharaan (maintenance) dan perbaikan peralatan laboratorium yang telah dilaksanakan oleh tim teknisi.`,
          style: 'bodyText',
        },
        { text: '\n' },

        // Table
        {
          table: {
            headerRows: 1,
            widths: [15, 45, 55, 100, '*', 55, 55],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === node.table.body.length ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#e2e8f0',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },
        { text: '\n' },

        // Totals
        {
          columns: [
            {
              text: `Total Kegiatan Pemeliharaan: ${filteredLogs.length} kejadian`,
              style: 'totalText',
              width: '*',
            },
          ],
        },
        { text: '\n\n' },

        // Sign-off
        {
          columns: [
            { text: '', width: '*' },
            {
              stack: [
                { text: 'Mengetahui & Menyetujui,', style: 'signTitle' },
                { text: 'Kepala Laboratorium', style: 'signSubtitle' },
                { text: '\n\n\n\n' },
                { text: `( ${state.user?.name || 'Kepala Lab'} )`, style: 'signName' },
                { text: 'NIP. 198203112005011002', style: 'signNip' },
              ],
              alignment: 'center',
              width: 200,
            },
          ],
        },
      ],
      defaultStyle: {
        font: 'Roboto',
      },
      styles: {
        kopHeader: { fontSize: 13, bold: true, alignment: 'center', color: '#1a1a2e' },
        kopSub: { fontSize: 9, alignment: 'center', color: '#333333' },
        kopContact: { fontSize: 8, alignment: 'center', color: '#555555' },
        docTitle: { fontSize: 12, bold: true, alignment: 'center', decoration: 'underline' },
        docSub: { fontSize: 9, alignment: 'center', color: '#555555' },
        bodyText: { fontSize: 9, lineHeight: 1.4 },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#f5f5f5', alignment: 'center' },
        tableCell: { fontSize: 8 },
        tableCellBold: { fontSize: 8, bold: true },
        tableCellCode: { fontSize: 8, font: 'Roboto' },
        tableCellCenter: { fontSize: 8, alignment: 'center' },
        totalText: { fontSize: 9, bold: true },
        signTitle: { fontSize: 9, bold: true },
        signSubtitle: { fontSize: 9, italics: true },
        signName: { fontSize: 9, bold: true, decoration: 'underline' },
        signNip: { fontSize: 8, color: '#555555' },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`Laporan_Maintenance_${new Date().toISOString().substring(0, 10)}.pdf`);
    if (window.showToast) window.showToast('Laporan PDF berhasil diunduh!', 'ok');
  };

  const exportMaintenanceCSV = () => {
    if (window.showToast) window.showToast('Mengekspor data ke CSV…', 'info', 'download');

    const headers = [
      'NO',
      'LOG ID',
      'TANGGAL',
      'KODE ASET',
      'NAMA ASET',
      'TINDAKAN',
      'TEKNISI',
      'KONDISI AKHIR',
      'BHP DIGUNAKAN',
    ];
    const data = filteredLogs.map((l: any, idx: number) => [
      idx + 1,
      l.id,
      l.date,
      l.asset,
      l.name,
      l.action,
      l.tech,
      l.cond,
      l.bhp.map((b: any) => `${b.id}:${b.qty}${b.unit}`).join('; '),
    ]);

    const csvRows = [
      headers.join(','),
      ...data.map((row: any) =>
        row
          .map((val: any) => {
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      ),
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Laporan_Maintenance_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (window.showToast) window.showToast('Data CSV berhasil diunduh!', 'ok');
  };

  return (
    <div className="page" style={{ '--role-accent': role.accent } as any}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">
            Log <em>maintenance</em>
          </h1>
          <p className="page-sub">
            Catat pemeliharaan, update kondisi aset. BHP yang dipakai otomatis berkurang dari stok.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn border border-line"
            onClick={generateMaintenancePDF}
            title="Cetak Laporan PDF"
          >
            <Icon name="log" size={13} /> PDF
          </button>
          <button
            className="btn border border-line"
            onClick={exportMaintenanceCSV}
            title="Ekspor Laporan Excel/CSV"
          >
            <Icon name="download" size={13} /> CSV
          </button>
          <button
            className="btn primary"
            onClick={() =>
              dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: {} } })
            }
          >
            <Icon name="plus" size={13} strokeWidth={2.4} /> Log baru
          </button>
        </div>
      </div>

      <div className="stats">
        <div onClick={() => setActiveModal('log')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile label="Log bulan ini" value={state.maintLog.length} icon="log" fmt="int" />
        </div>
        <div
          onClick={() => setActiveModal('maint')}
          style={{ cursor: 'pointer' }}
          className="flex-1"
        >
          <StatTile
            label="Aset di-maintain"
            value={state.inventory.filter((i: any) => i.cond === 'Maintenance').length}
            icon="wrench"
            fmt="int"
          />
        </div>
        <div
          onClick={() => setActiveModal('check')}
          style={{ cursor: 'pointer' }}
          className="flex-1"
        >
          <StatTile
            label="Aset perlu cek"
            value={state.inventory.filter((i: any) => i.cond === 'Perlu cek').length}
            icon="alert"
            fmt="int"
            accent="var(--gold)"
          />
        </div>
        <div onClick={() => setActiveModal('bhp')} style={{ cursor: 'pointer' }} className="flex-1">
          <StatTile
            label="BHP rendah"
            value={state.bhp.filter((b: any) => b.stock <= b.min).length}
            icon="flask"
            fmt="int"
            accent="var(--rose)"
          />
        </div>
      </div>

      {query && filteredLogs.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico">
            <Icon name="search" size={20} />
          </div>
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

      {/* Dynamic Filter Modal */}
      {activeModal && (
        <div
          className="modal-overlay"
          onClick={() => setActiveModal(null)}
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
                onClick={() => setActiveModal(null)}
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
                      {state.maintLog.map((l: any) => (
                        <tr
                          key={l.id}
                          className="hover:bg-white/5 cursor-pointer"
                          onClick={() => {
                            setQuery(l.id);
                            setActiveModal(null);
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
                      {state.maintLog.length === 0 && (
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
                      {state.inventory
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
                                    setActiveModal(null);
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
                      {state.inventory.filter((i: any) => i.cond === 'Maintenance').length ===
                        0 && (
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
                      {state.inventory
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
                                    setActiveModal(null);
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
                      {state.inventory.filter((i: any) => i.cond === 'Perlu cek').length === 0 && (
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
                      {state.bhp
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
                                  setActiveModal(null);
                                  navigate('/dashboard/bhp');
                                }}
                              >
                                <Icon name="plus" size={12} /> Restock
                              </button>
                            </td>
                          </tr>
                        ))}
                      {state.bhp.filter((b: any) => b.stock <= b.min).length === 0 && (
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
      )}
    </div>
  );
}
