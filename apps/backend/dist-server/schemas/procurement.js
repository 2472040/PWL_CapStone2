"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDraftSchema = exports.draftItemSchema = void 0;
const zod_1 = require("zod");
exports.draftItemSchema = zod_1.z.object({
    kind: zod_1.z.enum(['Inventaris', 'BHP'], {
        error: "Kategori item harus 'Inventaris' atau 'BHP'.",
    }),
    name: zod_1.z
        .string()
        .min(3, { message: 'Nama barang minimal 3 karakter.' })
        .max(200, { message: 'Nama barang maksimal 200 karakter.' }),
    qty: zod_1.z
        .number({ error: 'Jumlah barang harus berupa angka.' })
        .int({ message: 'Jumlah barang harus berupa angka bulat.' })
        .positive({ message: 'Jumlah barang harus lebih besar dari 0.' }),
    unit: zod_1.z
        .string({ error: 'Satuan barang wajib diisi.' })
        .min(1, { message: 'Satuan barang wajib diisi.' })
        .max(50, { message: 'Satuan barang maksimal 50 karakter.' }),
    price: zod_1.z
        .number({ error: 'Harga barang harus berupa angka.' })
        .positive({ message: 'Harga barang harus lebih besar dari 0.' }),
    link: zod_1.z
        .string()
        .url({ message: 'Link pembelian harus berupa URL yang valid.' })
        .nullable()
        .optional()
        .or(zod_1.z.literal(''))
        .or(zod_1.z.literal(null)),
    replaces: zod_1.z.string().nullable().optional().or(zod_1.z.literal('')).or(zod_1.z.literal(null)),
});
exports.createDraftSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(5, { message: 'Judul draf minimal 5 karakter.' })
        .max(200, { message: 'Judul draf maksimal 200 karakter.' }),
    items: zod_1.z.array(exports.draftItemSchema).min(1, { message: 'Draf harus memiliki minimal 1 item.' }),
});
