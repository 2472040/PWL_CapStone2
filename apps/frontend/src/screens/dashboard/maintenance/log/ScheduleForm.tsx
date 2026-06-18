import { useState } from 'react';
import { useStore, useToast, Icon } from '../../../../components/app-shell';
import { apiFetch } from '../../../../services/api';

export function ScheduleForm({ payload, close }: { payload?: any; close: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const isEdit = !!payload?.id;
  const [inventoryId, setInventoryId] = useState(payload?.inventory_id ? String(payload.inventory_id) : '');
  const [title, setTitle] = useState(payload?.title || '');
  const [frequencyDays, setFrequencyDays] = useState(payload?.frequency_days ? String(payload.frequency_days) : '30');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(
    payload?.next_maintenance_date ? payload.next_maintenance_date.substring(0, 10) : new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = useState(payload?.notes || '');
  const [status, setStatus] = useState(payload?.status || 'scheduled');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!isEdit && !inventoryId) {
      toast('Pilih aset terlebih dahulu', 'warn');
      return;
    }
    if (!title.trim()) {
      toast('Judul jadwal tidak boleh kosong', 'warn');
      return;
    }
    const days = parseInt(frequencyDays);
    if (isNaN(days) || days <= 0) {
      toast('Frekuensi harus berupa angka positif (hari)', 'warn');
      return;
    }
    if (!nextMaintenanceDate) {
      toast('Pilih tanggal jadwal berikutnya', 'warn');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEdit ? `/maintenance-schedules/${payload.id}` : '/maintenance-schedules';
      const method = isEdit ? 'PUT' : 'POST';

      const body = {
        inventory_id: isEdit ? undefined : parseInt(inventoryId),
        title,
        frequency_days: days,
        next_maintenance_date: nextMaintenanceDate,
        notes,
        status: isEdit ? status : undefined,
      };

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(body),
      });

      if (res.data) {
        if (isEdit) {
          dispatch({ type: 'UPDATE_MAINT_SCHEDULE', schedule: res.data });
          toast('Jadwal pemeliharaan berhasil diperbarui!', 'ok');
        } else {
          dispatch({ type: 'ADD_MAINT_SCHEDULE', schedule: res.data });
          toast('Jadwal pemeliharaan baru berhasil dibuat!', 'ok');
        }
        close();
      }
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan jadwal pemeliharaan', 'warn');
    } finally {
      setLoading(false);
    }
  }

  const sortedInventory = [...state.inventory].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title" id="drawer-title">
          {isEdit ? 'Ubah Jadwal Preventif' : 'Buat Jadwal Preventif Baru'}
        </div>
        <button className="x-btn" onClick={close} disabled={loading}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="drawer-body flex flex-col gap-4">
        {/* Select Asset */}
        <div className="field">
          <label className="field-lbl">Pilih Aset Laboratorium</label>
          <select
            className="select"
            value={inventoryId}
            onChange={(e) => setInventoryId(e.target.value)}
            disabled={loading || isEdit}
          >
            <option value="">-- Pilih Aset --</option>
            {sortedInventory.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.code}] {item.name} ({item.room})
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="field">
          <label className="field-lbl">Nama Jadwal / Judul Kegiatan</label>
          <input
            className="input"
            type="text"
            placeholder="Contoh: Kalibrasi Mikroskop Tahunan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Frequency Days & Next Date */}
        <div className="form-row flex gap-4">
          <div className="field flex-1">
            <label className="field-lbl">Frekuensi Ulang (Hari)</label>
            <input
              className="input mono"
              type="number"
              min="1"
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="field flex-1">
            <label className="field-lbl">Jadwal Berikutnya</label>
            <input
              className="input"
              type="date"
              value={nextMaintenanceDate}
              onChange={(e) => setNextMaintenanceDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Status Dropdown (Edit Mode Only) */}
        {isEdit && (
          <div className="field">
            <label className="field-lbl">Status Jadwal</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
            >
              <option value="scheduled">Akan Datang (Scheduled)</option>
              <option value="overdue">Terlambat (Overdue)</option>
              <option value="completed">Selesai (Completed)</option>
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="field">
          <label className="field-lbl">Catatan Tambahan (Opsional)</label>
          <textarea
            className="input text-area"
            style={{ minHeight: '80px', resize: 'vertical' }}
            placeholder="Spesifikasi pemeliharaan khusus, PIC pihak ketiga, dll..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>
          Batal
        </button>
        <button className="btn primary" onClick={save} disabled={loading}>
          <Icon name="check" size={13} strokeWidth={2.4} />
          {isEdit ? ' Perbarui Jadwal' : ' Simpan Jadwal'}
        </button>
      </div>
    </>
  );
}
