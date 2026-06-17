import { z } from 'zod';

export const draftItemSchema = z.object({
  kind: z.enum(['Inventaris', 'BHP'], {
    error: "Kategori item harus 'Inventaris' atau 'BHP'.",
  }),
  name: z
    .string()
    .min(3, { message: 'Nama barang minimal 3 karakter.' })
    .max(200, { message: 'Nama barang maksimal 200 karakter.' }),
  qty: z
    .number({ error: 'Jumlah barang harus berupa angka.' })
    .int({ message: 'Jumlah barang harus berupa angka bulat.' })
    .positive({ message: 'Jumlah barang harus lebih besar dari 0.' }),
  unit: z
    .string({ error: 'Satuan barang wajib diisi.' })
    .min(1, { message: 'Satuan barang wajib diisi.' })
    .max(50, { message: 'Satuan barang maksimal 50 karakter.' }),
  price: z
    .number({ error: 'Harga barang harus berupa angka.' })
    .positive({ message: 'Harga barang harus lebih besar dari 0.' }),
  link: z
    .string()
    .url({ message: 'Link pembelian harus berupa URL yang valid.' })
    .nullable()
    .optional()
    .or(z.literal(''))
    .or(z.literal(null)),
  replaces: z.string().nullable().optional().or(z.literal('')).or(z.literal(null)),
});

export const createDraftSchema = z.object({
  title: z
    .string()
    .min(5, { message: 'Judul draf minimal 5 karakter.' })
    .max(200, { message: 'Judul draf maksimal 200 karakter.' }),
  items: z.array(draftItemSchema).min(1, { message: 'Draf harus memiliki minimal 1 item.' }),
});
