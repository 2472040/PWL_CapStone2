"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const models_1 = require("../models");
(0, vitest_1.describe)('Maintenance and BHP Integration Test', () => {
    let staffToken = null;
    let adminToken = null;
    let sysadminToken = null;
    let testRoomId = null;
    let testInventoryId = null;
    let testMaintenanceLogId = null;
    let testBhpId = null;
    (0, vitest_1.beforeAll)(async () => {
        // Clean up any stale data from previous failed/aborted test runs
        const staleInv = await models_1.Inventory.findOne({ where: { code: 'INV-MAINT-TEST' } });
        if (staleInv) {
            await models_1.MaintenanceLog.destroy({ where: { inventory_id: staleInv.id } });
            await staleInv.destroy({ force: true });
        }
        await models_1.Room.destroy({ where: { code: 'TEST-ROOM-MAINT' } });
        await models_1.Bhp.destroy({ where: { code: 'BHP-TEST-VITEST' } });
        // 1. Log in as staflab
        const resStaff = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'maharani@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resStaff.status).toBe(200);
        staffToken = resStaff.body.data.token;
        // 2. Log in as admin
        const resAdmin = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'faqih@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resAdmin.status).toBe(200);
        adminToken = resAdmin.body.data.token;
        // 3. Log in as sysadmin
        const resSys = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'anindita@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resSys.status).toBe(200);
        sysadminToken = resSys.body.data.token;
        // 3. Create a room
        const room = await models_1.Room.create({
            code: 'TEST-ROOM-MAINT',
            name: 'Test Room for Maintenance Integration',
            floor: 1,
            capacity: 20,
        });
        testRoomId = room.id;
        // 4. Create an inventory item
        const inventory = await models_1.Inventory.create({
            code: 'INV-MAINT-TEST',
            name: 'Test Microscope for Maintenance',
            category: 'Alat',
            room_id: testRoomId,
            condition: 'Baik',
        });
        testInventoryId = inventory.id;
    });
    (0, vitest_1.it)('should successfully run a full maintenance log lifecycle', async () => {
        // A. Create Maintenance Log (Staff)
        const logPayload = {
            inventory_ids: [testInventoryId],
            action: 'Kalibrasi optik microscope',
            condition_after: 'Baik',
            date: '2026-06-15',
        };
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/maintenance')
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(logPayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        (0, vitest_1.expect)(resCreate.body.data).toBeDefined();
        (0, vitest_1.expect)(resCreate.body.data[0].action).toBe(logPayload.action);
        testMaintenanceLogId = resCreate.body.data[0].id;
        // B. Get List of Maintenance Logs
        const resList = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/maintenance')
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resList.status).toBe(200);
        const found = resList.body.data.find((log) => log.id === testMaintenanceLogId);
        (0, vitest_1.expect)(found).toBeDefined();
        // C. Update Maintenance Log (Staff)
        const updatePayload = {
            action: 'Kalibrasi optik microscope & penggantian lensa',
            condition_after: 'Baik',
        };
        const resUpdate = await (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/maintenance/${testMaintenanceLogId}`)
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(updatePayload);
        (0, vitest_1.expect)(resUpdate.status).toBe(200);
        (0, vitest_1.expect)(resUpdate.body.data.action).toBe(updatePayload.action);
    });
    (0, vitest_1.it)('should successfully perform BHP CRUD and predictions', async () => {
        // A. Create BHP Item (Staff)
        const bhpPayload = {
            code: 'BHP-TEST-VITEST',
            name: 'Isopropyl Alcohol 99%',
            unit: 'botol',
            stock: 10,
            min_stock: 2,
            category: 'Cairan Pembersih',
        };
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/bhp')
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(bhpPayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        (0, vitest_1.expect)(resCreate.body.data).toBeDefined();
        (0, vitest_1.expect)(resCreate.body.data.name).toBe(bhpPayload.name);
        testBhpId = resCreate.body.data.id;
        // B. Get List of BHP Items (Staff)
        const resList = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/bhp')
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resList.status).toBe(200);
        const found = resList.body.data.find((item) => item.id === testBhpId);
        (0, vitest_1.expect)(found).toBeDefined();
        // C. Get Predictive Forecasting for BHP Item (Staff)
        const resPredict = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/bhp/${testBhpId}/predictive`)
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resPredict.status).toBe(200);
        (0, vitest_1.expect)(resPredict.body.data).toBeDefined();
    });
    (0, vitest_1.it)('should restrict unauthorized roles from getting maintenance logs', async () => {
        // Admin cannot view maintenance logs directly via staff endpoint in router
        // because authorization is limited to staflab for '/maintenance' route.
        const resGetBad = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/maintenance')
            .set('Authorization', `Bearer ${adminToken}`);
        // Should be 403 Forbidden
        (0, vitest_1.expect)(resGetBad.status).toBe(403);
    });
    (0, vitest_1.it)('should block sysadmin from viewing BHP list', async () => {
        const resBhpBad = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/bhp')
            .set('Authorization', `Bearer ${sysadminToken}`);
        (0, vitest_1.expect)(resBhpBad.status).toBe(403);
    });
    (0, vitest_1.it)('should block admin from modifying BHP', async () => {
        const resCreateBad = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/bhp')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send({
            code: 'BHP-ADMIN-BAD',
            name: 'Bad Stuff',
            unit: 'pcs',
        });
        (0, vitest_1.expect)(resCreateBad.status).toBe(403);
    });
    (0, vitest_1.it)('should successfully run a full maintenance schedule lifecycle and auto-cycle when maintained', async () => {
        let testScheduleId = null;
        // A. Create Maintenance Schedule (Staff)
        const schedulePayload = {
            inventory_id: testInventoryId,
            title: 'Kalibrasi Mikroskop Bulanan',
            frequency_days: 30,
            next_maintenance_date: '2026-07-15',
            notes: 'Gunakan cairan pembersih standar optik.',
        };
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/maintenance-schedules')
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(schedulePayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        (0, vitest_1.expect)(resCreate.body.data).toBeDefined();
        (0, vitest_1.expect)(resCreate.body.data.title).toBe(schedulePayload.title);
        (0, vitest_1.expect)(resCreate.body.data.frequency_days).toBe(30);
        testScheduleId = resCreate.body.data.id;
        // B. Get List of Maintenance Schedules
        const resList = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/maintenance-schedules')
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resList.status).toBe(200);
        const found = resList.body.data.find((s) => s.id === testScheduleId);
        (0, vitest_1.expect)(found).toBeDefined();
        (0, vitest_1.expect)(found.status).toBe('scheduled');
        // C. Update Maintenance Schedule (Staff)
        const updatePayload = {
            title: 'Kalibrasi Mikroskop Bulanan - Diperbarui',
        };
        const resUpdate = await (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/maintenance-schedules/${testScheduleId}`)
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(updatePayload);
        (0, vitest_1.expect)(resUpdate.status).toBe(200);
        (0, vitest_1.expect)(resUpdate.body.data.title).toBe(updatePayload.title);
        // D. Auto-cycle schedule when maintenance is logged
        const logPayload = {
            inventory_ids: [testInventoryId],
            action: 'Rutin maintenance tahunan',
            condition_after: 'Baik',
            date: '2026-06-18',
        };
        const resLog = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/maintenance')
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(logPayload);
        (0, vitest_1.expect)(resLog.status).toBe(201);
        // Verify schedule is updated/cycled: next date = 2026-06-18 + 30 days = 2026-07-18
        const resListAfter = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/maintenance-schedules')
            .set('Authorization', `Bearer ${staffToken}`);
        const foundAfter = resListAfter.body.data.find((s) => s.id === testScheduleId);
        (0, vitest_1.expect)(foundAfter.last_maintenance_date).toBe('2026-06-18');
        (0, vitest_1.expect)(foundAfter.next_maintenance_date).toBe('2026-07-18');
        (0, vitest_1.expect)(foundAfter.status).toBe('scheduled');
        // E. Delete Maintenance Schedule (Staff)
        const resDelete = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/maintenance-schedules/${testScheduleId}`)
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf');
        (0, vitest_1.expect)(resDelete.status).toBe(200);
    });
    (0, vitest_1.afterAll)(async () => {
        // Clean up test data
        if (testInventoryId) {
            await models_1.MaintenanceLog.destroy({ where: { inventory_id: testInventoryId } });
        }
        if (testBhpId) {
            await models_1.Bhp.destroy({ where: { id: testBhpId } });
        }
        await models_1.Inventory.destroy({ where: { id: testInventoryId }, force: true });
        await models_1.Room.destroy({ where: { id: testRoomId } });
    });
});
