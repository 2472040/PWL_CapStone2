"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBhpSchema = exports.createBhpSchema = exports.updateMaintenanceSchema = exports.createMaintenanceSchema = exports.bhpUsedItemSchema = void 0;
const zod_1 = require("zod");
const CONDITION_VALUES = ['Baik', 'Perlu cek', 'Maintenance', 'Rusak'];
exports.bhpUsedItemSchema = zod_1.z.object({
    bhp_id: zod_1.z.number({ error: 'BHP ID harus berupa angka.' }).int().positive(),
    qty_used: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((v) => parseFloat(String(v)))
        .pipe(zod_1.z.number().positive({ message: 'Jumlah pakai harus lebih dari 0.' })),
});
exports.createMaintenanceSchema = zod_1.z.object({
    inventory_ids: zod_1.z.array(zod_1.z.number().int().positive()).min(1, { message: 'Pilih minimal 1 aset.' }),
    action: zod_1.z
        .string({ error: 'Tindakan wajib diisi.' })
        .min(1, { message: 'Tindakan wajib diisi.' })
        .max(500, { message: 'Tindakan maksimal 500 karakter.' }),
    condition_after: zod_1.z.enum(CONDITION_VALUES, {
        error: `Kondisi harus salah satu dari: ${CONDITION_VALUES.join(', ')}.`,
    }),
    date: zod_1.z.string({ error: 'Tanggal wajib diisi.' }).min(1, { message: 'Tanggal wajib diisi.' }),
    bhp_used: zod_1.z.array(exports.bhpUsedItemSchema).optional().default([]),
});
exports.updateMaintenanceSchema = zod_1.z.object({
    action: zod_1.z.string().min(1).max(500).optional(),
    condition_after: zod_1.z
        .enum(CONDITION_VALUES, {
        error: `Kondisi harus salah satu dari: ${CONDITION_VALUES.join(', ')}.`,
    })
        .optional(),
    date: zod_1.z.string().min(1).optional(),
});
exports.createBhpSchema = zod_1.z.object({
    code: zod_1.z
        .string({ error: 'Kode BHP wajib diisi.' })
        .min(1, { message: 'Kode BHP wajib diisi.' })
        .max(50, { message: 'Kode BHP maksimal 50 karakter.' }),
    name: zod_1.z
        .string({ error: 'Nama BHP wajib diisi.' })
        .min(2, { message: 'Nama BHP minimal 2 karakter.' })
        .max(200, { message: 'Nama BHP maksimal 200 karakter.' }),
    unit: zod_1.z
        .string({ error: 'Satuan wajib diisi.' })
        .min(1, { message: 'Satuan wajib diisi.' })
        .max(50, { message: 'Satuan maksimal 50 karakter.' }),
    stock: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((v) => parseFloat(String(v)))
        .pipe(zod_1.z.number().nonnegative({ message: 'Stok tidak boleh negatif.' }))
        .optional()
        .default(0),
    min_stock: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((v) => parseFloat(String(v)))
        .pipe(zod_1.z.number().nonnegative())
        .optional()
        .default(0),
    last_in: zod_1.z.string().optional().default(''),
    category: zod_1.z.string().max(100).optional().default(''),
});
exports.updateBhpSchema = zod_1.z.object({
    stock: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((v) => parseFloat(String(v)))
        .pipe(zod_1.z.number().nonnegative({ message: 'Stok tidak boleh negatif.' }))
        .optional(),
    min_stock: zod_1.z
        .union([zod_1.z.number(), zod_1.z.string()])
        .transform((v) => parseFloat(String(v)))
        .pipe(zod_1.z.number().nonnegative())
        .optional(),
    last_in: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2).max(200).optional(),
    unit: zod_1.z.string().min(1).max(50).optional(),
    category: zod_1.z.string().max(100).optional(),
    reason: zod_1.z.string().max(500).optional(),
});
