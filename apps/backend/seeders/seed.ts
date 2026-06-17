import bcrypt from 'bcryptjs';
import {
  sequelize,
  User,
  Room,
  Inventory,
  Bhp,
  Draft,
  DraftItem,
  DraftApproval,
  MaintenanceLog,
  MaintenanceBhp,
  AuditLog,
} from '../models';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database terhubung');

    // Force sync (drops & recreates all tables)
    await sequelize.sync({ force: true });
    console.log('✅ Tabel di-reset');

    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // =============================================
    // 1. USERS
    // =============================================
    const users = await User.bulkCreate([
      {
        name: 'Anindita Hartono',
        email: 'anindita@kampus.id',
        password: hashed,
        role: 'sysadmin',
        initials: 'AH',
        status: 'active',
      },
      {
        name: 'Dr. Pradipta Wirasena',
        email: 'pradipta@kampus.id',
        password: hashed,
        role: 'kalab',
        initials: 'PW',
        status: 'active',
      },
      {
        name: 'Dr. Sari Wulandari',
        email: 'sari@kampus.id',
        password: hashed,
        role: 'kalab',
        initials: 'SW',
        status: 'active',
      },
      {
        name: 'Prof. Hendra Saputra',
        email: 'hendra@kampus.id',
        password: hashed,
        role: 'kaprodi',
        initials: 'HS',
        status: 'active',
      },
      {
        name: 'Faqih Ramadhan',
        email: 'faqih@kampus.id',
        password: hashed,
        role: 'admin',
        initials: 'FR',
        status: 'active',
      },
      {
        name: 'Tirta Halim',
        email: 'tirta@kampus.id',
        password: hashed,
        role: 'admin',
        initials: 'TH',
        status: 'active',
      },
      {
        name: 'Maharani Larasati',
        email: 'maharani@kampus.id',
        password: hashed,
        role: 'staflab',
        initials: 'ML',
        status: 'active',
      },
      {
        name: 'Daud Saputra',
        email: 'daud@kampus.id',
        password: hashed,
        role: 'staflab',
        initials: 'DS',
        status: 'active',
      },
      {
        name: 'Eggy Pratama',
        email: 'eggy@kampus.id',
        password: hashed,
        role: 'staflab',
        initials: 'EP',
        status: 'paused',
      },
    ]);
    console.log(`✅ ${users.length} users seeded`);

    // Helper to find user by email
    const u = (email: string) => users.find((x: any) => x.email === email)!;

    // =============================================
    // 2. ROOMS
    // =============================================
    const rooms = await Room.bulkCreate([
      {
        code: 'R-301',
        name: 'Lab Algoritma',
        floor: 3,
        capacity: 30,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-302',
        name: 'Lab Basis Data',
        floor: 3,
        capacity: 30,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-303',
        name: 'Lab Jaringan',
        floor: 3,
        capacity: 24,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-205',
        name: 'Lab Elektro',
        floor: 2,
        capacity: 20,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-204',
        name: 'Lab Embedded',
        floor: 2,
        capacity: 16,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-202',
        name: 'Studio UI/UX',
        floor: 2,
        capacity: 20,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-401',
        name: 'Lab AI & Robotika',
        floor: 4,
        capacity: 24,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-101',
        name: 'Maker Space',
        floor: 1,
        capacity: 30,
        pic_user_id: u('maharani@kampus.id').id,
      },
      {
        code: 'R-102',
        name: 'Server Room',
        floor: 1,
        capacity: 8,
        pic_user_id: u('maharani@kampus.id').id,
      },
    ]);
    console.log(`✅ ${rooms.length} rooms seeded`);

    const r = (code: string) => rooms.find((x: any) => x.code === code)!;

    // =============================================
    // 3. INVENTORY
    // =============================================
    const inventoryData = [
      {
        code: 'LK-WS-001',
        name: 'Workstation Dev #01',
        category: 'Workstation',
        room_id: r('R-301').id,
        condition: 'Baik',
        acquired_date: '2024-08-01',
        value: 28000000,
        serial: 'WS001-Z4',
        specs: 'Ryzen 7 / 32GB / RTX 3060',
      },
      {
        code: 'LK-WS-002',
        name: 'Workstation Dev #02',
        category: 'Workstation',
        room_id: r('R-301').id,
        condition: 'Baik',
        acquired_date: '2024-08-01',
        value: 28000000,
        serial: 'WS002-Z4',
        specs: 'Ryzen 7 / 32GB / RTX 3060',
      },
      {
        code: 'LK-WS-003',
        name: 'Workstation Dev #03',
        category: 'Workstation',
        room_id: r('R-301').id,
        condition: 'Perlu cek',
        acquired_date: '2024-08-01',
        value: 28000000,
        serial: 'WS003-Z4',
        specs: 'Ryzen 7 / 32GB / RTX 3060',
      },
      {
        code: 'LK-SW-014',
        name: 'Switch Cisco Catalyst 2960',
        category: 'Networking',
        room_id: r('R-303').id,
        condition: 'Perlu cek',
        acquired_date: '2022-01-01',
        value: 9500000,
        serial: 'CSC-2960-24',
        specs: '24-port Gigabit, managed',
      },
      {
        code: 'LK-SW-015',
        name: 'Router Mikrotik CCR2004',
        category: 'Networking',
        room_id: r('R-303').id,
        condition: 'Baik',
        acquired_date: '2024-03-01',
        value: 15500000,
        serial: 'MT-CCR2004',
        specs: '16-port SFP+, 4x2.5G',
      },
      {
        code: 'LK-OS-008',
        name: 'Oscilloscope Rigol DS1054Z',
        category: 'Instrumen',
        room_id: r('R-205').id,
        condition: 'Maintenance',
        acquired_date: '2023-05-01',
        value: 5800000,
        serial: 'RIG-1054-22',
        specs: '50MHz, 4-ch, 1GSa/s',
      },
      {
        code: 'LK-OS-009',
        name: 'Function Gen Siglent SDG1032X',
        category: 'Instrumen',
        room_id: r('R-205').id,
        condition: 'Baik',
        acquired_date: '2023-05-01',
        value: 6200000,
        serial: 'SIG-1032X',
        specs: '30MHz, dual-ch',
      },
      {
        code: 'LK-RB-002',
        name: 'Robot Arm Edu UR3-mini',
        category: 'Robotika',
        room_id: r('R-401').id,
        condition: 'Baik',
        acquired_date: '2024-11-01',
        value: 32000000,
        serial: 'UR3-MINI-04',
        specs: '6-DOF, 3kg payload',
      },
      {
        code: 'LK-RB-003',
        name: 'TurtleBot 3 Burger',
        category: 'Robotika',
        room_id: r('R-401').id,
        condition: 'Baik',
        acquired_date: '2024-11-01',
        value: 7500000,
        serial: 'TB3-B-12',
        specs: 'Raspberry Pi 4, LiDAR',
      },
      {
        code: 'LK-3D-001',
        name: 'Printer 3D Prusa MK4',
        category: 'Fabrikasi',
        room_id: r('R-101').id,
        condition: 'Baik',
        acquired_date: '2024-06-01',
        value: 18000000,
        serial: 'PRUSA-MK4-01',
        specs: '250x210x220 mm, PLA/PETG',
      },
      {
        code: 'LK-3D-002',
        name: 'Printer 3D Bambu X1C',
        category: 'Fabrikasi',
        room_id: r('R-101').id,
        condition: 'Baik',
        acquired_date: '2025-02-01',
        value: 22000000,
        serial: 'BAMBU-X1C-02',
        specs: '256x256x256, multi-mat',
      },
      {
        code: 'LK-LC-001',
        name: 'Laser Cutter K40',
        category: 'Fabrikasi',
        room_id: r('R-101').id,
        condition: 'Perlu cek',
        acquired_date: '2023-08-01',
        value: 14500000,
        serial: 'K40-AX-01',
        specs: '40W CO2, 300x200mm',
      },
    ];
    const inventoryItems = await Inventory.bulkCreate(
      inventoryData.map((i) => ({ ...i, last_checked: new Date() }))
    );
    console.log(`✅ ${inventoryItems.length} inventory items seeded`);

    const inv = (code: string) => inventoryItems.find((x: any) => x.code === code)!;

    // =============================================
    // 4. BHP
    // =============================================
    const bhpItems = await Bhp.bulkCreate([
      {
        code: 'B-001',
        name: 'Kabel UTP Cat6 Belden',
        unit: 'm',
        stock: 187,
        min_stock: 50,
        last_in: '2026-03-12',
        category: 'Networking',
        room_id: r('R-303').id,
      },
      {
        code: 'B-002',
        name: 'Konektor RJ45 Cat6',
        unit: 'pcs',
        stock: 24,
        min_stock: 100,
        last_in: '2026-02-08',
        category: 'Networking',
        room_id: r('R-303').id,
      },
      {
        code: 'B-003',
        name: 'Thermal Paste Arctic MX-6',
        unit: 'tube',
        stock: 7,
        min_stock: 4,
        last_in: '2026-04-02',
        category: 'Workstation',
        room_id: r('R-301').id,
      },
      {
        code: 'B-004',
        name: 'Filament PLA Polymaker putih',
        unit: 'kg',
        stock: 12.4,
        min_stock: 5,
        last_in: '2026-04-21',
        category: 'Fabrikasi',
        room_id: r('R-101').id,
      },
      {
        code: 'B-005',
        name: 'Filament PETG hitam',
        unit: 'kg',
        stock: 3.1,
        min_stock: 5,
        last_in: '2026-03-30',
        category: 'Fabrikasi',
        room_id: r('R-101').id,
      },
      {
        code: 'B-006',
        name: 'Solder Tin 0.8mm Goot',
        unit: 'roll',
        stock: 8,
        min_stock: 3,
        last_in: '2026-04-05',
        category: 'Instrumen',
        room_id: r('R-205').id,
      },
      {
        code: 'B-007',
        name: 'Header Pin 2.54mm 40p',
        unit: 'strip',
        stock: 64,
        min_stock: 30,
        last_in: '2026-04-05',
        category: 'Embedded',
        room_id: r('R-204').id,
      },
      {
        code: 'B-008',
        name: 'Microcontroller Arduino Uno R3',
        unit: 'pcs',
        stock: 28,
        min_stock: 20,
        last_in: '2026-04-21',
        category: 'Embedded',
        room_id: r('R-204').id,
      },
      {
        code: 'B-009',
        name: 'Cleaning Alcohol IPA 99% 1L',
        unit: 'btl',
        stock: 5,
        min_stock: 3,
        last_in: '2026-04-15',
        category: 'General',
        room_id: r('R-102').id,
      },
      {
        code: 'B-010',
        name: 'Microfiber Cloth (pack 10)',
        unit: 'pack',
        stock: 1,
        min_stock: 2,
        last_in: '2026-02-20',
        category: 'General',
        room_id: r('R-102').id,
      },
    ]);
    console.log(`✅ ${bhpItems.length} BHP items seeded`);

    const b = (code: string) => bhpItems.find((x: any) => x.code === code)!;

    // =============================================
    // 5. DRAFTS & ITEMS
    // =============================================
    const draft1 = await Draft.create({
      code: 'PRC-2026-LK01',
      title: 'Pengadaan Lab Komputer 2026',
      created_by: u('pradipta@kampus.id').id,
      status: 'submitted',
      submitted_at: '2026-05-14',
    });
    await DraftItem.bulkCreate([
      {
        draft_id: draft1.id,
        kind: 'Inventaris',
        name: 'Workstation Dev — Ryzen 9 / 64GB / RTX 4070',
        qty: 12,
        unit: 'unit',
        price: 32500000,
        link: 'shopee.co.id/tech-id',
        replaces: 'PC-LK-2019 (12 unit, rusak)',
      },
      {
        draft_id: draft1.id,
        kind: 'Inventaris',
        name: 'Monitor IPS 27" 1440p 144Hz',
        qty: 12,
        unit: 'unit',
        price: 4200000,
        link: 'tokopedia.com/dell',
      },
      {
        draft_id: draft1.id,
        kind: 'Inventaris',
        name: 'Managed Switch 24-port Gigabit Aruba',
        qty: 2,
        unit: 'unit',
        price: 8900000,
        link: 'distributor-net.id',
        replaces: 'SW-LK-2017 (Cisco SG200, EOL)',
      },
      {
        draft_id: draft1.id,
        kind: 'BHP',
        name: 'Kabel UTP Cat6 Belden roll 305m',
        qty: 3,
        unit: 'roll',
        price: 2750000,
        link: 'distributor-net.id',
      },
      {
        draft_id: draft1.id,
        kind: 'BHP',
        name: 'Konektor RJ45 Cat6 (pack 100)',
        qty: 10,
        unit: 'pack',
        price: 165000,
        link: 'tokopedia.com',
      },
      {
        draft_id: draft1.id,
        kind: 'Inventaris',
        name: 'Oscilloscope Rigol DS1054Z',
        qty: 2,
        unit: 'unit',
        price: 5800000,
        link: 'rs-online.id',
      },
      {
        draft_id: draft1.id,
        kind: 'BHP',
        name: 'Thermal Paste Arctic MX-6 (8g)',
        qty: 6,
        unit: 'tube',
        price: 145000,
        link: 'tokopedia.com',
      },
    ]);

    const draft2 = await Draft.create({
      code: 'PRC-2026-LK02',
      title: 'Pengadaan Lab AI & Robotika Q3 2026',
      created_by: u('sari@kampus.id').id,
      status: 'finalized',
      submitted_at: '2026-05-08',
      finalized_at: '2026-05-18',
      finalized_by: u('hendra@kampus.id').id,
    });
    const d2Items = await DraftItem.bulkCreate([
      {
        draft_id: draft2.id,
        kind: 'Inventaris',
        name: 'Workstation AI — RTX 4090 / 96GB RAM',
        qty: 4,
        unit: 'unit',
        price: 65000000,
        link: 'distributor-id',
      },
      {
        draft_id: draft2.id,
        kind: 'Inventaris',
        name: 'NVIDIA Jetson Orin Nano Dev Kit',
        qty: 8,
        unit: 'unit',
        price: 8500000,
        link: 'nvidia-id',
      },
      {
        draft_id: draft2.id,
        kind: 'BHP',
        name: 'Wire Female Jumper 40p',
        qty: 12,
        unit: 'pack',
        price: 25000,
        link: 'tokopedia.com',
      },
    ]);

    // Approvals for draft2
    for (const item of d2Items) {
      await DraftApproval.create({
        draft_item_id: item.id,
        approved_by: u('hendra@kampus.id').id,
        status: 'approved',
      });
    }

    const draft3 = await Draft.create({
      code: 'PRC-2025-LK04',
      title: 'Pengadaan Lab Jaringan 2025',
      created_by: u('pradipta@kampus.id').id,
      status: 'completed',
      submitted_at: '2025-09-21',
      finalized_at: '2025-10-01',
      finalized_by: u('hendra@kampus.id').id,
    });
    await DraftItem.create({
      draft_id: draft3.id,
      kind: 'Inventaris',
      name: 'Router Mikrotik CCR2004',
      qty: 1,
      unit: 'unit',
      price: 15500000,
      link: 'mikrotik-id',
    });

    console.log('✅ 3 drafts with items seeded');

    // =============================================
    // 6. MAINTENANCE LOGS
    // =============================================
    const m1 = await MaintenanceLog.create({
      code: 'M-2026-014',
      inventory_id: inv('LK-OS-008').id,
      tech_user_id: u('maharani@kampus.id').id,
      action: 'Kalibrasi & cleaning probe',
      condition_after: 'Maintenance',
      date: '2026-05-18',
    });
    await MaintenanceBhp.create({
      maintenance_log_id: m1.id,
      bhp_id: b('B-009').id,
      qty_used: 0.15,
    });

    const m2 = await MaintenanceLog.create({
      code: 'M-2026-013',
      inventory_id: inv('LK-SW-014').id,
      tech_user_id: u('daud@kampus.id').id,
      action: 'Reseat semua kabel, blow dust',
      condition_after: 'Perlu cek',
      date: '2026-05-16',
    });

    const m3 = await MaintenanceLog.create({
      code: 'M-2026-012',
      inventory_id: inv('LK-LC-001').id,
      tech_user_id: u('maharani@kampus.id').id,
      action: 'Replace lensa fokus',
      condition_after: 'Baik',
      date: '2026-05-10',
    });
    await MaintenanceBhp.create({ maintenance_log_id: m3.id, bhp_id: b('B-010').id, qty_used: 1 });

    const m4 = await MaintenanceLog.create({
      code: 'M-2026-011',
      inventory_id: inv('LK-WS-003').id,
      tech_user_id: u('daud@kampus.id').id,
      action: 'Repaste CPU + bersihkan fan',
      condition_after: 'Baik',
      date: '2026-05-05',
    });
    await MaintenanceBhp.create({ maintenance_log_id: m4.id, bhp_id: b('B-003').id, qty_used: 1 });
    await MaintenanceBhp.create({
      maintenance_log_id: m4.id,
      bhp_id: b('B-009').id,
      qty_used: 0.05,
    });

    console.log('✅ 4 maintenance logs seeded');

    // =============================================
    // 7. AUDIT LOGS
    // =============================================
    await AuditLog.bulkCreate([
      {
        user_id: u('maharani@kampus.id').id,
        action: 'maintenance.create',
        target: 'LK-OS-008',
        ip: '10.20.3.41',
      },
      {
        user_id: u('maharani@kampus.id').id,
        action: 'bhp.decrement',
        target: 'B-009 (-0.15)',
        ip: '10.20.3.41',
      },
      {
        user_id: u('faqih@kampus.id').id,
        action: 'receiving.confirm',
        target: 'PRC-2026-LK02 · 8 unit',
        ip: '10.20.3.12',
      },
      {
        user_id: u('hendra@kampus.id').id,
        action: 'draft.finalize',
        target: 'PRC-2026-LK02',
        ip: '10.20.3.5',
      },
      {
        user_id: u('pradipta@kampus.id').id,
        action: 'draft.submit',
        target: 'PRC-2026-LK01',
        ip: '10.20.3.18',
      },
      {
        user_id: u('pradipta@kampus.id').id,
        action: 'draft.update',
        target: 'PRC-2026-LK01 · +1 item',
        ip: '10.20.3.18',
      },
      {
        user_id: u('anindita@kampus.id').id,
        action: 'user.create',
        target: 'Tirta Halim (admin)',
        ip: '10.20.3.1',
      },
      {
        user_id: u('daud@kampus.id').id,
        action: 'maintenance.create',
        target: 'LK-SW-014',
        ip: '10.20.3.41',
      },
    ]);
    console.log('✅ 8 audit logs seeded');

    console.log('\n🎉 Seeding selesai!');
    console.log('📧 Login dengan email manapun, password: ' + DEFAULT_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding gagal:', err);
    process.exit(1);
  }
}

seed();
