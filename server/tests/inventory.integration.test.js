import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const app = require('../app');
const { Inventory, Room, User, sequelize } = require('../models');

describe('Inventory CRUD Integration Test', () => {
  let adminToken = null;
  let staffToken = null;
  let sysadminToken = null;
  let testRoomId = null;
  let testInventoryId = null;

  beforeAll(async () => {
    // 1. Log in as admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'faqih@kampus.id', password: 'password123' });
    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.data.token;

    // 2. Log in as staflab (requires staflab credentials from seeding)
    const resStaff = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maharani@kampus.id', password: 'password123' });
    expect(resStaff.status).toBe(200);
    staffToken = resStaff.body.data.token;

    // 3. Log in as sysadmin
    const resSys = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'anindita@kampus.id', password: 'password123' });
    expect(resSys.status).toBe(200);
    sysadminToken = resSys.body.data.token;

    // 4. Create a test room first
    const room = await Room.create({
      code: 'TEST-ROOM-INV',
      name: 'Test Room for Inventory Integration',
      floor: 3,
      capacity: 30,
    });
    testRoomId = room.id;
  });

  it('should successfully perform full inventory CRUD cycle', async () => {
    // A. Create Inventory Item (Staff)
    const inventoryPayload = {
      code: 'INV-TEST-VITEST',
      name: 'Microscope Vitest Pro',
      category: 'Alat',
      room_id: testRoomId,
      condition: 'Baik',
      acquired_date: '2026-01-01',
      value: 15000000,
      serial: 'SN-VITEST-999',
      specs: 'Magnification 1000x, LED illumination',
    };

    const resCreate = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(inventoryPayload);

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.data).toBeDefined();
    expect(resCreate.body.data.name).toBe(inventoryPayload.name);
    testInventoryId = resCreate.body.data.id;

    // B. Get List of Inventories
    const resList = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resList.status).toBe(200);
    const found = resList.body.data.find((item) => item.id === testInventoryId);
    expect(found).toBeDefined();

    // C. Get Inventory Detail
    const resDetail = await request(app)
      .get(`/api/v1/inventory/${testInventoryId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resDetail.status).toBe(200);
    expect(resDetail.body.data.serial).toBe('SN-VITEST-999');

    // D. Update Inventory Item (Admin)
    const updatePayload = {
      name: 'Microscope Vitest Pro Upgraded',
      condition: 'Perlu cek',
    };

    const resUpdate = await request(app)
      .put(`/api/v1/inventory/${testInventoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(updatePayload);

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.data.name).toBe('Microscope Vitest Pro Upgraded');
    expect(resUpdate.body.data.condition).toBe('Perlu cek');

    // E. Soft Delete Inventory Item (Admin)
    const resDelete = await request(app)
      .delete(`/api/v1/inventory/${testInventoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf');
    expect(resDelete.status).toBe(200);

    // F. Verify soft-deleted item is not visible in standard list
    const resListAfter = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${staffToken}`);
    const foundAfter = resListAfter.body.data.find((item) => item.id === testInventoryId);
    expect(foundAfter).toBeUndefined();

    // G. Restore Inventory Item (Sysadmin)
    const resRestore = await request(app)
      .post(`/api/v1/inventory/${testInventoryId}/restore`)
      .set('Authorization', `Bearer ${sysadminToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf');
    expect(resRestore.status).toBe(200);

    // H. Verify restored item is visible again
    const resListAfterRestore = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${staffToken}`);
    const foundAfterRestore = resListAfterRestore.body.data.find(
      (item) => item.id === testInventoryId
    );
    expect(foundAfterRestore).toBeDefined();

    // Clean up test data
    await Inventory.destroy({ where: { id: testInventoryId }, force: true });
    await Room.destroy({ where: { id: testRoomId } });
  });

  it('should block unauthorized roles from deleting inventory', async () => {
    // Staff lab cannot delete inventory items
    const resDeleteBad = await request(app)
      .delete(`/api/v1/inventory/1`)
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf');
    expect(resDeleteBad.status).toBe(403);
  });
});
