"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoomSchema = exports.createRoomSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const ROLES = ['sysadmin', 'admin', 'staflab', 'kalab', 'kaprodi'];
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z
        .string({ error: 'Nama wajib diisi.' })
        .min(2, { message: 'Nama minimal 2 karakter.' })
        .max(100, { message: 'Nama maksimal 100 karakter.' }),
    email: zod_1.z
        .string({ error: 'Email wajib diisi.' })
        .email({ message: 'Format email tidak valid.' })
        .max(255, { message: 'Email maksimal 255 karakter.' }),
    password: zod_1.z
        .string({ error: 'Password wajib diisi.' })
        .min(8, { message: 'Password minimal 8 karakter.' })
        .max(128, { message: 'Password maksimal 128 karakter.' }),
    role: zod_1.z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}.` }),
    initials: zod_1.z.string().max(5, { message: 'Inisial maksimal 5 karakter.' }).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, { message: 'Nama minimal 2 karakter.' }).max(100).optional(),
    email: zod_1.z.string().email({ message: 'Format email tidak valid.' }).max(255).optional(),
    role: zod_1.z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}.` }).optional(),
    status: zod_1.z
        .enum(['active', 'paused'], { error: "Status harus 'active' atau 'paused'." })
        .optional(),
    initials: zod_1.z.string().max(5).optional(),
    password: zod_1.z.string().min(8, { message: 'Password minimal 8 karakter.' }).max(128).optional(),
});
exports.createRoomSchema = zod_1.z.object({
    code: zod_1.z
        .string({ error: 'Kode ruangan wajib diisi.' })
        .min(1, { message: 'Kode ruangan wajib diisi.' })
        .max(20, { message: 'Kode ruangan maksimal 20 karakter.' }),
    name: zod_1.z
        .string({ error: 'Nama ruangan wajib diisi.' })
        .min(2, { message: 'Nama ruangan minimal 2 karakter.' })
        .max(200, { message: 'Nama ruangan maksimal 200 karakter.' }),
    floor: zod_1.z
        .number({ error: 'Lantai harus berupa angka.' })
        .int({ message: 'Lantai harus berupa angka bulat.' }),
    capacity: zod_1.z
        .number({ error: 'Kapasitas harus berupa angka.' })
        .int({ message: 'Kapasitas harus berupa angka bulat.' })
        .positive({ message: 'Kapasitas harus lebih besar dari 0.' })
        .optional(),
    pic_user_id: zod_1.z.number({ error: 'PIC harus berupa ID pengguna.' }).int().nullable().optional(),
});
exports.updateRoomSchema = exports.createRoomSchema.partial();
