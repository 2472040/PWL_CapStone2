export interface User {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: 'sysadmin' | 'staflab' | 'admin' | 'kalab' | 'kaprodi';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Room {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
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

export interface BhpItem {
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

export interface DraftApproval {
  id: number;
  draft_item_id: number;
  approved_by: number;
  status: 'approved' | 'rejected';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DraftItem {
  id: number;
  draft_id: number;
  kind: 'Inventaris' | 'BHP';
  name: string;
  qty: number;
  unit: string;
  price: number;
  link?: string;
  replaces?: string;
  approval?: DraftApproval;
  created_at?: string;
  updated_at?: string;
}

export interface Draft {
  id: number;
  code: string;
  title: string;
  created_by: number;
  status: 'draft' | 'submitted' | 'finalized' | 'completed';
  submitted_at?: string;
  finalized_at?: string;
  finalized_by?: number;
  creator?: User;
  finalizer?: User;
  items?: DraftItem[];
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceLog {
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

declare module 'pdfmake/build/pdfmake';
declare module 'pdfmake/build/vfs_fonts';

