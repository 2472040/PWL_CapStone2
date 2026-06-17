import { describe, it, expect, vi } from 'vitest';
import { inventoryReducer, initialInventoryState } from './inventoryStore';
import type {
  AppStoreState,
  InventoryItem,
  MaintenanceLog,
  BhpItem,
  AppAction,
} from './store.types';

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 1,
  code: 'INV-001',
  name: 'Microscope',
  cat: 'Optics',
  room: 'Lab A',
  roomId: 1,
  cond: 'Baik',
  last: '2024-01-01',
  acquired: '2020-01-01',
  value: 5000,
  serial: 'SN-001',
  specs: '10x zoom',
  ...overrides,
});

const makeBhp = (overrides: Partial<BhpItem> = {}): BhpItem => ({
  id: 'BHP-001',
  dbId: 1,
  name: 'Gloves',
  unit: 'box',
  stock: 100,
  min: 10,
  lastIn: '2024-01-01',
  cat: 'Safety',
  ...overrides,
});

const makeLog = (overrides: Partial<MaintenanceLog> = {}): MaintenanceLog => ({
  id: 1,
  asset: 'INV-001',
  action: 'Cleaned',
  cond: 'Baik',
  bhp: [],
  date: '2024-06-01',
  name: 'Technician A',
  tech: 'Tech A',
  ...overrides,
});

const baseState: AppStoreState = {
  ...initialInventoryState,
  role: 'admin',
  currentUser: null,
  pendingReviewCount: 0,
  theme: 'dark',
  accent: 'auto',
  density: 'comfortable',
  drafts: [],
  bhp: [makeBhp()],
  screen: 'dashboard',
  users: [],
  rooms: [],
  drawer: null,
  modal: null,
  mobileSidebarOpen: false,
  dispatch: vi.fn(),
};

describe('inventoryReducer', () => {
  it('returns null for unknown actions', () => {
    const result = inventoryReducer(baseState, { type: 'UNKNOWN_ACTION' } as unknown as AppAction);
    expect(result).toBeNull();
  });

  it('handles SET_INVENTORY', () => {
    const items = [makeItem(), makeItem({ id: 2, code: 'INV-002', name: 'Centrifuge' })];
    const result = inventoryReducer(baseState, { type: 'SET_INVENTORY', inventory: items });
    expect(result).toEqual({ inventory: items });
  });

  it('handles UPDATE_ASSET_LABEL for matching item', () => {
    const state = { ...baseState, inventory: [makeItem()] };
    const result = inventoryReducer(state, {
      type: 'UPDATE_ASSET_LABEL',
      code: 'INV-001',
      patch: { name: 'Updated Microscope', cond: 'Perlu cek' },
    });
    expect(result!.inventory![0].name).toBe('Updated Microscope');
    expect(result!.inventory![0].cond).toBe('Perlu cek');
  });

  it('handles UPDATE_ASSET_LABEL without affecting non-matching items', () => {
    const items = [makeItem(), makeItem({ id: 2, code: 'INV-002', name: 'Centrifuge' })];
    const state = { ...baseState, inventory: items };
    const result = inventoryReducer(state, {
      type: 'UPDATE_ASSET_LABEL',
      code: 'INV-001',
      patch: { name: 'Updated' },
    });
    expect(result!.inventory![1].name).toBe('Centrifuge');
  });

  it('handles SET_MAINT_LOGS', () => {
    const logs = [makeLog(), makeLog({ id: 2, action: 'Repaired' })];
    const result = inventoryReducer(baseState, { type: 'SET_MAINT_LOGS', logs });
    expect(result).toEqual({ maintLog: logs });
  });

  it('handles ADD_MAINT_LOG - adds log and updates inventory condition', () => {
    const inv = makeItem({ cond: 'Baik' });
    const state = { ...baseState, inventory: [inv], maintLog: [] };
    const log = makeLog({ cond: 'Rusak' });
    const result = inventoryReducer(state, { type: 'ADD_MAINT_LOG', log });

    expect(result!.maintLog).toHaveLength(1);
    expect(result!.maintLog![0]).toEqual(log);
    expect(result!.inventory![0].cond).toBe('Rusak');
    expect(result!.inventory![0].last).toBe('baru saja');
  });

  it('handles ADD_MAINT_LOG - deducts BHP stock', () => {
    const bhp = makeBhp({ stock: 50 });
    const state = { ...baseState, bhp: [bhp], inventory: [makeItem()], maintLog: [] };
    const log = makeLog({
      bhp: [{ id: 'BHP-001', qty: 10, unit: 'box' }],
    });
    const result = inventoryReducer(state, { type: 'ADD_MAINT_LOG', log });

    expect(result!.bhp![0].stock).toBe(40);
  });

  it('handles ADD_MAINT_LOG - BHP stock does not go below zero', () => {
    const bhp = makeBhp({ stock: 5 });
    const state = { ...baseState, bhp: [bhp], inventory: [makeItem()], maintLog: [] };
    const log = makeLog({
      bhp: [{ id: 'BHP-001', qty: 10, unit: 'box' }],
    });
    const result = inventoryReducer(state, { type: 'ADD_MAINT_LOG', log });

    expect(result!.bhp![0].stock).toBe(0);
  });

  it('handles ADD_MAINT_LOG - returns null when log is undefined', () => {
    const result = inventoryReducer(baseState, { type: 'ADD_MAINT_LOG' });
    expect(result).toBeNull();
  });

  it('handles ADD_MAINT_LOG - does not modify BHP for non-matching ids', () => {
    const bhp = makeBhp({ id: 'BHP-999', stock: 50 });
    const state = { ...baseState, bhp: [bhp], inventory: [makeItem()], maintLog: [] };
    const log = makeLog({
      bhp: [{ id: 'BHP-001', qty: 10, unit: 'box' }],
    });
    const result = inventoryReducer(state, { type: 'ADD_MAINT_LOG', log });

    expect(result!.bhp![0].stock).toBe(50);
  });
});
