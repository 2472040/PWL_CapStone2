import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const app = require('../app');
const { MaintenanceLog, Bhp, Inventory, Room, sequelize } = require('../models');

describe('Maintenance and BHP Integration Test', () => {
  let staffToken = null;
  let adminToken = null;
  let testRoomId = null;
  let testInventoryId = null;
  let testMaintenanceLogId = null;
  let testBhpId = null;

  beforeAll(async () => {
    // Clean up any stale data from previous failed/aborted test runs
    const staleInv = await Inventory.findOne({ where: { code: 'INV-MAINT-TEST' } });
    if (staleInv) {
      await MaintenanceLog.destroy({ where: { inventory_id: staleInv.id } });
      await staleInv.destroy({ force: true });
    }
    await Room.destroy({ where: { code: 'TEST-ROOM-MAINT' } });
    await Bhp.destroy({ where: { code: 'BHP-TEST-VITEST' } });

    // 1. Log in as staflab
    const resStaff = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maharani@kampus.id', password: 'password123' });
    expect(resStaff.status).toBe(200);
    staffToken = resStaff.body.data.token;

    // 2. Log in as admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'faqih@kampus.id', password: 'password123' });
    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.data.token;

    // 3. Create a room
    const room = await Room.create({
      code: 'TEST-ROOM-MAINT',
      name: 'Test Room for Maintenance Integration',
      floor: 1,
      capacity: 20,
    });
    testRoomId = room.id;

    // 4. Create an inventory item
    const inventory = await Inventory.create({
      code: 'INV-MAINT-TEST',
      name: 'Test Microscope for Maintenance',
      category: 'Alat',
      room_id: testRoomId,
      condition: 'Baik',
    });
    testInventoryId = inventory.id;
  });

  it('should successfully run a full maintenance log lifecycle', async () => {
    // A. Create Maintenance Log (Staff)
    const logPayload = {
      inventory_ids: [testInventoryId],
      action: 'Kalibrasi optik microscope',
      condition_after: 'Baik',
      date: '2026-06-15',
    };

    const resCreate = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(logPayload);

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.data).toBeDefined();
    expect(resCreate.body.data[0].action).toBe(logPayload.action);
    testMaintenanceLogId = resCreate.body.data[0].id;

    // B. Get List of Maintenance Logs
    const resList = await request(app)
      .get('/api/v1/maintenance')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resList.status).toBe(200);
    const found = resList.body.data.find((log) => log.id === testMaintenanceLogId);
    expect(found).toBeDefined();

    // C. Update Maintenance Log (Staff)
    const updatePayload = {
      action: 'Kalibrasi optik microscope & penggantian lensa',
      condition_after: 'Baik',
    };

    const resUpdate = await request(app)
      .put(`/api/v1/maintenance/${testMaintenanceLogId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(updatePayload);

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.data.action).toBe(updatePayload.action);
  });

  it('should successfully perform BHP CRUD and predictions', async () => {
    // A. Create BHP Item (Staff)
    const bhpPayload = {
      code: 'BHP-TEST-VITEST',
      name: 'Isopropyl Alcohol 99%',
      unit: 'botol',
      stock: 10,
      min_stock: 2,
      category: 'Cairan Pembersih',
    };

    const resCreate = await request(app)
      .post('/api/v1/bhp')
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', 'csrfToken=test_csrf')
      .set('x-csrf-token', 'test_csrf')
      .send(bhpPayload);

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.data).toBeDefined();
    expect(resCreate.body.data.name).toBe(bhpPayload.name);
    testBhpId = resCreate.body.data.id;

    // B. Get List of BHP Items (Staff)
    const resList = await request(app)
      .get('/api/v1/bhp')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resList.status).toBe(200);
    const found = resList.body.data.find((item) => item.id === testBhpId);
    expect(found).toBeDefined();

    // C. Get Predictive Forecasting for BHP Item (Staff)
    const resPredict = await request(app)
      .get(`/api/v1/bhp/${testBhpId}/predictive`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resPredict.status).toBe(200);
    expect(resPredict.body.data).toBeDefined();

    // Clean up test data
    if (testMaintenanceLogId) {
      await MaintenanceLog.destroy({ where: { id: testMaintenanceLogId } });
    }
    if (testBhpId) {
      await Bhp.destroy({ where: { id: testBhpId } });
    }
    await Inventory.destroy({ where: { id: testInventoryId }, force: true });
    await Room.destroy({ where: { id: testRoomId } });
  });

  it('should restrict unauthorized roles from getting maintenance logs', async () => {
    // Admin cannot view maintenance logs directly via staff endpoint in router
    // because authorization is limited to staflab for '/maintenance' route.
    const resGetBad = await request(app)
      .get('/api/v1/maintenance')
      .set('Authorization', `Bearer ${adminToken}`);
    // Should be 403 Forbidden
    expect(resGetBad.status).toBe(403);
  });
});
