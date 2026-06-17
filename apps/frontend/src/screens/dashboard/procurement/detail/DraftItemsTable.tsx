import { Icon } from '../../../../components/app-shell';
import { fmtRp } from '../../../../utils/formatter';

function formatThousand(val: any) {
  if (val === undefined || val === null || val === '') return '';
  const numString = String(val).replace(/\D/g, ''); // strip non-digits
  if (!numString) return '';
  return Number(numString).toLocaleString('id-ID'); // formats with dot separators in Indonesian locale
}

interface DraftItemsTableProps {
  draft: any;
  mode: string;
  locked: boolean;
  setApproval: (itemId: any, value: any) => Promise<void>;
  totals: any;
  onRemoveItem: (itemId: any) => void;
  editingItemId: any;
  editFields: any;
  setEditFields: any;
  startEdit: (it: any) => void;
  onSaveItem: (itemId: any) => Promise<void>;
  onCancelEdit: () => void;
}

export function DraftItemsTable({
  draft,
  mode,
  locked,
  setApproval,
  totals,
  onRemoveItem,
  editingItemId,
  editFields,
  setEditFields,
  startEdit,
  onSaveItem,
  onCancelEdit,
}: DraftItemsTableProps) {
  const isStaflab = mode === 'staflab';
  return (
    <>
      <div className="items-table with-actions" data-reveal>
        <div className="items-table-head">
          <div>Tipe Barang</div>
          <div>Nama Item</div>
          <div>Jumlah</div>
          <div className="ar">Subtotal (Harga Satuan)</div>
          <div className="ar">{mode === 'kaprodi' && !locked ? 'Keputusan' : 'Aksi'}</div>
        </div>
        {draft.items.map((it: any) => {
          const st = it.approval;
          const isEditing = editingItemId === it.id;

          if (isEditing) {
            return (
              <div
                key={it.id}
                className="item-row editing"
                style={{
                  background: 'rgba(183,148,255,0.04)',
                  borderColor: 'rgba(167,139,250,0.3)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: '8px',
                }}
              >
                {/* Col 1: Tipe */}
                <div>
                  {!isStaflab ? (
                    <select
                      className="select sm"
                      value={editFields.kind}
                      onChange={(e) =>
                        setEditFields((prev: any) => ({ ...prev, kind: e.target.value }))
                      }
                      style={{ width: '100%' }}
                    >
                      <option value="Inventaris">Inventaris</option>
                      <option value="BHP">BHP</option>
                    </select>
                  ) : (
                    <span
                      className="chip"
                      style={{
                        background: 'rgba(245,210,126,0.12)',
                        borderColor: 'rgba(245,210,126,0.3)',
                        color: 'var(--color-gold)',
                      }}
                    >
                      BHP
                    </span>
                  )}
                </div>
                {/* Col 2: Nama Item */}
                <div className="flex flex-col gap-1">
                  <input
                    className="input sm font-bold"
                    value={editFields.name}
                    onChange={(e) =>
                      setEditFields((prev: any) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nama barang..."
                  />
                  <input
                    className="input sm text-xs mono"
                    value={editFields.link || ''}
                    onChange={(e) =>
                      setEditFields((prev: any) => ({ ...prev, link: e.target.value }))
                    }
                    placeholder="Link pembelian"
                  />
                  {!isStaflab && editFields.kind === 'Inventaris' && (
                    <input
                      className="input sm text-xs"
                      value={editFields.replaces || ''}
                      onChange={(e) =>
                        setEditFields((prev: any) => ({ ...prev, replaces: e.target.value }))
                      }
                      placeholder="Mengganti aset"
                    />
                  )}
                </div>
                {/* Col 3: Jumlah */}
                <div className="flex flex-col gap-1">
                  <input
                    className="input sm mono text-center"
                    type="number"
                    min="1"
                    value={editFields.qty}
                    onChange={(e) =>
                      setEditFields((prev: any) => ({ ...prev, qty: e.target.value }))
                    }
                  />
                  <input
                    className="input sm text-xs text-center"
                    value={editFields.unit}
                    onChange={(e) =>
                      setEditFields((prev: any) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="satuan"
                  />
                </div>
                {/* Col 4: Subtotal */}
                <div className="flex flex-col gap-1 text-right">
                  <input
                    className="input sm mono text-right"
                    type="text"
                    value={formatThousand(editFields.price)}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, '');
                      setEditFields((prev: any) => ({ ...prev, price: cleanVal }));
                    }}
                    placeholder="Harga (Rp)"
                  />
                  <span className="text-xs text-violet font-semibold">
                    Sub:{' '}
                    {fmtRp(
                      (parseInt(editFields.qty) || 0) *
                        (parseFloat(String(editFields.price).replace(/\D/g, '')) || 0)
                    )}
                  </span>
                </div>
                {/* Col 5: Aksi */}
                <div className="item-actions">
                  <button
                    className="act-btn text-green hover:bg-green/10"
                    onClick={() => onSaveItem(it.id)}
                    title="Simpan"
                  >
                    <Icon name="check" size={13} strokeWidth={2.4} />
                  </button>
                  <button
                    className="act-btn text-rose hover:bg-rose/10"
                    onClick={onCancelEdit}
                    title="Batal"
                  >
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            );
          }

          const displayUnit =
            !it.unit || it.unit.trim() === '1' || it.unit.trim() === '' ? 'unit' : it.unit;

          return (
            <div
              key={it.id}
              className={`item-row ${st === 'ok' ? 'approved' : ''} ${st === 'no' ? 'rejected' : ''}`}
            >
              <div className={`item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>
                {it.kind === 'Inventaris' ? 'Inventaris' : 'BHP'}
              </div>
              <div>
                <div className="item-name">{it.name}</div>
                <div className="item-sub">
                  <span className="mono" title="ID Item Database">
                    ID: #{it.id}
                  </span>
                  {it.link && (
                    <>
                      <span>·</span>
                      <a
                        href={it.link.startsWith('http') ? it.link : `https://${it.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--role-accent, var(--color-violet))',
                          textDecoration: 'underline',
                        }}
                      >
                        Link Pembelian
                      </a>
                    </>
                  )}
                  {it.replaces && (
                    <>
                      <span>·</span>
                      <span className="replaces">↺ Ganti: {it.replaces}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="item-qty">
                {it.qty}{' '}
                <span
                  className="text-3"
                  style={{ fontSize: '11px', opacity: 0.75, fontWeight: 'normal' }}
                >
                  {displayUnit}
                </span>
              </div>
              <div>
                <div className="item-price">{fmtRp(it.qty * it.price)}</div>
                <div className="item-price">
                  <span className="sub">@ {fmtRp(it.price)}</span>
                </div>
              </div>
              <div className="item-actions">
                {mode === 'kaprodi' && !locked ? (
                  <>
                    <button
                      className={`act-btn ${st === 'no' ? 'no-active' : ''}`}
                      onClick={() => setApproval(it.id, 'no')}
                      title="Tolak"
                    >
                      <Icon name="x" size={13} strokeWidth={2.4} />
                    </button>
                    <button
                      className={`act-btn ${st === 'ok' ? 'ok-active' : ''}`}
                      onClick={() => setApproval(it.id, 'ok')}
                      title="Setujui"
                    >
                      <Icon name="check" size={13} strokeWidth={2.4} />
                    </button>
                  </>
                ) : (mode === 'kalab' || mode === 'staflab') &&
                  (draft.status === 'draft' || draft.status === 'revision') ? (
                  <div className="flex gap-1.5">
                    <button
                      className="act-btn text-violet hover:bg-violet/10"
                      onClick={() => startEdit(it)}
                      title="Ubah Item"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    <button
                      className="act-btn text-rose hover:bg-rose/10"
                      onClick={() => onRemoveItem(it.id)}
                      title="Hapus Item"
                    >
                      <Icon name="x" size={13} strokeWidth={2.4} />
                    </button>
                  </div>
                ) : (
                  <button className="act-btn" title="Detail">
                    <Icon name="eye" size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary-row" data-reveal>
        <div className="summary-tile">
          <div className="summary-tile-lbl">Total Inventaris</div>
          <div className="summary-tile-val violet">{fmtRp(totals.inv)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">Total BHP</div>
          <div className="summary-tile-val cyan">{fmtRp(totals.bhp)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">{mode === 'kaprodi' ? 'Disetujui' : 'Grand total'}</div>
          <div className="summary-tile-val green">
            {mode === 'kaprodi' ? fmtRp(totals.approved) : fmtRp(totals.all)}
          </div>
        </div>
        {mode === 'kaprodi' && (
          <div className="summary-tile">
            <div className="summary-tile-lbl">Δ Penghematan</div>
            <div className="summary-tile-val gold">{fmtRp(totals.all - totals.approved)}</div>
          </div>
        )}
      </div>
    </>
  );
}
