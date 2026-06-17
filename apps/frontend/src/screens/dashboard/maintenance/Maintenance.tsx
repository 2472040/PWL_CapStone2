import { useEffect, useState } from 'react';
import { useStore, D, Icon, StatTile, useSearch, useToast } from '../../../components/app-shell';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import { MaintenanceTable } from './log/MaintenanceTable';
import { MaintenanceModals } from './log/MaintenanceModals';
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
                { text: `( ${state.currentUser?.name || 'Kepala Lab'} )`, style: 'signName' },
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

      <MaintenanceTable filteredLogs={filteredLogs} dispatch={dispatch} />

      <MaintenanceModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        maintLog={state.maintLog}
        inventory={state.inventory}
        bhp={state.bhp}
        setQuery={setQuery}
        dispatch={dispatch}
        handleQuickResolve={handleQuickResolve}
        navigate={navigate}
      />
    </div>
  );
}
