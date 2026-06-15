import React, { useState, useEffect } from 'react';
import { useStore, StatTile, D, Icon, QR, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';
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

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await apiFetch('/inventory');
        if (res.data) {
          const inv = res.data.map((i) => ({
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
          dispatch({ type: 'SET_INVENTORY', inventory: inv });
        }
      } catch (err) {
        console.error('Failed to load inventory', err);
      }
    }
    fetchInventory();
  }, [dispatch]);

  const filtered = state.inventory.filter((it) => {
    if (filter !== 'all' && it.cat !== filter) return false;

    const [acqYear, acqMonth] = it.acquired.split('-');
    if (yearFilter !== 'all' && acqYear !== yearFilter) return false;
    if (monthFilter !== 'all' && acqMonth !== monthFilter) return false;

    if (query) {
      const q = query.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.room.toLowerCase().includes(q) ||
        it.specs.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
    filtered.forEach((it, idx) => {
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
            widths: [20, 70, 130, 70, 70, 50, 80],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
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

  const cats = ['all', ...new Set(state.inventory.map((it) => it.cat))];
  const years = [...new Set(state.inventory.map((it) => it.acquired.split('-')[0]))]
    .filter(Boolean)
    .sort();

  return (
    <div className="page" style={{ '--role-accent': role ? role.accent : undefined }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Inventaris</h1>
          <p className="page-sub">
            {filtered.length} dari {state.inventory.length} aset. Klik kartu untuk membuka detail
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

      <div data-reveal className="flex flex-wrap gap-2 mb-[18px]">
        <div className="searchbox min-w-[260px]">
          <Icon name="search" size={13} strokeWidth={2} className="text-ink-3" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={globalQuery ? `Filter: "${globalQuery}"` : 'Cari aset…'}
          />
        </div>
        <select
          className="select sm"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          title="Filter bulan pengadaan"
          style={{ width: '130px' }}
        >
          <option value="all">Semua Bulan</option>
          <option value="01">Januari</option>
          <option value="02">Februari</option>
          <option value="03">Maret</option>
          <option value="04">April</option>
          <option value="05">Mei</option>
          <option value="06">Juni</option>
          <option value="07">Juli</option>
          <option value="08">Agustus</option>
          <option value="09">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>
        <select
          className="select sm"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          title="Filter tahun pengadaan"
          style={{ width: '130px' }}
        >
          <option value="all">Semua Tahun</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`btn sm ${filter === c ? 'primary' : ''}`}
            style={{ textTransform: 'capitalize' }}
          >
            {c === 'all' ? 'Semua' : c}
          </button>
        ))}
      </div>

      <div className="inv-grid">
        {filtered.map((it) => (
          <div
            key={it.code}
            className="inv-card tilt-card"
            data-reveal
            onClick={() =>
              dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'inventory', payload: it } })
            }
          >
            <div className="tilt-shine" />
            <div className="inv-card-head">
              <div>
                <div className="inv-code">{it.code}</div>
              </div>
              <QR seed={it.code} size={7} />
            </div>
            <div className="inv-name">{it.name}</div>
            <div className="inv-spec">
              {it.cat} · {it.specs}
            </div>
            <div className="inv-meta">
              <div className="inv-meta-row">
                <span className="k">Ruangan</span>
                <span className="v">{it.room}</span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Kondisi</span>
                <span>
                  <span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>
                    {it.cond}
                  </span>
                </span>
              </div>
              <div className="inv-meta-row">
                <span className="k">Terakhir digunakan</span>
                <span className="v mono text-xs">{it.last}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
