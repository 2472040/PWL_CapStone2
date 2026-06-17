"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const models_1 = require("../models");
(0, vitest_1.describe)('Procurement Workflow Integration Test', () => {
    let kalabToken = null;
    let kaprodiToken = null;
    let adminToken = null;
    let createdDraftId = null;
    (0, vitest_1.beforeAll)(async () => {
        // Sync database schema changes (like revision_notes column)
        await models_1.sequelize.sync();
        // 1. Login as Kalab
        const resKalab = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'pradipta@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resKalab.status).toBe(200);
        kalabToken = resKalab.body.data.token;
        // 2. Login as Kaprodi
        const resKaprodi = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'hendra@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resKaprodi.status).toBe(200);
        kaprodiToken = resKaprodi.body.data.token;
        // 3. Login as Admin
        const resAdmin = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'faqih@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resAdmin.status).toBe(200);
        adminToken = resAdmin.body.data.token;
    });
    (0, vitest_1.it)('should successfully run a full procurement lifecycle', async () => {
        // A. Kalab creates a new draft
        const draftPayload = {
            title: 'Draf Pengadaan Integrasi Vitest',
            items: [
                {
                    kind: 'Inventaris',
                    name: 'Alat Test Vitest Premium',
                    qty: 2,
                    unit: 'unit',
                    price: 5000000,
                    link: 'http://test.com',
                },
                {
                    kind: 'BHP',
                    name: 'Bahan Habis Pakai Vitest',
                    qty: 10,
                    unit: 'pcs',
                    price: 150000,
                    link: 'http://test.com',
                },
            ],
        };
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/procurement/drafts')
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(draftPayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        (0, vitest_1.expect)(resCreate.body.data).toBeDefined();
        (0, vitest_1.expect)(resCreate.body.data.title).toBe(draftPayload.title);
        createdDraftId = resCreate.body.data.id;
        // B. Kalab submits the draft for review
        const resSubmit = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${createdDraftId}/submit`)
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send();
        (0, vitest_1.expect)(resSubmit.status).toBe(200);
        (0, vitest_1.expect)(resSubmit.body.data.status).toBe('submitted');
        // C. Kaprodi views pending drafts for review
        const resPending = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/procurement/review')
            .set('Authorization', `Bearer ${kaprodiToken}`);
        (0, vitest_1.expect)(resPending.status).toBe(200);
        const found = resPending.body.data.find((d) => d.id === createdDraftId);
        (0, vitest_1.expect)(found).toBeDefined();
        // D. Kaprodi reviews the items (approving them)
        const draftWithItems = await models_1.Draft.findByPk(createdDraftId, {
            include: [{ model: models_1.DraftItem, as: 'items' }],
        });
        const decisions = draftWithItems.items.map((it) => ({
            item_id: it.id,
            status: 'approved',
            notes: 'Disetujui via pengujian Vitest',
        }));
        const resReview = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${createdDraftId}/approve`)
            .set('Authorization', `Bearer ${kaprodiToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send({ decisions });
        (0, vitest_1.expect)(resReview.status).toBe(200);
        // E. Kaprodi finalizes the draft
        const resFinalize = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${createdDraftId}/finalize`)
            .set('Authorization', `Bearer ${kaprodiToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send();
        (0, vitest_1.expect)(resFinalize.status).toBe(200);
        (0, vitest_1.expect)(resFinalize.body.data.status).toBe('finalized');
        // F. Clean up test data from database to ensure no corruption
        await models_1.DraftApproval.destroy({ where: { notes: 'Disetujui via pengujian Vitest' } });
        await models_1.DraftItem.destroy({ where: { draft_id: createdDraftId } });
        await models_1.Draft.destroy({ where: { id: createdDraftId } });
    });
    (0, vitest_1.it)('should block unauthorized roles (like Admin) from finalising the draft', async () => {
        // Try to finalize using Admin token (should be forbidden 403)
        const resFinalizeBad = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/1/finalize`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send();
        (0, vitest_1.expect)(resFinalizeBad.status).toBe(403);
    });
    (0, vitest_1.it)('should reject draft creation with invalid data (Zod Validation)', async () => {
        const invalidPayload = {
            title: 'Short', // Kurang dari 5 karakter
            items: [
                { kind: 'InvalidKind', name: 'Ab', qty: -5, unit: '', price: 0 }, // invalid kind, short name, negative qty, empty unit, zero price
            ],
        };
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/procurement/drafts')
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(invalidPayload);
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBeDefined();
        (0, vitest_1.expect)(res.body.details).toBeDefined();
    });
    (0, vitest_1.it)('should successfully run a procurement revision workflow lifecycle', async () => {
        // 1. Kalab creates a new draft
        const draftPayload = {
            title: 'Draf Pengadaan Uji Revisi Otomatis',
            items: [
                { kind: 'Inventaris', name: 'Alat Revisi Premium', qty: 1, unit: 'unit', price: 1000000 },
            ],
        };
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/procurement/drafts')
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(draftPayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        const draftId = resCreate.body.data.id;
        // 2. Kalab submits the draft
        const resSubmit = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${draftId}/submit`)
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send();
        (0, vitest_1.expect)(resSubmit.status).toBe(200);
        (0, vitest_1.expect)(resSubmit.body.data.status).toBe('submitted');
        // 3. Kaprodi requests revision with notes
        const resRev = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${draftId}/revision`)
            .set('Authorization', `Bearer ${kaprodiToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send({ notes: 'Perlu spesifikasi mikroskop lebih detil' });
        (0, vitest_1.expect)(resRev.status).toBe(200);
        (0, vitest_1.expect)(resRev.body.data.status).toBe('revision');
        (0, vitest_1.expect)(resRev.body.data.revision_notes).toBe('Perlu spesifikasi mikroskop lebih detil');
        // 4. Kalab re-submits the draft (validating that it clears revision notes)
        const resReSubmit = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/procurement/drafts/${draftId}/submit`)
            .set('Authorization', `Bearer ${kalabToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send();
        (0, vitest_1.expect)(resReSubmit.status).toBe(200);
        (0, vitest_1.expect)(resReSubmit.body.data.status).toBe('submitted');
        (0, vitest_1.expect)(resReSubmit.body.data.revision_notes).toBeNull();
        // 5. Clean up
        await models_1.DraftItem.destroy({ where: { draft_id: draftId } });
        await models_1.Draft.destroy({ where: { id: draftId } });
    });
});
