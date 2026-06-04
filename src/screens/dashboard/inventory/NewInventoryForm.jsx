import React, { useState } from 'react';
import { useStore, useToast, Icon } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function NewInventoryForm() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'Elektronik',
    room_id: state.rooms?.[0]?.id || '',
    condition: 'Baik',
    acquired_date: new Date().toISOString().substring(0, 10),
    value: '',
    serial: '',
    specs: ''
  });
  
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast('Kode Barcode dan Nama Aset wajib diisi', 'warn');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value) || 0,
        room_id: form.room_id ? parseInt(form.room_id) : null
      };
      
      const res = await apiFetch('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (res.data) {
        toast('Aset baru berhasil ditambahkan', 'ok');
        // Fetch inventory to refresh
        const invRes = await apiFetch('/inventory');
        if (invRes.data) {
          const inv = invRes.data.map(i => ({
            id: i.id,
            code: i.code,
            name: i.name,
            cat: i.category,
            room: i.Room?.name || 'Gudang',
            cond: i.condition || 'Baik',
            last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
            acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
            value: i.value || 0,
            serial: i.serial || '-',
            specs: i.specs || '-'
          }));
          dispatch({ type: 'SET_INVENTORY', inventory: inv });
        }
        dispatch({ type: 'CLOSE_DRAWER' });
      }
    } catch (err) {
      toast('Gagal menambahkan aset: ' + err.message, 'warn');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="drawer-head">
        <div>
          <h2>Tambah Aset Baru</h2>
          <p>Daftarkan aset baru ke dalam inventaris sistem.</p>
        </div>
      </div>
      
      <div className="drawer-body">
        <form id="new-inv-form" onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="field">
            <div className="field-lbl">Kode Barcode / QR Manual <span className="req">*</span></div>
            <p className="text-xs text-ink-3 mb-2 leading-relaxed">Pindai atau ketik nomor seri barcode kampus secara manual (contoh: LK-001).</p>
            <input 
              className="input text-lg font-mono tracking-wider" 
              value={form.code} 
              onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
              placeholder="Scan Barcode Disini..." 
              autoFocus
            />
          </div>
          
          <div className="field">
            <div className="field-lbl">Nama Aset <span className="req">*</span></div>
            <input 
              className="input" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Contoh: Mikroskop Olympus" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <div className="field-lbl">Kategori</div>
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="Elektronik">Elektronik</option>
                <option value="Furniture">Furniture</option>
                <option value="Optik">Alat Optik</option>
                <option value="Komputer">Komputer</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="field">
              <div className="field-lbl">Kondisi</div>
              <select className="input" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                <option value="Baik">Baik</option>
                <option value="Perlu cek">Perlu cek</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>
          </div>
          
          <div className="field">
            <div className="field-lbl">Penempatan Ruangan</div>
            <select className="input" value={form.room_id} onChange={e => setForm({...form, room_id: e.target.value})}>
              <option value="">(Belum ditentukan / Gudang)</option>
              {state.rooms?.map(r => (
                <option key={r.id} value={r.id}>{r.name} - {r.code}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <div className="field-lbl">Tanggal Diperoleh</div>
              <input type="date" className="input" value={form.acquired_date} onChange={e => setForm({...form, acquired_date: e.target.value})} />
            </div>
            <div className="field">
              <div className="field-lbl">Nilai Aset (Rp)</div>
              <input type="number" className="input mono" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="0" />
            </div>
          </div>
          
          <div className="field">
            <div className="field-lbl">Serial Number (S/N)</div>
            <input className="input mono" value={form.serial} onChange={e => setForm({...form, serial: e.target.value})} placeholder="Opsi Pabrik" />
          </div>
          
          <div className="field">
            <div className="field-lbl">Spesifikasi Detail</div>
            <textarea className="input min-h-[80px]" value={form.specs} onChange={e => setForm({...form, specs: e.target.value})} placeholder="Contoh: Core i7, 16GB RAM..." />
          </div>
        </form>
      </div>
      
      <div className="drawer-foot">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}>Batal</button>
        <button type="submit" form="new-inv-form" className="btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Aset'}
        </button>
      </div>
    </>
  );
}
