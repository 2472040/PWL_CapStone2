import type {
  ApiDraftResponse,
  ApiDraftItemResponse,
  ApiBhpResponse,
  ApiMaintenanceLogResponse,
  ApiInventoryResponse,
  DraftItem,
  Draft,
  BhpItem,
  MaintenanceLog,
  InventoryItem,
} from '../../store/store.types';

export function mapDraftItem(it: ApiDraftItemResponse): DraftItem {
  return {
    ...it,
    approval:
      it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null,
    received: (it.receivings && it.receivings.length > 0) || undefined,
    receivedDate:
      it.receivings && it.receivings.length > 0
        ? new Date(it.receivings[0].received_date).toLocaleDateString('id-ID')
        : null,
  };
}

export function mapDraft(d: ApiDraftResponse): Draft {
  return {
    ...d,
    status: d.status as Draft['status'],
    by: d.creator?.name || 'Kepala Lab',
    role: d.creator?.role || 'kalab',
    submitted: d.submitted_at
      ? new Date(d.submitted_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '-',
    items: d.items?.map(mapDraftItem) || [],
  };
}

export function mapBhp(b: ApiBhpResponse): BhpItem {
  return {
    id: b.code || b.id.toString(),
    dbId: b.id,
    name: b.name,
    unit: b.unit,
    stock: parseFloat(String(b.stock)) || 0,
    min: parseFloat(String(b.min_stock)) || 0,
    lastIn: b.last_in || '-',
    cat: b.category || 'General',
  };
}

export function mapMaintLog(l: ApiMaintenanceLogResponse): MaintenanceLog {
  return {
    id: l.id,
    date: new Date(l.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    asset: l.Inventory?.code || '',
    name: l.Inventory?.name,
    action: l.action,
    tech: l.technician?.name || 'Teknisi',
    cond: l.condition_after,
    bhp:
      l.bhpUsed?.map((bu) => ({
        id: bu.Bhp?.code || String(bu.bhp_id),
        qty: parseFloat(String(bu.qty_used)) || 0,
        unit: bu.Bhp?.unit || 'pcs',
      })) || [],
  };
}

export function mapInventory(i: ApiInventoryResponse): InventoryItem {
  return {
    id: i.id,
    code: i.code,
    name: i.name,
    cat: i.category,
    room: i.Room?.name || 'Gudang',
    roomId: i.room_id || (i.Room ? i.Room.id : null),
    cond: i.condition || 'Baik',
    last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
    acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
    value: i.value || 0,
    serial: i.serial || '-',
    specs: i.specs || '-',
  };
}
