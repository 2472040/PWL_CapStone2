import { z } from 'zod';

const CONDITION_VALUES = ['Baik', 'Perlu cek', 'Maintenance', 'Rusak'] as const;

export const bhpUsedItemSchema = z.object({
  bhp_id: z.number({ error: 'BHP ID harus berupa angka.' }).int().positive(),
  qty_used: z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().positive({ message: 'Jumlah pakai harus lebih dari 0.' })),
});

export const createMaintenanceSchema = z.object({
  inventory_ids: z.array(z.number().int().positive()).min(1, { message: 'Pilih minimal 1 aset.' }),
  action: z
    .string({ error: 'Tindakan wajib diisi.' })
    .min(1, { message: 'Tindakan wajib diisi.' })
    .max(500, { message: 'Tindakan maksimal 500 karakter.' }),
  condition_after: z.enum(CONDITION_VALUES, {
    error: `Kondisi harus salah satu dari: ${CONDITION_VALUES.join(', ')}.`,
  }),
  date: z.string({ error: 'Tanggal wajib diisi.' }).min(1, { message: 'Tanggal wajib diisi.' }),
  bhp_used: z.array(bhpUsedItemSchema).optional().default([]),
});

export const updateMaintenanceSchema = z.object({
  action: z.string().min(1).max(500).optional(),
  condition_after: z
    .enum(CONDITION_VALUES, {
      error: `Kondisi harus salah satu dari: ${CONDITION_VALUES.join(', ')}.`,
    })
    .optional(),
  date: z.string().min(1).optional(),
});

export const createBhpSchema = z.object({
  code: z
    .string({ error: 'Kode BHP wajib diisi.' })
    .min(1, { message: 'Kode BHP wajib diisi.' })
    .max(50, { message: 'Kode BHP maksimal 50 karakter.' }),
  name: z
    .string({ error: 'Nama BHP wajib diisi.' })
    .min(2, { message: 'Nama BHP minimal 2 karakter.' })
    .max(200, { message: 'Nama BHP maksimal 200 karakter.' }),
  unit: z
    .string({ error: 'Satuan wajib diisi.' })
    .min(1, { message: 'Satuan wajib diisi.' })
    .max(50, { message: 'Satuan maksimal 50 karakter.' }),
  stock: z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().nonnegative({ message: 'Stok tidak boleh negatif.' }))
    .optional()
    .default(0),
  min_stock: z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().nonnegative())
    .optional()
    .default(0),
  last_in: z.string().optional().default(''),
  category: z.string().max(100).optional().default(''),
});

export const updateBhpSchema = z.object({
  stock: z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().nonnegative({ message: 'Stok tidak boleh negatif.' }))
    .optional(),
  min_stock: z
    .union([z.number(), z.string()])
    .transform((v) => parseFloat(String(v)))
    .pipe(z.number().nonnegative())
    .optional(),
  last_in: z.string().optional(),
  name: z.string().min(2).max(200).optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional(),
  reason: z.string().max(500).optional(),
});

export const createMaintenanceScheduleSchema = z.object({
  inventory_id: z.number({ error: 'Inventory ID wajib diisi.' }).int().positive(),
  title: z
    .string({ error: 'Judul jadwal wajib diisi.' })
    .min(1, { message: 'Judul jadwal wajib diisi.' })
    .max(150, { message: 'Judul jadwal maksimal 150 karakter.' }),
  frequency_days: z
    .union([z.number(), z.string()])
    .transform((v) => parseInt(String(v)))
    .pipe(z.number().int().positive({ message: 'Frekuensi harus berupa angka positif.' })),
  next_maintenance_date: z
    .string({ error: 'Tanggal pemeliharaan berikutnya wajib diisi.' })
    .min(1, { message: 'Tanggal pemeliharaan berikutnya wajib diisi.' }),
  notes: z.string().max(1000).optional().default(''),
});

export const updateMaintenanceScheduleSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  frequency_days: z
    .union([z.number(), z.string()])
    .transform((v) => parseInt(String(v)))
    .pipe(z.number().int().positive())
    .optional(),
  next_maintenance_date: z.string().min(1).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['scheduled', 'overdue', 'completed']).optional(),
});
