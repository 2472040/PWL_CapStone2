import { useState, useEffect, useRef } from 'react';
import { useStore, D, Icon, useSearch } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { InventoryFilters } from './list/InventoryFilters';
import { InventoryGrid } from './list/InventoryGrid';
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

export function Inventory() {
  const { state, dispatch } = useStore();
  const { query: globalQuery } = useSearch();
  const role = D.roles.find((r) => r.id === state.role);
  const [filter, setFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [localQuery, setLocalQuery] = useState('');
  const query = globalQuery || localQuery;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [cats, setCats] = useState<string[]>(['all']);
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const limit = 12;

  const prevDeps = useRef({ currentPage, filter, monthFilter, yearFilter, query });

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, monthFilter, yearFilter, query]);

  // Fetch complete filter options once on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const res = await apiFetch('/inventory?limit=1000');
        if (res.data) {
          const uniqueCats = ['all', ...new Set(res.data.map((i: any) => i.category))].filter(
            Boolean
          ) as string[];
          const uniqueYears = [
            ...new Set(
              res.data.map((i: any) => (i.acquired_date ? i.acquired_date.split('-')[0] : null))
            ),
          ]
            .filter(Boolean)
            .sort() as string[];
          setCats(uniqueCats);
          setYears(uniqueYears);
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    }
    fetchFilterOptions();
  }, []);

  // Fetch paginated inventory
  useEffect(() => {
    let active = true;

    const depsChanged =
      prevDeps.current.currentPage !== currentPage ||
      prevDeps.current.filter !== filter ||
      prevDeps.current.monthFilter !== monthFilter ||
      prevDeps.current.yearFilter !== yearFilter ||
      prevDeps.current.query !== query;

    prevDeps.current = { currentPage, filter, monthFilter, yearFilter, query };

    async function fetchInventory(silent = false) {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });
        if (filter !== 'all') params.append('category', filter);
        if (monthFilter !== 'all') params.append('month', monthFilter);
        if (yearFilter !== 'all') params.append('year', yearFilter);
        if (query) params.append('search', query);

        const res = await apiFetch(`/inventory?${params.toString()}`);
        if (!active) return;
        if (res.data) {
          const inv = res.data.map((i: any) => ({
            id: i.id,
            code: i.code,
            name: i.name,
            cat: i.category,
            room: i.Room?.name || 'Gudang',
            cond: i.condition || 'Baik',
            last: i.last_checked
              ? new Date(i.last_checked).toLocaleDateString('id-ID')
              : 'Baru saja',
            acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
            value: i.value || 0,
            serial: i.serial || '-',
            specs: i.specs || '-',
            photo_url: i.label?.photo_url || null,
          }));
          setInventoryItems(inv);
          if (res.pagination) {
            setTotalPages(res.pagination.pages || 1);
            setTotalItems(res.pagination.total || 0);
          }
        }
      } catch (err) {
        console.error('Failed to load inventory', err);
      } finally {
        if (active && !silent) setLoading(false);
      }
    }

    const isFirstLoad = inventoryItems.length === 0;
    const silent = !isFirstLoad && !depsChanged;

    fetchInventory(silent);

    return () => {
      active = false;
    };
  }, [state.inventory, currentPage, filter, monthFilter, yearFilter, query]);

  const filtered = inventoryItems;

  const generateInventoryPDF = () => {
    if (window.showToast) window.showToast('Menyiapkan Laporan PDF…', 'info', 'log');

    const tableBody = [
      [
        { text: 'NO', style: 'tableHeader' },
        { text: 'KODE ASET', style: 'tableHeader' },
        { text: 'NAMA BARANG', style: 'tableHeader' },
        { text: 'KATEGORI', style: 'tableHeader' },
        { text: 'RUANGAN', style: 'tableHeader' },
        { text: 'KONDISI', style: 'tableHeader' },
        { text: 'VALUASI', style: 'tableHeader' },
      ],
    ];

    let totalValuation = 0;
    filtered.forEach((it: any, idx: number) => {
      totalValuation += parseFloat(it.value) || 0;
      tableBody.push([
        { text: (idx + 1).toString(), style: 'tableCellCenter' },
        { text: it.code, style: 'tableCellCode' },
        { text: it.name, style: 'tableCellBold' },
        { text: it.cat, style: 'tableCell' },
        { text: it.room, style: 'tableCell' },
        { text: it.cond, style: 'tableCellCenter' },
        { text: `Rp ${(it.value || 0).toLocaleString('id-ID')}`, style: 'tableCellRight' },
      ]);
    });

    const docDefinition = {
      content: [
        // Kop Surat Resmi
        { text: 'LOKALAB SUITE — LAPORAN INVENTARIS ASET', style: 'kopHeader' },
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
        { text: 'LAPORAN TAHUNAN ASET INVENTARIS LABORATORIUM', style: 'docTitle' },
        {
          text: `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          style: 'docSub',
        },
        { text: '\n' },

        // Description
        {
          text: `Laporan ini menyajikan daftar aset inventaris yang saat ini terdaftar di bawah pengawasan sistem LokaLab Suite. Dokumen ini dicetak secara otomatis untuk kebutuhan audit berkala dan kelengkapan berkas akreditasi program studi.`,
          style: 'bodyText',
        },
        { text: '\n' },

        // Table
        {
          table: {
            headerRows: 1,
            widths: [15, 55, '*', 55, 60, 50, 75],
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
            { text: `Total Aset: ${filtered.length} unit`, style: 'totalText', width: '*' },
            {
              text: `Total Nilai Valuasi: Rp ${totalValuation.toLocaleString('id-ID')}`,
              style: 'totalValuation',
              width: 250,
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
        tableCellRight: { fontSize: 8, alignment: 'right' },
        totalText: { fontSize: 9, bold: true },
        totalValuation: { fontSize: 9, bold: true, alignment: 'right' },
        signTitle: { fontSize: 9, bold: true },
        signSubtitle: { fontSize: 9, italics: true },
        signName: { fontSize: 9, bold: true, decoration: 'underline' },
        signNip: { fontSize: 8, color: '#555555' },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`Laporan_Inventaris_${new Date().toISOString().substring(0, 10)}.pdf`);
    if (window.showToast) window.showToast('Laporan PDF berhasil diunduh!', 'ok');
  };

  return (
    <div className="page" style={{ '--role-accent': role ? role.accent : undefined } as any}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Inventaris</h1>
          <p className="page-sub">
            Menampilkan {filtered.length} dari {totalItems} aset. Klik kartu untuk membuka detail
            dan riwayat maintenance.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn border border-line"
            onClick={generateInventoryPDF}
            title="Cetak Laporan PDF"
          >
            <Icon name="log" size={13} /> PDF
          </button>
          {state.role === 'admin' && (
            <button
              className="btn"
              onClick={() =>
                window.showToast && window.showToast('Generate bulk label QR…', 'info', 'qr')
              }
            >
              <Icon name="qr" size={13} /> Bulk label
            </button>
          )}
        </div>
      </div>

      <InventoryFilters
        localQuery={localQuery}
        setLocalQuery={setLocalQuery}
        globalQuery={globalQuery}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        years={years}
        cats={cats}
        filter={filter}
        setFilter={setFilter}
      />

      <InventoryGrid loading={loading} filtered={filtered} dispatch={dispatch} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className="flex justify-between items-center mt-6 p-4 border-t border-line"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            padding: '16px 0',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <span className="text-sm text-ink-3" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            Menampilkan {filtered.length} dari {totalItems} aset (Halaman {currentPage} dari{' '}
            {totalPages})
          </span>
          <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn sm border border-line"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Sebelumnya
            </button>
            <button
              className="btn sm border border-line"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
