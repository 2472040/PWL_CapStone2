export type UserRole = 'sysadmin' | 'staflab' | 'admin' | 'kalab' | 'kaprodi';

export type ConditionStatus = 'Baik' | 'Perlu cek' | 'Maintenance' | 'Rusak';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  initials?: string;
  status?: string;
  last_login?: string;
  lastLogin?: string;
  created_at?: string;
  createdAt?: string;
}

export interface Room {
  id: number;
  code: string;
  name: string;
  floor?: number;
  capacity?: number;
  pic_user_id?: number;
  assets?: number | string;
}

export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  cat: string;
  room: string;
  roomId: number | null;
  cond: ConditionStatus;
  last: string;
  acquired: string;
  value: number;
  serial: string;
  specs: string;
}

export interface BhpItem {
  id: string; // code or string id
  dbId: number;
  name: string;
  unit: string;
  stock: number;
  min: number;
  lastIn: string;
  cat: string;
  roomName?: string;
}

export interface DraftItem {
  id: number;
  draft_id: number;
  kind: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  link?: string;
  replaces?: string;
  approval?: 'ok' | 'no' | null;
  received?: boolean;
  receivedDate?: string | null;
  receivings?: any[];
}

export interface Draft {
  id: number;
  code: string;
  title: string;
  created_by: number;
  status: 'draft' | 'submitted' | 'finalized' | 'completed' | 'revision';
  revision_notes?: string | null;
  submitted_at?: string;
  finalized_at?: string;
  items: DraftItem[];
  // UI-mapped fields (added by AuthInitializer polling)
  by?: string;
  role?: string;
  submitted?: string;
}

export interface MaintBhpUse {
  id: string;
  qty: number;
  unit?: string;
}

export interface MaintenanceLog {
  id?: number;
  asset: string; // asset code
  action: string;
  cond: ConditionStatus;
  bhp: MaintBhpUse[];
  date?: string;
  name?: string;
  tech?: string;
}

// Drawer and Modal payload types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DrawerPayload {
  kind: string;
  payload?: Record<string, any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModalPayload {
  kind: string;
  payload?: Record<string, any>;
}

// ── Discriminated Union for all Redux-style actions ─────────────────────────

// Auth slice actions
interface AuthAction {
  type:
    | 'SET_ROLE'
    | 'SET_USER'
    | 'SET_PENDING_REVIEW_COUNT'
    | 'SET_THEME'
    | 'SET_ACCENT'
    | 'SET_DENSITY';
  role?: UserRole;
  user?: User;
  count?: number;
  theme?: string;
  accent?: string;
  density?: string;
}

// Inventory slice actions
interface InventoryAction {
  type: 'SET_INVENTORY' | 'UPDATE_ASSET_LABEL' | 'SET_MAINT_LOGS' | 'ADD_MAINT_LOG';
  inventory?: InventoryItem[];
  code?: string;
  patch?: Partial<InventoryItem>;
  logs?: MaintenanceLog[];
  log?: MaintenanceLog;
}

// Procurement slice actions
interface ProcurementAction {
  type:
    | 'SET_DRAFTS'
    | 'SET_APPROVAL'
    | 'APPROVE_ALL'
    | 'FINALIZE_DRAFT'
    | 'MARK_RECEIVED'
    | 'COMPLETE_DRAFT'
    | 'REQUEST_REVISION'
    | 'ADD_DRAFT_ITEM'
    | 'UPDATE_DRAFT_ITEM'
    | 'REMOVE_DRAFT_ITEM'
    | 'NEW_DRAFT'
    | 'SET_BHP'
    | 'BHP_DELTA'
    | 'BHP_RESTOCK';
  drafts?: Draft[];
  draft?: Draft;
  code?: string;
  itemId?: number;
  value?: 'ok' | 'no';
  date?: string;
  notes?: string;
  item?: DraftItem;
  bhp?: BhpItem[];
  id?: string;
  delta?: number;
  amount?: number;
}

