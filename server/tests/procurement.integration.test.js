import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Use CJS require to ensure we share the exact same module cache with the server
const app = require('../app');
const { Draft, DraftItem, DraftApproval, sequelize } = require('../models');

describe('Procurement Workflow Integration Test', () => {
  let kalabToken = null;
  let kaprodiToken = null;
  let adminToken = null;
  let createdDraftId = null;

  beforeAll(async () => {
    // Sync database schema changes (like revision_notes column)
    await sequelize.sync({ alter: true });

    // 1. Login as Kalab
    const resKalab = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pradipta@kampus.id', password: 'password123' });

    expect(resKalab.status).toBe(200);
    kalabToken = resKalab.body.data.token;

    // 2. Login as Kaprodi
    const resKaprodi = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hendra@kampus.id', password: 'password123' });

    expect(resKaprodi.status).toBe(200);
    kaprodiToken = resKaprodi.body.data.token;

    // 3. Login as Admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'faqih@kampus.id', password: 'password123' });

    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.data.token;
  });

  it('should successfully run a full procurement lifecycle', async () => {
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

    const resCreate = await request(app)
      .post('/api/v1/procurement/drafts')
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(draftPayload);

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.data).toBeDefined();
    expect(resCreate.body.data.title).toBe(draftPayload.title);
    createdDraftId = resCreate.body.data.id;

    // B. Kalab submits the draft for review
    const resSubmit = await request(app)
      .post(`/api/v1/procurement/drafts/${createdDraftId}/submit`)
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send();

    expect(resSubmit.status).toBe(200);
    expect(resSubmit.body.data.status).toBe('submitted');

    // C. Kaprodi views pending drafts for review
    const resPending = await request(app)
      .get('/api/v1/procurement/review')
      .set('Authorization', `Bearer ${kaprodiToken}`);

    expect(resPending.status).toBe(200);
    const found = resPending.body.data.find((d) => d.id === createdDraftId);
    expect(found).toBeDefined();

    // D. Kaprodi reviews the items (approving them)
    const draftWithItems = await Draft.findByPk(createdDraftId, {
      include: [{ model: DraftItem, as: 'items' }],
    });

    const decisions = draftWithItems.items.map((it) => ({
      item_id: it.id,
      status: 'approved',
      notes: 'Disetujui via pengujian Vitest',
    }));

    const resReview = await request(app)
      .post(`/api/v1/procurement/drafts/${createdDraftId}/approve`)
      .set('Authorization', `Bearer ${kaprodiToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send({ decisions });

    expect(resReview.status).toBe(200);

    // E. Kaprodi finalizes the draft
    const resFinalize = await request(app)
      .post(`/api/v1/procurement/drafts/${createdDraftId}/finalize`)
      .set('Authorization', `Bearer ${kaprodiToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send();

    expect(resFinalize.status).toBe(200);
    expect(resFinalize.body.data.status).toBe('finalized');

    // F. Clean up test data from database to ensure no corruption
    await DraftApproval.destroy({ where: { notes: 'Disetujui via pengujian Vitest' } });
    await DraftItem.destroy({ where: { draft_id: createdDraftId } });
    await Draft.destroy({ where: { id: createdDraftId } });
  });

  it('should block unauthorized roles (like Admin) from finalising the draft', async () => {
    // Try to finalize using Admin token (should be forbidden 403)
    const resFinalizeBad = await request(app)
      .post(`/api/v1/procurement/drafts/1/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send();

    expect(resFinalizeBad.status).toBe(403);
  });

  it('should reject draft creation with invalid data (Zod Validation)', async () => {
    const invalidPayload = {
      title: 'Short', // Kurang dari 5 karakter
      items: [
        { kind: 'InvalidKind', name: 'Ab', qty: -5, unit: '', price: 0 }, // invalid kind, short name, negative qty, empty unit, zero price
      ],
    };

    const res = await request(app)
      .post('/api/v1/procurement/drafts')
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.details).toBeDefined();
  });

  it('should successfully run a procurement revision workflow lifecycle', async () => {
    // 1. Kalab creates a new draft
    const draftPayload = {
      title: 'Draf Pengadaan Uji Revisi Otomatis',
      items: [
        { kind: 'Inventaris', name: 'Alat Revisi Premium', qty: 1, unit: 'unit', price: 1000000 },
      ],
    };

    const resCreate = await request(app)
      .post('/api/v1/procurement/drafts')
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(draftPayload);

    expect(resCreate.status).toBe(201);
    const draftId = resCreate.body.data.id;

    // 2. Kalab submits the draft
    const resSubmit = await request(app)
      .post(`/api/v1/procurement/drafts/${draftId}/submit`)
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send();
    expect(resSubmit.status).toBe(200);
    expect(resSubmit.body.data.status).toBe('submitted');

    // 3. Kaprodi requests revision with notes
    const resRev = await request(app)
      .post(`/api/v1/procurement/drafts/${draftId}/revision`)
      .set('Authorization', `Bearer ${kaprodiToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send({ notes: 'Perlu spesifikasi mikroskop lebih detil' });

    expect(resRev.status).toBe(200);
    expect(resRev.body.data.status).toBe('revision');
    expect(resRev.body.data.revision_notes).toBe('Perlu spesifikasi mikroskop lebih detil');

    // 4. Kalab re-submits the draft (validating that it clears revision notes)
    const resReSubmit = await request(app)
      .post(`/api/v1/procurement/drafts/${draftId}/submit`)
      .set('Authorization', `Bearer ${kalabToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send();

    expect(resReSubmit.status).toBe(200);
    expect(resReSubmit.body.data.status).toBe('submitted');
    expect(resReSubmit.body.data.revision_notes).toBeNull();

    // 5. Clean up
    await DraftItem.destroy({ where: { draft_id: draftId } });
    await Draft.destroy({ where: { id: draftId } });
  });
});
