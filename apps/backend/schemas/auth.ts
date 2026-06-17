import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email wajib diisi.' })
    .email({ message: 'Format email tidak valid.' })
    .max(255, { message: 'Email maksimal 255 karakter.' }),
  password: z
    .string({ error: 'Password wajib diisi.' })
    .min(1, { message: 'Password wajib diisi.' }),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Nama minimal 2 karakter.' })
    .max(100, { message: 'Nama maksimal 100 karakter.' })
    .optional(),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .max(255, { message: 'Email maksimal 255 karakter.' })
    .optional(),
  password: z
    .string()
    .min(8, { message: 'Password baru minimal 8 karakter.' })
    .max(128, { message: 'Password baru maksimal 128 karakter.' })
    .optional(),
  currentPassword: z.string().optional(),
});
