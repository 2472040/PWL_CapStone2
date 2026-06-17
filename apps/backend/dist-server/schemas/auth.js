"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ error: 'Email wajib diisi.' })
        .email({ message: 'Format email tidak valid.' })
        .max(255, { message: 'Email maksimal 255 karakter.' }),
    password: zod_1.z
        .string({ error: 'Password wajib diisi.' })
        .min(1, { message: 'Password wajib diisi.' }),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, { message: 'Nama minimal 2 karakter.' })
        .max(100, { message: 'Nama maksimal 100 karakter.' })
        .optional(),
    email: zod_1.z
        .string()
        .email({ message: 'Format email tidak valid.' })
        .max(255, { message: 'Email maksimal 255 karakter.' })
        .optional(),
    password: zod_1.z
        .string()
        .min(8, { message: 'Password baru minimal 8 karakter.' })
        .max(128, { message: 'Password baru maksimal 128 karakter.' })
        .optional(),
    currentPassword: zod_1.z.string().optional(),
});
