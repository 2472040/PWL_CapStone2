import { z } from 'zod';

export const createInventorySchema = z.object({
  code: z
    .string({ error: 'Kode aset wajib diisi.' })
    .min(1, { message: 'Kode aset wajib diisi.' })
    .max(50, { message: 'Kode aset maksimal 50 karakter.' }),
  name: z
    .string({ error: 'Nama aset wajib diisi.' })
    .min(2, { message: 'Nama aset minimal 2 karakter.' })
    .max(200, { message: 'Nama aset maksimal 200 karakter.' }),
  category: z
    .string({ error: 'Kategori wajib diisi.' })
    .min(1, { message: 'Kategori wajib diisi.' })
    .max(100, { message: 'Kategori maksimal 100 karakter.' }),
  room_id: z.number({ error: 'Room ID harus berupa angka.' }).int().nullable().optional(),
  condition: z
    .enum(['Baik', 'Perlu cek', 'Maintenance', 'Rusak'], {
      error: "Kondisi harus 'Baik', 'Perlu cek', 'Maintenance', atau 'Rusak'.",
    })
    .optional()
    .default('Baik'),
  acquired_date: z.string().optional(),
  value: z
    .number({ error: 'Nilai aset harus berupa angka.' })
    .nonnegative({ message: 'Nilai aset tidak boleh negatif.' })
    .optional()
    .default(0),
  serial: z.string().max(200).optional().default(''),
  specs: z.string().max(1000).optional().default(''),
});

export const updateInventorySchema = createInventorySchema.partial();

export const updateLabelSchema = z.object({
  label_number: z.string().max(50).optional(),
  qr_data: z.string().optional(),
  photo_url: z.string().optional(),
});
