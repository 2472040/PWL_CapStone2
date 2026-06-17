import { describe, it, expect, vi } from 'vitest';
import { procurementReducer, initialProcurementState } from './procurementStore';
import type { AppStoreState, Draft, DraftItem, BhpItem, AppAction } from './store.types';

const makeDraftItem = (overrides: Partial<DraftItem> = {}): DraftItem => ({
  id: 1,
  draft_id: 1,
  kind: 'bhp',
  name: 'Gloves Box',
  qty: 10,
  unit: 'box',
  price: 50000,
  ...overrides,
});

const makeDraft = (overrides: Partial<Draft> = {}): Draft => ({
  id: 1,
  code: 'DR-001',
  title: 'Monthly Supplies',
  created_by: 1,
  status: 'draft',
  items: [makeDraftItem()],
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

const baseState: AppStoreState = {
  ...initialProcurementState,
  role: 'admin',
  currentUser: null,
  pendingReviewCount: 0,
  theme: 'dark',
  accent: 'auto',
  density: 'comfortable',
  inventory: [],
  maintLog: [],
  bhp: [makeBhp()],
  screen: 'dashboard',
  users: [],
  rooms: [],
  drawer: null,
  modal: null,
  mobileSidebarOpen: false,
  dispatch: vi.fn(),
};

describe('procurementReducer', () => {
  it('returns null for unknown actions', () => {
    const result = procurementReducer(baseState, { type: 'UNKNOWN' } as unknown as AppAction);
    expect(result).toBeNull();
  });

  it('handles SET_DRAFTS', () => {
    const drafts = [makeDraft(), makeDraft({ id: 2, code: 'DR-002' })];
    const result = procurementReducer(baseState, { type: 'SET_DRAFTS', drafts });
    expect(result).toEqual({ drafts });
  });

  it('handles SET_APPROVAL - toggles approval on', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, {
      type: 'SET_APPROVAL',
      code: 'DR-001',
      itemId: 1,
      value: 'ok',
    });
    expect(result!.drafts![0].items[0].approval).toBe('ok');
  });

  it('handles SET_APPROVAL - toggles same value off', () => {
    const draft = makeDraft({
      items: [makeDraftItem({ approval: 'ok' })],
    });
    const state = { ...baseState, drafts: [draft] };
    const result = procurementReducer(state, {
      type: 'SET_APPROVAL',
      code: 'DR-001',
      itemId: 1,
      value: 'ok',
    });
    expect(result!.drafts![0].items[0].approval).toBeNull();
  });

  it('handles APPROVE_ALL', () => {
    const draft = makeDraft({
      items: [
        makeDraftItem({ id: 1 }),
        makeDraftItem({ id: 2, approval: 'no' }),
        makeDraftItem({ id: 3, approval: 'ok' }),
      ],
    });
    const state = { ...baseState, drafts: [draft] };
    const result = procurementReducer(state, { type: 'APPROVE_ALL', code: 'DR-001' });
    const items = result!.drafts![0].items;
    expect(items[0].approval).toBe('ok');
    expect(items[1].approval).toBe('no'); // keeps existing 'no' since || 'ok' only applies to falsy
    expect(items[2].approval).toBe('ok');
  });

  it('handles FINALIZE_DRAFT', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, { type: 'FINALIZE_DRAFT', code: 'DR-001' });
    expect(result!.drafts![0].status).toBe('finalized');
  });

  it('handles MARK_RECEIVED - toggles received on', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, {
      type: 'MARK_RECEIVED',
      code: 'DR-001',
      itemId: 1,
      date: '2024-06-01',
    });
    const item = result!.drafts![0].items[0];
    expect(item.received).toBe(true);
    expect(item.receivedDate).toBe('2024-06-01');
  });

  it('handles MARK_RECEIVED - toggles received off', () => {
    const draft = makeDraft({
      items: [makeDraftItem({ received: true, receivedDate: '2024-06-01' })],
    });
    const state = { ...baseState, drafts: [draft] };
    const result = procurementReducer(state, {
      type: 'MARK_RECEIVED',
      code: 'DR-001',
      itemId: 1,
      date: '2024-07-01',
    });
    const item = result!.drafts![0].items[0];
    expect(item.received).toBe(false);
    expect(item.receivedDate).toBeNull();
  });

  it('handles COMPLETE_DRAFT', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, { type: 'COMPLETE_DRAFT', code: 'DR-001' });
    expect(result!.drafts![0].status).toBe('completed');
  });

  it('handles REQUEST_REVISION', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, {
      type: 'REQUEST_REVISION',
      code: 'DR-001',
      notes: 'Fix quantities',
    });
    expect(result!.drafts![0].status).toBe('revision');
    expect(result!.drafts![0].revision_notes).toBe('Fix quantities');
  });

  it('handles ADD_DRAFT_ITEM', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const newItem = makeDraftItem({ id: 99, name: 'New Item' });
    const result = procurementReducer(state, {
      type: 'ADD_DRAFT_ITEM',
      code: 'DR-001',
      item: newItem,
    });
    expect(result!.drafts![0].items).toHaveLength(2);
    expect(result!.drafts![0].items[1].name).toBe('New Item');
  });

  it('handles UPDATE_DRAFT_ITEM', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, {
      type: 'UPDATE_DRAFT_ITEM',
      code: 'DR-001',
      itemId: 1,
      item: makeDraftItem({ name: 'Updated Gloves' }),
    });
    expect(result!.drafts![0].items[0].name).toBe('Updated Gloves');
  });

  it('handles REMOVE_DRAFT_ITEM', () => {
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, {
      type: 'REMOVE_DRAFT_ITEM',
      code: 'DR-001',
      itemId: 1,
    });
    expect(result!.drafts![0].items).toHaveLength(0);
  });

  it('handles NEW_DRAFT', () => {
    const newDraft = makeDraft({ id: 2, code: 'DR-002', title: 'Urgent Order' });
    const state = { ...baseState, drafts: [makeDraft()] };
    const result = procurementReducer(state, { type: 'NEW_DRAFT', draft: newDraft });
    expect(result!.drafts).toHaveLength(2);
    expect(result!.drafts![0].code).toBe('DR-002');
  });

  it('handles SET_BHP', () => {
    const bhpList = [makeBhp(), makeBhp({ id: 'BHP-002', name: 'Masks' })];
    const result = procurementReducer(baseState, { type: 'SET_BHP', bhp: bhpList });
    expect(result).toEqual({ bhp: bhpList });
  });

  it('handles BHP_DELTA - adds stock', () => {
    const state = { ...baseState, bhp: [makeBhp({ stock: 50 })] };
    const result = procurementReducer(state, { type: 'BHP_DELTA', id: 'BHP-001', delta: 20 });
    expect(result!.bhp![0].stock).toBe(70);
  });

  it('handles BHP_DELTA - stock does not go below zero', () => {
    const state = { ...baseState, bhp: [makeBhp({ stock: 5 })] };
    const result = procurementReducer(state, { type: 'BHP_DELTA', id: 'BHP-001', delta: -20 });
    expect(result!.bhp![0].stock).toBe(0);
  });

  it('handles BHP_RESTOCK', () => {
    const state = { ...baseState, bhp: [makeBhp({ stock: 10 })] };
    const result = procurementReducer(state, {
      type: 'BHP_RESTOCK',
      id: 'BHP-001',
      amount: 50,
      date: '2024-06-15',
    });
    expect(result!.bhp![0].stock).toBe(60);
    expect(result!.bhp![0].lastIn).toBe('2024-06-15');
  });

  it('does not affect other drafts for SET_APPROVAL', () => {
    const drafts = [
      makeDraft({ code: 'DR-001' }),
      makeDraft({ code: 'DR-002', items: [makeDraftItem({ id: 1 })] }),
    ];
    const state = { ...baseState, drafts };
    const result = procurementReducer(state, {
      type: 'SET_APPROVAL',
      code: 'DR-001',
      itemId: 1,
      value: 'ok',
    });
    expect(result!.drafts![1].items[0].approval).toBeUndefined();
  });
});
