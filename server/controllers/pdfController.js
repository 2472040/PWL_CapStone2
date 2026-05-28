const PdfPrinter = require('pdfmake');
const { Draft, DraftItem, DraftApproval, User } = require('../models');

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

const generateBastPdf = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'finalizer', attributes: ['id', 'name', 'role'] },
        { model: DraftItem, as: 'items', include: [{ model: DraftApproval, as: 'approval' }] }
      ]
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draf tidak ditemukan.' });
    }

    const items = draft.items.filter(it => !it.approval || it.approval.status === 'approved');

    const tableBody = [
      [
        { text: 'NO', style: 'tableHeader' },
        { text: 'NAMA BARANG', style: 'tableHeader' },
        { text: 'TIPE', style: 'tableHeader' },
        { text: 'QTY', style: 'tableHeader' },
        { text: 'HARGA SATUAN', style: 'tableHeader' },
        { text: 'SUBTOTAL', style: 'tableHeader' }
      ]
    ];

    let totalValuation = 0;
    items.forEach((it, idx) => {
      const subtotal = it.qty * it.price;
      totalValuation += subtotal;
      tableBody.push([
        { text: (idx + 1).toString(), style: 'tableCellCenter' },
        { text: it.name, style: 'tableCell' },
        { text: it.kind === 'Inventaris' ? 'INV' : 'BHP', style: 'tableCellCenter' },
        { text: `${it.qty} ${it.unit}`, style: 'tableCellCenter' },
        { text: `Rp ${it.price.toLocaleString('id-ID')}`, style: 'tableCellRight' },
        { text: `Rp ${subtotal.toLocaleString('id-ID')}`, style: 'tableCellRight' }
      ]);
    });

    const docDefinition = {
      content: [
        // Kop Surat
        { text: 'LOKALAB SUITE — INVENTORY & LAB SUITE', style: 'kopHeader' },
        { text: 'Fakultas Teknologi Informasi · Universitas Loka Kampus', style: 'kopSub' },
        { text: 'Bandung, Jawa Barat · Email: support@lokalab.id · Telp: (022) 123456', style: 'kopContact' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, strokeColor: '#1a1a2e' }] },
        { text: '\n' },

        // BAST Title
        { text: 'BERITA ACARA SERAH TERIMA BARANG', style: 'docTitle' },
        { text: `Nomor: BAST/${draft.code}/${new Date(draft.finalized_at || new Date()).getFullYear()}`, style: 'docSub' },
        { text: '\n' },

        // Intro Text
        {
          text: `Pada hari ini, ${new Date(draft.finalized_at || new Date()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, telah diserahterimakan sejumlah barang pengadaan laboratorium sesuai dengan pengajuan draf ${draft.title} (${draft.code}) yang telah disetujui dan difinalisasi oleh Ketua Program Studi:`,
          style: 'bodyText'
        },
        { text: '\n' },

        // Table
        {
          table: {
            headerRows: 1,
            widths: [25, 180, 45, 55, 100, 100],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\n' },

        // Total
        {
          columns: [
            { text: '', width: '*' },
            {
              text: `Total Nilai Barang: Rp ${totalValuation.toLocaleString('id-ID')}`,
              style: 'totalValuation',
              width: 250
            }
          ]
        },
        { text: '\n\n' },

        // Signatures
        {
          columns: [
            {
              stack: [
                { text: 'Pihak Pertama,', style: 'signTitle' },
                { text: 'Kepala Laboratorium', style: 'signSubtitle' },
                { text: '\n\n\n\n' },
                { text: `( ${draft.creator?.name || 'Kepala Lab'} )`, style: 'signName' },
                { text: 'NIP. 198203112005011002', style: 'signNip' }
              ],
              alignment: 'center'
            },
            {
              stack: [
                { text: 'Pihak Kedua,', style: 'signTitle' },
                { text: 'Ketua Program Studi', style: 'signSubtitle' },
                { text: '\n\n\n\n' },
                { text: `( ${draft.finalizer?.name || 'Ketua Prodi'} )`, style: 'signName' },
                { text: 'NIP. 197805122001032001', style: 'signNip' }
              ],
              alignment: 'center'
            }
          ]
        }
      ],
      defaultStyle: {
        font: 'Helvetica'
      },
      styles: {
        kopHeader: { fontSize: 14, bold: true, alignment: 'center', color: '#1a1a2e' },
        kopSub: { fontSize: 10, alignment: 'center', color: '#333333' },
        kopContact: { fontSize: 8, alignment: 'center', color: '#555555' },
        docTitle: { fontSize: 13, bold: true, alignment: 'center', decoration: 'underline' },
        docSub: { fontSize: 9, alignment: 'center', color: '#333333' },
        bodyText: { fontSize: 10, lineHeight: 1.4 },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#f5f5f5', alignment: 'center' },
        tableCell: { fontSize: 8 },
        tableCellCenter: { fontSize: 8, alignment: 'center' },
        tableCellRight: { fontSize: 8, alignment: 'right' },
        totalValuation: { fontSize: 10, bold: true, alignment: 'right' },
        signTitle: { fontSize: 10, bold: true },
        signSubtitle: { fontSize: 9, italics: true },
        signName: { fontSize: 10, bold: true, decoration: 'underline' },
        signNip: { fontSize: 8, color: '#555555' }
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BAST-${draft.code}.pdf`);
    
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error('[BAST PDF Error]', err);
    res.status(500).json({ error: 'Gagal mencetak BAST PDF.' });
  }
};

module.exports = { generateBastPdf };
