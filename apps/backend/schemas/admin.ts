import { z } from 'zod';

const ROLES = ['sysadmin', 'admin', 'staflab', 'kalab', 'kaprodi'] as const;

export const createUserSchema = z.object({
  name: z
    .string({ error: 'Nama wajib diisi.' })
    .min(2, { message: 'Nama minimal 2 karakter.' })
    .max(100, { message: 'Nama maksimal 100 karakter.' }),
  email: z
    .string({ error: 'Email wajib diisi.' })
    .email({ message: 'Format email tidak valid.' })
    .max(255, { message: 'Email maksimal 255 karakter.' }),
  password: z
    .string({ error: 'Password wajib diisi.' })
    .min(8, { message: 'Password minimal 8 karakter.' })
    .max(128, { message: 'Password maksimal 128 karakter.' }),
  role: z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}.` }),
  initials: z.string().max(5, { message: 'Inisial maksimal 5 karakter.' }).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, { message: 'Nama minimal 2 karakter.' }).max(100).optional(),
  email: z.string().email({ message: 'Format email tidak valid.' }).max(255).optional(),
  role: z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}.` }).optional(),
  status: z
    .enum(['active', 'paused'], { error: "Status harus 'active' atau 'paused'." })
    .optional(),
  initials: z.string().max(5).optional(),
  password: z.string().min(8, { message: 'Password minimal 8 karakter.' }).max(128).optional(),
});

export const createRoomSchema = z.object({
  code: z
    .string({ error: 'Kode ruangan wajib diisi.' })
    .min(1, { message: 'Kode ruangan wajib diisi.' })
    .max(20, { message: 'Kode ruangan maksimal 20 karakter.' }),
  name: z
    .string({ error: 'Nama ruangan wajib diisi.' })
    .min(2, { message: 'Nama ruangan minimal 2 karakter.' })
    .max(200, { message: 'Nama ruangan maksimal 200 karakter.' }),
  floor: z
    .number({ error: 'Lantai harus berupa angka.' })
    .int({ message: 'Lantai harus berupa angka bulat.' }),
  capacity: z
    .number({ error: 'Kapasitas harus berupa angka.' })
    .int({ message: 'Kapasitas harus berupa angka bulat.' })
    .positive({ message: 'Kapasitas harus lebih besar dari 0.' })
    .optional(),
  pic_user_id: z.number({ error: 'PIC harus berupa ID pengguna.' }).int().nullable().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();
