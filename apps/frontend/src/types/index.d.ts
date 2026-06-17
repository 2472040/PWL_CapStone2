/**
 * API / Database model types.
 * These represent the raw shapes returned from the backend API,
 * before being mapped into UI models in src/store/store.types.ts.
 *
 * UI-facing types (InventoryItem, BhpItem, Draft, etc.) are re-exported
 * from store.types.ts for convenience.
 */

// Re-export UI model types for components that import from '@/types'
export type {
  User,
  UserRole,
  Room,
  InventoryItem,
  BhpItem,
  DraftItem,
  Draft,
  MaintenanceLog,
  MaintBhpUse,
  ConditionStatus,
  DrawerPayload,
  ModalPayload,
  AppAction,
  AppStoreState,
} from '../store/store.types';

// ── API response shapes (raw DB models) ─────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: 'sysadmin' | 'staflab' | 'admin' | 'kalab' | 'kaprodi';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface ApiRoom {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiInventoryItem {
  id: number;
  code: string;
  name: string;
  category: string;
  room_id: number;
  condition: 'Baik' | 'Perlu cek' | 'Maintenance' | 'Rusak';
  acquired_date: string;
  value: number;
  serial?: string;
  specs?: string;
  last_checked?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiBhpItem {
  id: number;
  code: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  unit: string;
  last_in?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDraftApproval {
  id: number;
  draft_item_id: number;
  approved_by: number;
  status: 'approved' | 'rejected';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDraftItem {
  id: number;
  draft_id: number;
  kind: 'Inventaris' | 'BHP';
  name: string;
  qty: number;
  unit: string;
  price: number;
  link?: string;
  replaces?: string;
  approval?: ApiDraftApproval;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDraft {
  id: number;
  code: string;
  title: string;
  created_by: number;
  status: 'draft' | 'submitted' | 'finalized' | 'completed';
  submitted_at?: string;
  finalized_at?: string;
  finalized_by?: number;
  creator?: ApiUser;
  finalizer?: ApiUser;
  items?: ApiDraftItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ApiMaintenanceLog {
  id: number;
  code: string;
  inventory_id: number;
  tech_user_id: number;
  action: string;
  condition_after: 'Baik' | 'Perlu cek' | 'Maintenance' | 'Rusak';
  date: string;
  created_at?: string;
  updated_at?: string;
}
