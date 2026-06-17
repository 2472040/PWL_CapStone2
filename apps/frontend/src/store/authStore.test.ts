import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authReducer, initialAuthState } from './authStore';
import type { AppAction, AppStoreState } from './store.types';

// Mock localStorage and document for side-effects
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

const baseState: AppStoreState = {
  ...initialAuthState,
  inventory: [],
  maintLog: [],
  drafts: [],
  bhp: [],
  screen: 'dashboard',
  users: [],
  rooms: [],
  drawer: null,
  modal: null,
  mobileSidebarOpen: false,
  dispatch: vi.fn(),
};

describe('authReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for unknown actions', () => {
    const result = authReducer(baseState, { type: 'UNKNOWN_ACTION' } as unknown as AppAction);
    expect(result).toBeNull();
  });

  it('handles SET_ROLE', () => {
    const result = authReducer(baseState, { type: 'SET_ROLE', role: 'sysadmin' });
    expect(result).toEqual({
      role: 'sysadmin',
      screen: 'dashboard',
      mobileSidebarOpen: false,
    });
  });

  it('handles SET_USER', () => {
    const user = { id: 1, name: 'Test', email: 'test@test.com', role: 'admin' as const };
    const result = authReducer(baseState, { type: 'SET_USER', user });
    expect(result).toEqual({ currentUser: user });
  });

  it('handles SET_PENDING_REVIEW_COUNT', () => {
    const result = authReducer(baseState, { type: 'SET_PENDING_REVIEW_COUNT', count: 5 });
    expect(result).toEqual({ pendingReviewCount: 5 });
  });

  it('handles SET_THEME and persists to localStorage', () => {
    const result = authReducer(baseState, { type: 'SET_THEME', theme: 'light' });
    expect(result).toEqual({ theme: 'light' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('loka-theme', 'light');
  });

  it('handles SET_ACCENT and persists to localStorage', () => {
    const result = authReducer(baseState, { type: 'SET_ACCENT', accent: 'violet' });
    expect(result).toEqual({ accent: 'violet' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('loka-accent', 'violet');
  });

  it('handles SET_DENSITY and persists to localStorage', () => {
    const result = authReducer(baseState, { type: 'SET_DENSITY', density: 'compact' });
    expect(result).toEqual({ density: 'compact' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('loka-density', 'compact');
  });
});