// Global / UI / Admin actions
interface GlobalAction {
  type:
    | 'SET_SCREEN'
    | 'OPEN_DRAWER'
    | 'CLOSE_DRAWER'
    | 'SET_USERS'
    | 'SET_ROOMS'
    | 'ADD_USER'
    | 'TOGGLE_USER'
    | 'ADD_ROOM'
    | 'OPEN_MODAL'
    | 'CLOSE_MODAL'
    | 'TOGGLE_MOBILE_SIDEBAR'
    | 'CLOSE_MOBILE_SIDEBAR';
  screen?: string;
  drawer?: DrawerPayload;
  modal?: ModalPayload;
  users?: User[];
  rooms?: Room[];
  user?: User;
  room?: Room;
  id?: number;
}

export type AppAction = AuthAction | InventoryAction | ProcurementAction | GlobalAction;

// ── Full app store state interface ───────────────────────────────────────────

export interface AppStoreState {
  // Auth slice
  role: UserRole;
  currentUser: User | null;
  pendingReviewCount: number;
  theme: string;
  accent: string;
  density: string;

  // Inventory slice
  inventory: InventoryItem[];
  maintLog: MaintenanceLog[];

  // Procurement slice
  drafts: Draft[];
  bhp: BhpItem[];

  // Global / UI state
  screen: string;
  users: User[];
  rooms: Room[];
  drawer: DrawerPayload | null;
  modal: ModalPayload | null;
  mobileSidebarOpen: boolean;

  // Dispatch function (added by useAppStore)
  dispatch: (action: AppAction) => void;
}

// ── API Response types (for mapping in AuthInitializer polling) ──────────────

export interface ApiDraftResponse {
  id: number;
  code: string;
  title: string;
  created_by: number;
  status: string;
  submitted_at?: string;
  finalized_at?: string;
  creator?: { name: string; role: string };
  items?: ApiDraftItemResponse[];
}

export interface ApiDraftItemResponse {
  id: number;
  draft_id: number;
  kind: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  link?: string;
  replaces?: string;
  approval?: { status: string };
  receivings?: Array<{ received_date: string }>;
}

export interface ApiBhpResponse {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: string | number;
  min_stock: string | number;
  last_in?: string;
  category?: string;
}

export interface ApiMaintenanceLogResponse {
  id: number;
  code: string;
  date: string;
  action: string;
  condition_after: ConditionStatus;
  Inventory?: { code: string; name: string };
  technician?: { name: string };
  bhpUsed?: Array<{
    bhp_id: number;
    qty_used: string | number;
    Bhp?: { code: string; unit: string };
  }>;
}

export interface ApiInventoryResponse {
  id: number;
  code: string;
  name: string;
  category: string;
  room_id?: number;
  condition?: ConditionStatus;
  acquired_date?: string;
  value?: number;
  serial?: string;
  specs?: string;
  last_checked?: string;
  Room?: { id: number; name: string };
}

export interface DashboardStats {
  totalInventory: number;
  totalRooms: number;
  totalBhp: number;
  inventoryByCondition: {
    baik: number;
    perluCek: number;
    maintenance: number;
    rusak: number;
  };
  totalValue: number;
  lowStockAlerts: number;
  avgApprovalTimeHours: number;
  top3LowBhp: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    stock: number;
    min_stock: number;
    unit: string;
    pct: number;
  }>;
  maintLoadByRoom: Array<{
    id: number;
    code: string;
    name: string;
    count: number;
  }>;
  financialAnalytics?: Array<{
    month: string;
    requested: number;
    approved: number;
    saved: number;
  }>;
  totalUsers?: number;
  activeUsers?: number;
  pendingDrafts?: number;
  totalDrafts?: number;
  maintenanceThisMonth?: number;
  recentActivity: Array<{
    id: number;
    action: string;
    user_id: number;
    table_name?: string;
    record_id?: number;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    ts?: string;
    user?: string;
    target?: string;
    User?: {
      id: number;
      name: string;
      role: string;
    };
  }>;
}
