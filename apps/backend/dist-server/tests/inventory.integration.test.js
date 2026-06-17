"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const models_1 = require("../models");
(0, vitest_1.describe)('Inventory CRUD Integration Test', () => {
    let adminToken = null;
    let staffToken = null;
    let sysadminToken = null;
    let testRoomId = null;
    let testInventoryId = null;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Log in as admin
        const resAdmin = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'faqih@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resAdmin.status).toBe(200);
        adminToken = resAdmin.body.data.token;
        // 2. Log in as staflab (requires staflab credentials from seeding)
        const resStaff = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'maharani@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resStaff.status).toBe(200);
        staffToken = resStaff.body.data.token;
        // 3. Log in as sysadmin
        const resSys = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/login')
            .send({ email: 'anindita@kampus.id', password: 'password123' });
        (0, vitest_1.expect)(resSys.status).toBe(200);
        sysadminToken = resSys.body.data.token;
        // 4. Create a test room first
        await models_1.Room.destroy({ where: { code: 'TEST-ROOM-INV' } });
        const room = await models_1.Room.create({
            code: 'TEST-ROOM-INV',
            name: 'Test Room for Inventory Integration',
            floor: 3,
            capacity: 30,
        });
        testRoomId = room.id;
    });
    (0, vitest_1.it)('should successfully perform full inventory CRUD cycle', async () => {
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
        const resCreate = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/inventory')
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(inventoryPayload);
        (0, vitest_1.expect)(resCreate.status).toBe(201);
        (0, vitest_1.expect)(resCreate.body.data).toBeDefined();
        (0, vitest_1.expect)(resCreate.body.data.name).toBe(inventoryPayload.name);
        testInventoryId = resCreate.body.data.id;
        // B. Get List of Inventories
        const resList = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/inventory')
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resList.status).toBe(200);
        const found = resList.body.data.find((item) => item.id === testInventoryId);
        (0, vitest_1.expect)(found).toBeDefined();
        // C. Get Inventory Detail
        const resDetail = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/inventory/${testInventoryId}`)
            .set('Authorization', `Bearer ${staffToken}`);
        (0, vitest_1.expect)(resDetail.status).toBe(200);
        (0, vitest_1.expect)(resDetail.body.data.serial).toBe('SN-VITEST-999');
        // D. Update Inventory Item (Admin)
        const updatePayload = {
            name: 'Microscope Vitest Pro Upgraded',
            condition: 'Perlu cek',
        };
        const resUpdate = await (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/inventory/${testInventoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf')
            .send(updatePayload);
        (0, vitest_1.expect)(resUpdate.status).toBe(200);
        (0, vitest_1.expect)(resUpdate.body.data.name).toBe('Microscope Vitest Pro Upgraded');
        (0, vitest_1.expect)(resUpdate.body.data.condition).toBe('Perlu cek');
        // E. Soft Delete Inventory Item (Admin)
        const resDelete = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/inventory/${testInventoryId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf');
        (0, vitest_1.expect)(resDelete.status).toBe(200);
        // F. Verify soft-deleted item is not visible in standard list
        const resListAfter = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/inventory')
            .set('Authorization', `Bearer ${staffToken}`);
        const foundAfter = resListAfter.body.data.find((item) => item.id === testInventoryId);
        (0, vitest_1.expect)(foundAfter).toBeUndefined();
        // G. Restore Inventory Item (Sysadmin)
        const resRestore = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/inventory/${testInventoryId}/restore`)
            .set('Authorization', `Bearer ${sysadminToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf');
        (0, vitest_1.expect)(resRestore.status).toBe(200);
        // H. Verify restored item is visible again
        const resListAfterRestore = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/inventory')
            .set('Authorization', `Bearer ${staffToken}`);
        const foundAfterRestore = resListAfterRestore.body.data.find((item) => item.id === testInventoryId);
        (0, vitest_1.expect)(foundAfterRestore).toBeDefined();
        // Clean up test data
        await models_1.Inventory.destroy({ where: { id: testInventoryId }, force: true });
        await models_1.Room.destroy({ where: { id: testRoomId } });
    });
    (0, vitest_1.it)('should block unauthorized roles from deleting inventory', async () => {
        // Staff lab cannot delete inventory items
        const resDeleteBad = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/inventory/1`)
            .set('Authorization', `Bearer ${staffToken}`)
            .set('Cookie', 'csrfToken=test_csrf')
            .set('x-csrf-token', 'test_csrf');
        (0, vitest_1.expect)(resDeleteBad.status).toBe(403);
    });
    (0, vitest_1.it)('should block sysadmin from reading inventory list and detail', async () => {
        const resListBad = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/inventory')
            .set('Authorization', `Bearer ${sysadminToken}`);
        (0, vitest_1.expect)(resListBad.status).toBe(403);
        const resDetailBad = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/inventory/1')
            .set('Authorization', `Bearer ${sysadminToken}`);
        (0, vitest_1.expect)(resDetailBad.status).toBe(403);
    });
});
