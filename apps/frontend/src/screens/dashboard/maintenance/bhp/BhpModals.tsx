import { createPortal } from 'react-dom';
import { Icon } from '../../../../components/app-shell';
import { BhpItem } from '../../../../store/store.types';

export interface RestockRow {
  bhpId: string;
  qty: string | number;
  unit: string;
  price: string | number;
}

function formatThousand(val: any) {
  if (val === undefined || val === null || val === '') return '';
  const numString = String(val).replace(/\D/g, ''); // strip non-digits
  if (!numString) return '';
  return Number(numString).toLocaleString('id-ID'); // formats with dot separators in Indonesian locale
}

// ── 1. AJUKAN RESTOCK PORTAL (Staf Lab) ──
interface BhpRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  bhpItems: BhpItem[];
  restockTitle: string;
  setRestockTitle: (title: string) => void;
  restockRows: RestockRow[];
  setRestockRows: (rows: RestockRow[] | ((prev: RestockRow[]) => RestockRow[])) => void;
  submittingRestock: boolean;
  onSubmit: () => void;
}

export function BhpRequestModal({
  isOpen,
  onClose,
  bhpItems,
  restockTitle,
  setRestockTitle,
  restockRows,
  setRestockRows,
  submittingRestock,
  onSubmit,
}: BhpRequestModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '520px',
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          padding: '28px',
        }}
      >
        <div className="flex between aic mb-4">
          <h3 className="text-lg fw-6">Ajukan Restock BHP</h3>
          <button className="x-btn" onClick={onClose} disabled={submittingRestock}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <p className="text-xs text-3 mb-4" style={{ lineHeight: 1.5 }}>
          Pengajuan akan dikirim sebagai draf pengadaan ke <strong>Kaprodi</strong> untuk di-review
          dan disetujui sebelum barang bisa diterima.
        </p>

        <div className="field mb-3">
          <div className="field-lbl">Judul Pengajuan</div>
          <input
            className="input"
            value={restockTitle}
            onChange={(e) => setRestockTitle(e.target.value)}
            disabled={submittingRestock}
          />
        </div>

        <div className="flex between aic mb-2">
          <div className="field-lbl m-0">Item BHP ({restockRows.length})</div>
          <button
            className="btn sm"
            onClick={() =>
              setRestockRows((r) => [
                ...r,
                {
                  bhpId: bhpItems[0]?.id || '',
                  qty: '',
                  unit: bhpItems[0]?.unit || 'pcs',
                  price: '',
                },
              ])
            }
            disabled={submittingRestock}
          >
            <Icon name="plus" size={11} /> Tambah
          </button>
        </div>

        <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
          {restockRows.map((row, i) => {
            return (
              <div
                key={i}
                className="card compact mb-2 p-3"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex gap-2 aic mb-2">
                  <select
                    className="select flex-1"
                    value={row.bhpId}
                    onChange={(e) => {
                      const found = bhpItems.find((b) => b.id === e.target.value);
                      setRestockRows((r) =>
                        r.map((x, j) =>
                          j === i ? { ...x, bhpId: e.target.value, unit: found?.unit || 'pcs' } : x
                        )
                      );
                    }}
                    disabled={submittingRestock}
                  >
                    {bhpItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (stok: {b.stock} {b.unit})
                      </option>
                    ))}
                  </select>
                  <button
                    className="x-btn"
                    onClick={() => setRestockRows((r) => r.filter((_, j) => j !== i))}
                    disabled={submittingRestock || restockRows.length <= 1}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    className="input mono flex-1"
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) =>
                      setRestockRows((r) =>
                        r.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x))
                      )
                    }
                    placeholder="Jumlah"
                    disabled={submittingRestock}
                  />
                  <span className="flex aic text-xs text-3 mono" style={{ minWidth: '30px' }}>
                    {row.unit}
                  </span>
                  <input
                    className="input mono flex-1"
                    type="text"
                    value={formatThousand(row.price)}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setRestockRows((r) =>
                        r.map((x, j) => (j === i ? { ...x, price: clean } : x))
                      );
                    }}
                    placeholder="Harga satuan (Rp)"
                    disabled={submittingRestock}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn" onClick={onClose} disabled={submittingRestock}>
            Batal
          </button>
          <button className="btn primary" disabled={submittingRestock} onClick={onSubmit}>
            {submittingRestock ? (
              'Mengirim...'
            ) : (
              <>
                <Icon name="arrow" size={13} /> Ajukan ke Kaprodi
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── 2. PENGURANGAN STOK MODAL (Staf Lab) ──
interface BhpReductionModalProps {
  item: BhpItem | null;
  onClose: () => void;
  reductionQty: string;
  setReductionQty: (qty: string) => void;
  reductionReason: string;
  setReductionReason: (reason: string) => void;
  reducing: boolean;
  onSubmit: () => void;
}

export function BhpReductionModal({
  item,
  onClose,
  reductionQty,
  setReductionQty,
  reductionReason,
  setReductionReason,
  reducing,
  onSubmit,
}: BhpReductionModalProps) {
  if (!item) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#111113',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '440px',
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          borderRadius: '16px',
          padding: '28px',
          animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="minus" size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-ink)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Pengurangan Stok BHP
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                margin: '4px 0 0',
                lineHeight: 1.5,
              }}
            >
              Kurangi stok <b>{item.name}</b> · Stok saat ini:{' '}
              <b>
                {item.stock} {item.unit}
              </b>
            </p>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-lbl">
            Jumlah Pengurangan ({item.unit}) <span className="req">*</span>
          </label>
          <input
            className="input"
            type="number"
            step="any"
            min="0.1"
            max={item.stock}
            value={reductionQty}
            onChange={(e) => setReductionQty(e.target.value)}
            placeholder={`Maksimal ${item.stock} ${item.unit}`}
            disabled={reducing}
            autoFocus
            style={{ width: '100%' }}
          />
        </div>

        <div className="field" style={{ marginBottom: 24 }}>
          <label className="field-lbl">
            Keterangan / Keperluan Penggunaan <span className="req">*</span>
          </label>
          <textarea
            className="textarea"
            value={reductionReason}
            onChange={(e) => setReductionReason(e.target.value)}
            placeholder="Contoh: Digunakan untuk bahan praktikum Jaringan Komputer Kelas B"
            disabled={reducing}
            rows={3}
            style={{ width: '100%' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
          }}
        >
          <button className="btn" onClick={onClose} disabled={reducing}>
            Batal
          </button>
          <button className="btn danger" onClick={onSubmit} disabled={reducing}>
            {reducing ? 'Mengurangi...' : 'Kurangi Stok'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── 3. PENAMBAHAN STOK MODAL (Admin) ──
interface BhpRestockModalProps {
  item: BhpItem | null;
  onClose: () => void;
  restockQty: string;
  setRestockQty: (qty: string) => void;
  restockReason: string;
  setRestockReason: (reason: string) => void;
  restocking: boolean;
  onSubmit: () => void;
}

export function BhpRestockModal({
  item,
  onClose,
  restockQty,
  setRestockQty,
  restockReason,
  setRestockReason,
  restocking,
  onSubmit,
}: BhpRestockModalProps) {
  if (!item) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#111113',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '440px',
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          borderRadius: '16px',
          padding: '28px',
          animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="plus" size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-ink)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Penambahan Stok BHP
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                margin: '4px 0 0',
                lineHeight: 1.5,
              }}
            >
              Tambah stok <b>{item.name}</b> · Stok saat ini:{' '}
              <b>
                {item.stock} {item.unit}
              </b>
            </p>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-lbl">
            Jumlah Penambahan ({item.unit}) <span className="req">*</span>
          </label>
          <input
            className="input"
            type="number"
            step="any"
            min="0.1"
            value={restockQty}
            onChange={(e) => setRestockQty(e.target.value)}
            placeholder="Misal: 50"
            disabled={restocking}
            autoFocus
            style={{ width: '100%' }}
          />
        </div>

        <div className="field" style={{ marginBottom: 24 }}>
          <label className="field-lbl">
            Keterangan / Sumber Barang <span className="req">*</span>
          </label>
          <textarea
            className="textarea"
            value={restockReason}
            onChange={(e) => setRestockReason(e.target.value)}
            placeholder="Contoh: Pengadaan semester ganjil 2025/2026, PO #12345"
            disabled={restocking}
            rows={3}
            style={{ width: '100%' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
          }}
        >
          <button className="btn" onClick={onClose} disabled={restocking}>
            Batal
          </button>
          <button className="btn primary" onClick={onSubmit} disabled={restocking}>
            {restocking ? 'Menambahkan...' : 'Tambah Stok'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
