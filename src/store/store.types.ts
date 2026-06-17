export type UserRole = 'sysadmin' | 'staflab' | 'admin' | 'kalab' | 'kaprodi';

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
}

export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  cat: string;
  room: string;
  roomId: number | null;
  cond: 'Baik' | 'Perlu cek' | 'Maintenance' | 'Rusak';
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
  approval?: 'ok' | 'rejected' | null;
  received?: boolean;
  receivedDate?: string | null;
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
}

export interface MaintBhpUse {
  id: string;
  qty: number;
}

export interface MaintenanceLog {
  id?: number;
  asset: string; // asset code
  action: string;
  cond: 'Baik' | 'Perlu cek' | 'Maintenance' | 'Rusak';
  bhp: MaintBhpUse[];
  date?: string;
}

export interface AppAction {
  type: string;
  [key: string]: any;
}
