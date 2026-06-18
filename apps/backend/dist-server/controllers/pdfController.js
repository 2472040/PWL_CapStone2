"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBastDocument = exports.generateBastPdf = exports.calculateDraftHash = void 0;
const Printer_1 = __importDefault(require("pdfmake/js/Printer"));
const models_1 = require("../models");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const errors_1 = require("../utils/errors");
const crypto_1 = __importDefault(require("crypto"));
const PdfPrinter = Printer_1.default.default || Printer_1.default;
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
};
const printer = new PdfPrinter(fonts);
const calculateDraftHash = (draft, items) => {
    const secret = process.env.DOCUMENT_SIGNING_SECRET ||
        process.env.JWT_SECRET ||
        'lokalab-secure-document-salt-2026';
    const serialized = JSON.stringify({
        code: draft.code,
        finalized_at: draft.finalized_at,
        creator_id: draft.created_by,
        total: items.reduce((sum, it) => sum + it.qty * Number(it.price), 0),
        items: items
            .map((it) => ({ id: it.id, qty: it.qty, price: it.price }))
            .sort((a, b) => a.id - b.id),
    });
    return crypto_1.default.createHmac('sha256', secret).update(serialized).digest('hex');
};
exports.calculateDraftHash = calculateDraftHash;
exports.generateBastPdf = (0, asyncHandler_1.default)(async (req, res) => {
    const draft = await models_1.Draft.findByPk(req.params.id, {
        include: [
            { model: models_1.User, as: 'creator', attributes: ['id', 'name', 'role'] },
            { model: models_1.User, as: 'finalizer', attributes: ['id', 'name', 'role'] },
            { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
        ],
    });
    if (!draft) {
        throw new errors_1.NotFoundError('Draf tidak ditemukan.');
    }
    const items = draft.items.filter((it) => !it.approval || it.approval.status === 'approved');
    const tableBody = [
        [
            { text: 'NO', style: 'tableHeader' },
            { text: 'NAMA BARANG', style: 'tableHeader' },
            { text: 'TIPE', style: 'tableHeader' },
            { text: 'QTY', style: 'tableHeader' },
            { text: 'HARGA SATUAN', style: 'tableHeader' },
            { text: 'SUBTOTAL', style: 'tableHeader' },
        ],
    ];
    let totalValuation = 0;
    items.forEach((it, idx) => {
        const subtotal = it.qty * Number(it.price);
        totalValuation += subtotal;
        tableBody.push([
            { text: (idx + 1).toString(), style: 'tableCellCenter' },
            { text: it.name, style: 'tableCell' },
            { text: it.kind === 'Inventaris' ? 'INV' : 'BHP', style: 'tableCellCenter' },
            { text: `${it.qty} ${it.unit}`, style: 'tableCellCenter' },
            { text: `Rp ${Number(it.price).toLocaleString('id-ID')}`, style: 'tableCellRight' },
            { text: `Rp ${subtotal.toLocaleString('id-ID')}`, style: 'tableCellRight' },
        ]);
    });
    // Calculate cryptographic hash
    const hash = (0, exports.calculateDraftHash)(draft, items);
    // Generate public verification link
    const protocol = req.secure ? 'https' : 'http';
    let host = req.get('host') || 'localhost:3000';
    if (host === 'localhost:3000') {
        host = 'localhost:5173';
    }
    const verifyUrl = `${protocol}://${host}/verify-bast/${draft.id}/${hash}`;
    const docDefinition = {
        content: [
            // Kop Surat
            { text: 'LOKALAB SUITE — INVENTORY & LAB SUITE', style: 'kopHeader' },
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
            // BAST Title
            { text: 'BERITA ACARA SERAH TERIMA BARANG', style: 'docTitle' },
            {
                text: `Nomor: BAST/${draft.code}/${new Date(draft.finalized_at || new Date()).getFullYear()}`,
                style: 'docSub',
            },
            { text: '\n' },
            // Intro Text
            {
                text: `Pada hari ini, ${new Date(draft.finalized_at || new Date()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, telah diserahterimakan sejumlah barang pengadaan laboratorium sesuai dengan pengajuan draf ${draft.title} (${draft.code}) yang telah disetujui dan difinalisasi oleh Ketua Program Studi:`,
                style: 'bodyText',
            },
            { text: '\n' },
            // Table
            {
                table: {
                    headerRows: 1,
                    widths: [25, 180, 45, 55, 100, 100],
                    body: tableBody,
                },
                layout: 'lightHorizontalLines',
            },
            { text: '\n' },
            // Total
            {
                columns: [
                    { text: '', width: '*' },
                    {
                        text: `Total Nilai Barang: Rp ${totalValuation.toLocaleString('id-ID')}`,
                        style: 'totalValuation',
                        width: 250,
                    },
                ],
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
                            { text: 'NIP. 198203112005011002', style: 'signNip' },
                        ],
                        alignment: 'center',
                    },
                    {
                        stack: [
                            { text: 'Pihak Kedua,', style: 'signTitle' },
                            { text: 'Ketua Program Studi', style: 'signSubtitle' },
                            { text: '\n\n\n\n' },
                            { text: `( ${draft.finalizer?.name || 'Ketua Prodi'} )`, style: 'signName' },
                            { text: 'NIP. 197805122001032001', style: 'signNip' },
                        ],
                        alignment: 'center',
                    },
                ],
            },
            { text: '\n\n' },
            {
                canvas: [
                    { type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, strokeColor: '#e2e8f0' },
                ],
            },
            { text: '\n' },
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: 'VERIFIKASI KEASLIAN DOKUMEN BAST', style: 'verifTitle' },
                            {
                                text: 'Dokumen Berita Acara Serah Terima (BAST) ini dilengkapi dengan tanda tangan digital kriptografis (SHA-256 HMAC) untuk menjamin integritas data. Anda dapat memindai kode QR di sebelah kanan menggunakan kamera ponsel untuk memverifikasi keabsahan draf pengadaan ini langsung pada server LokaLab Suite.',
                                style: 'verifBody',
                            },
                            { text: `\nTanda Tangan Kriptografis: ${hash}`, style: 'verifHash' },
                        ],
                    },
                    {
                        width: 100,
                        qr: verifyUrl,
                        fit: 75,
                        alignment: 'right',
                    },
                ],
            },
        ],
        defaultStyle: {
            font: 'Helvetica',
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
            signNip: { fontSize: 8, color: '#555555' },
            verifTitle: { fontSize: 8, bold: true, color: '#1a1a2e' },
            verifBody: { fontSize: 7, color: '#555555', lineHeight: 1.3 },
            verifHash: { fontSize: 6, font: 'Helvetica', color: '#888888' },
        },
    };
    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BAST-${draft.code}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
});
exports.verifyBastDocument = (0, asyncHandler_1.default)(async (req, res) => {
    const { id, hash } = req.params;
    const ip = req.ip || 'unknown-ip';
    const draftId = parseInt(id, 10);
    if (isNaN(draftId)) {
        return res.status(200).json({ verified: false, message: 'ID dokumen tidak valid.' });
    }
    // Strict regex validation for SHA-256 hash format to prevent injection/fuzzing
    if (typeof hash !== 'string' || hash.length !== 64 || !/^[0-9a-f]{64}$/i.test(hash)) {
        console.warn(`[Security Alert] Invalid hash format received for draft ID ${id} from IP ${ip}`);
        return res.status(200).json({ verified: false, message: 'Format tanda tangan tidak valid.' });
    }
    const draft = await models_1.Draft.findByPk(draftId, {
        include: [
            { model: models_1.User, as: 'creator', attributes: ['id', 'name', 'role'] },
            { model: models_1.User, as: 'finalizer', attributes: ['id', 'name', 'role'] },
            { model: models_1.DraftItem, as: 'items', include: [{ model: models_1.DraftApproval, as: 'approval' }] },
        ],
    });
    if (!draft) {
        console.warn(`[Security Alert] Verification attempted for non-existent draft ID ${draftId} from IP ${ip}`);
        return res
            .status(200)
            .json({ verified: false, message: 'Dokumen BAST tidak terdaftar di database.' });
    }
    if (draft.status !== 'finalized' && draft.status !== 'completed') {
        console.warn(`[Security Alert] Verification attempted for unfinalized draft ID ${draftId} (status: ${draft.status}) from IP ${ip}`);
        return res.status(200).json({
            verified: false,
            message: 'Dokumen BAST belum difinalisasi oleh Ketua Program Studi.',
        });
    }
    const items = draft.items.filter((it) => !it.approval || it.approval.status === 'approved');
    const computedHash = (0, exports.calculateDraftHash)(draft, items);
    // Use timingSafeEqual to protect against timing attacks
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const inputBuffer = Buffer.from(hash, 'hex');
    if (computedBuffer.length !== inputBuffer.length ||
        !crypto_1.default.timingSafeEqual(computedBuffer, inputBuffer)) {
        console.warn(`[Security Alert] Failed BAST verification attempt: Hash mismatch for draft ID ${draftId} from IP ${ip}`);
        return res.status(200).json({
            verified: false,
            message: 'Verifikasi gagal. Tanda tangan dokumen tidak cocok (telah dimanipulasi).',
        });
    }
    const totalValuation = items.reduce((sum, it) => sum + it.qty * Number(it.price), 0);
    res.status(200).json({
        verified: true,
        data: {
            code: draft.code,
            title: draft.title,
            finalized_at: draft.finalized_at,
            creator: draft.creator?.name || 'Kepala Lab',
            finalizer: draft.finalizer?.name || 'Ketua Prodi',
            total: totalValuation,
            itemCount: items.length,
        },
    });
});
