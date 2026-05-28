import React, { useState } from 'react';
import { useStore, useToast, Icon } from './app-shell.jsx';
import { apiFetch } from '../services/api.js';

export function BulkImportModal({ close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  function downloadTemplate() {
    const headers = 'code,name,category,room_id,condition,acquired_date,value,serial,specs\n';
    const row1 = 'LAB-COMP-001,PC Intel i7,Komputer,1,Baik,2026-05,12000000,SN1234567,RAM 16GB SSD 512GB\n';
    const row2 = 'LAB-TOOL-002,Multimeter Digital,Alat Ukur,2,Baik,2026-05,1500000,SN9876543,Akurasi Tinggi\n';
    
    const blob = new Blob([headers + row1 + row2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_lokalab.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      try {
        const parsed = parseCSV(text);
        validateItems(parsed);
      } catch (err) {
        toast('Gagal membaca file CSV: ' + err.message, 'warn');
      }
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) throw new Error('File CSV kosong atau hanya berisi header.');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const obj = {};
      headers.forEach((h, idx) => {
        let val = values[idx] || '';
        val = val.replace(/^["']|["']$/g, '').trim();
        obj[h] = val;
      });
      results.push(obj);
    }
    return results;
  }

  function validateItems(parsed) {
    const errs = [];
    const validated = parsed.map((it, idx) => {
      const rowNum = idx + 2;
      const itemErrors = [];
      
      if (!it.code) itemErrors.push('Kode barang kosong');
      if (!it.name) itemErrors.push('Nama barang kosong');
      if (!it.category) itemErrors.push('Kategori kosong');
      
      if (itemErrors.length > 0) {
        errs.push(`Baris ${rowNum}: ${itemErrors.join(', ')}`);
      }

      // Safe formatting
      return {
        code: it.code || '',
        name: it.name || '',
        category: it.category || '',
        room_id: it.room_id ? parseInt(it.room_id) || null : null,
        condition: it.condition || 'Baik',
        acquired_date: it.acquired_date || '',
        value: it.value ? parseFloat(it.value) || 0 : 0,
        serial: it.serial || '',
        specs: it.specs || '',
        isValid: itemErrors.length === 0
      };
    });

    setItems(validated);
    setErrors(errs);
  }

  async function triggerImport() {
    if (items.length === 0) {
      toast('Belum ada data untuk diimpor.', 'warn');
      return;
    }
    if (errors.length > 0) {
      toast('Ada kesalahan validasi data. Silakan perbaiki file CSV Anda.', 'warn');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/inventory/import', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      
      toast(res.message || `Berhasil mengimpor ${items.length} aset.`, 'ok');
      close();
    } catch (err) {
      toast(err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ minWidth: '460px', padding: '24px 20px' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 id="drawer-title" className="text-xl font-bold tracking-tight">Bulk Import Aset (CSV)</h2>
          <p className="text-xs text-ink-3 mt-1">Impor ratusan aset inventaris secara massal dalam hitungan detik.</p>
        </div>
        <button className="act-btn" onClick={close}><Icon name="x" size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
        {/* Step 1: Upload Card */}
        <div className="card compact flex flex-col items-center justify-center p-6 text-center" style={{ borderStyle: 'dashed', borderWidth: '1.5px', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <Icon name="download" size={32} className="text-violet mb-2" style={{ opacity: 0.7 }} />
          <p className="text-sm font-semibold">Silakan unduh template CSV terlebih dahulu</p>
          <p className="text-[11px] text-ink-3 mt-1 mb-4 leading-normal max-w-xs">Isi data sesuai kolom template agar format data sinkron dengan database.</p>
          <button className="btn sm" onClick={downloadTemplate}><Icon name="download" size={12} /> Unduh Template CSV</button>
        </div>

        {/* File Select */}
        <div className="card compact flex items-center justify-between p-4">
          <div className="flex flex-col">
            <span className="text-xs text-ink-3 uppercase font-semibold tracking-wider">File CSV Terpilih</span>
            <span className="text-sm font-medium mt-1 truncate max-w-[240px]">{fileName || 'Belum ada file dipilih'}</span>
          </div>
          <label className="btn primary sm cursor-pointer" style={{ margin: 0 }}>
            Pilih File
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Validation Output */}
        {items.length > 0 && (
          <div className="card compact flex-1 flex flex-col overflow-hidden p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-ink-3 uppercase font-semibold tracking-wider">Verifikasi Data ({items.length} Aset)</span>
              {errors.length > 0 ? (
                <span className="chip danger py-0.5 text-[11px]">{errors.length} Error</span>
              ) : (
                <span className="chip ok py-0.5 text-[11px]">Valid</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border border-surface rounded p-2 flex flex-col gap-1.5 max-h-[220px]" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-[12px] py-1 border-b border-surface last:border-0">
                  <div className="truncate max-w-[260px]">
                    <span className="mono text-[10px] font-bold text-violet bg-violet/10 px-1 rounded mr-2">{it.code || 'NULL'}</span>
                    <span className="font-medium">{it.name || 'NULL'}</span>
                  </div>
                  {it.isValid ? (
                    <span className="text-green text-xs font-medium flex items-center gap-1"><Icon name="check" size={11} /> OK</span>
                  ) : (
                    <span className="text-rose text-xs font-medium flex items-center gap-1"><Icon name="x" size={11} /> Error</span>
                  )}
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                <span className="text-[11px] text-rose font-bold uppercase tracking-wider">Kesalahan Validasi:</span>
                {errors.slice(0, 3).map((err, idx) => (
                  <span key={idx} className="text-[11px] text-rose/90 font-medium leading-normal">{err}</span>
                ))}
                {errors.length > 3 && <span className="text-[10px] text-rose/70 italic">...dan {errors.length - 3} kesalahan lainnya</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-surface">
        <button className="btn" onClick={close} disabled={loading}>Batal</button>
        <button className="btn primary" onClick={triggerImport} disabled={loading || items.length === 0 || errors.length > 0} style={{ minWidth: '120px' }}>
          {loading ? 'Mengimpor…' : 'Mulai Impor'}
        </button>
      </div>
    </div>
  );
}
