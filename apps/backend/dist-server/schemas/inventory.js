"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLabelSchema = exports.updateInventorySchema = exports.createInventorySchema = void 0;
const zod_1 = require("zod");
exports.createInventorySchema = zod_1.z.object({
    code: zod_1.z
        .string({ error: 'Kode aset wajib diisi.' })
        .min(1, { message: 'Kode aset wajib diisi.' })
        .max(50, { message: 'Kode aset maksimal 50 karakter.' }),
    name: zod_1.z
        .string({ error: 'Nama aset wajib diisi.' })
        .min(2, { message: 'Nama aset minimal 2 karakter.' })
        .max(200, { message: 'Nama aset maksimal 200 karakter.' }),
    category: zod_1.z
        .string({ error: 'Kategori wajib diisi.' })
        .min(1, { message: 'Kategori wajib diisi.' })
        .max(100, { message: 'Kategori maksimal 100 karakter.' }),
    room_id: zod_1.z.number({ error: 'Room ID harus berupa angka.' }).int().nullable().optional(),
    condition: zod_1.z
        .enum(['Baik', 'Perlu cek', 'Maintenance', 'Rusak'], {
        error: "Kondisi harus 'Baik', 'Perlu cek', 'Maintenance', atau 'Rusak'.",
    })
        .optional()
        .default('Baik'),
    acquired_date: zod_1.z.string().optional(),
    value: zod_1.z
        .number({ error: 'Nilai aset harus berupa angka.' })
        .nonnegative({ message: 'Nilai aset tidak boleh negatif.' })
        .optional()
        .default(0),
    serial: zod_1.z.string().max(200).optional().default(''),
    specs: zod_1.z.string().max(1000).optional().default(''),
});
exports.updateInventorySchema = exports.createInventorySchema.partial();
exports.updateLabelSchema = zod_1.z.object({
    label_number: zod_1.z.string().max(50).optional(),
    qr_data: zod_1.z.string().optional(),
    photo_url: zod_1.z.string().optional(),
});
