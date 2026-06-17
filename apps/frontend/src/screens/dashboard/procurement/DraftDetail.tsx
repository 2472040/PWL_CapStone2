import React, { useMemo, useState } from 'react';
import { useStore, useToast, D, Icon } from '../../../components/app-shell';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import { AdminReceiveGrid } from './ReceivingAdmin';
import { DraftItemsTable } from './detail/DraftItemsTable';
import { DraftActionsPanel } from './detail/DraftActionsPanel';

function formatThousand(val: any) {
  if (val === undefined || val === null || val === '') return '';
  const numString = String(val).replace(/\D/g, ''); // strip non-digits
  if (!numString) return '';
  return Number(numString).toLocaleString('id-ID'); // formats with dot separators in Indonesian locale
}

interface DraftDetailProps {
  draft: any;
  onBack: () => void;
  mode: string;
}

export function DraftDetail({ draft, onBack, mode }: DraftDetailProps) {
  const { dispatch } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const role = D.roles.find((r) => r.id === mode);
  const locked =
    draft.status === 'finalized' ||
    draft.status === 'completed' ||
    ((mode === 'kalab' || mode === 'staflab') && draft.status === 'submitted');
  const d = draft;
  const isStaflab = mode === 'staflab';

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Tipe',
      'Nama Item',
      'Jumlah',
      'Satuan',
      'Harga Satuan',
      'Subtotal',
      'Link Pembelian',
      'Mengganti Aset',
      'Status Persetujuan',
    ];
    const data = d.items.map((it: any) => [
      it.id,
      it.kind,
      it.name,
      it.qty,
      it.unit,
      it.price,
      it.qty * it.price,
      it.link || '',
      it.replaces || '',
      it.approval === 'ok' ? 'Disetujui' : it.approval === 'no' ? 'Ditolak' : 'Pending',
    ]);

    const csvRows = [
      headers.join(','),
      ...data.map((row: any) =>
        row
          .map((val: any) => {
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      ),
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Detail_Pengadaan_${d.code}_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Data CSV berhasil diunduh!', 'ok');
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    kind: isStaflab ? 'BHP' : 'Inventaris',
    name: '',
    qty: '',
    unit: 'unit',
    price: '',
    link: '',
    replaces: '',
  });

  const [editingItemId, setEditingItemId] = useState(null);
  const [editFields, setEditFields] = useState({
    kind: 'Inventaris',
    name: '',
    qty: '',
    unit: '',
    price: '',
    link: '',
    replaces: '',
  });

  const [deleteCandidateId, setDeleteCandidateId] = useState(null);

  function startEdit(it: any) {
    setEditingItemId(it.id);
    setEditFields({
      kind: it.kind,
      name: it.name,
      qty: String(it.qty),
      unit: it.unit,
      price: String(it.price),
      link: it.link || '',
      replaces: it.replaces || '',
    });
  }

  function handleCancelEdit() {
    setEditingItemId(null);
  }

  const totals = useMemo(() => {
    let inv = 0,
      bhp = 0,
      all = 0,
      approved = 0,
      received = 0;
    d.items.forEach((it: any) => {
      const sub = it.qty * it.price;
      all += sub;
      if (it.kind === 'Inventaris') inv += sub;
      else bhp += sub;
      if (it.approval === 'ok') approved += sub;
      if (it.received) received += sub;
    });
    const ok = d.items.filter((it: any) => it.approval === 'ok').length;
    const no = d.items.filter((it: any) => it.approval === 'no').length;
    const pending = d.items.length - ok - no;
    const rec = d.items.filter((it: any) => it.received).length;
    return { inv, bhp, all, approved, received, ok, no, pending, rec };
  }, [d]);

  async function approveAll() {
    try {
      const decisions = d.items
        .filter((it: any) => !it.approval)
        .map((it: any) => ({
          item_id: it.id,
          status: 'approved',
        }));
      if (decisions.length > 0) {
        await apiFetch(`/procurement/drafts/${d.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decisions }),
        });
      }
      dispatch({ type: 'APPROVE_ALL', code: d.code });
      toast('Semua item disetujui', 'ok');
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  async function finalize() {
    if (totals.pending > 0) {
      toast('Masih ada ' + totals.pending + ' item yang belum diputuskan', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/finalize`, { method: 'POST' });
      dispatch({ type: 'FINALIZE_DRAFT', code: d.code });
      toast('Draf difinalisasi & dikunci → Staf Admin', 'ok');
      onBack();
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  async function requestRevision() {
    const notes = prompt('Masukkan Catatan Revisi untuk Kepala Lab:');
    if (notes === null) return; // cancelled
    if (!notes.trim()) {
      toast('Catatan revisi tidak boleh kosong', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/revision`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      dispatch({ type: 'REQUEST_REVISION', code: d.code, notes });
      toast('Permintaan revisi dikirim ke Kepala Lab', 'ok');
      onBack();
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  async function markReceived(itemId: any, formData: any) {
    const item = d.items.find((it: any) => it.id === itemId);
    try {
      await apiFetch(`/procurement/receiving`, {
        method: 'POST',
        body: JSON.stringify({
          draft_item_id: itemId,
          qty_received: formData.qty_received || item.qty,
          received_date: formData.received_date,
          code: formData.code,
          qr_photo: formData.qr_photo,
          condition: formData.condition,
          qr_data: formData.decoded_qr || formData.code,
        }),
      });
      dispatch({ type: 'MARK_RECEIVED', code: d.code, itemId, date: formData.received_date });
      toast('Barang ditandai telah diterima', 'ok');
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  async function setApproval(itemId: any, value: any) {
    try {
      const currentVal = d.items.find((it: any) => it.id === itemId)?.approval;
      const newVal = currentVal === value ? null : value;
      const mappedVal = newVal === 'ok' ? 'approved' : newVal === 'no' ? 'rejected' : 'delete';

      await apiFetch(`/procurement/drafts/${d.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decisions: [{ item_id: itemId, status: mappedVal }] }),
      });

      dispatch({ type: 'SET_APPROVAL', code: d.code, itemId, value: newVal });
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  async function handleRemoveItem(itemId: any) {
    try {
      await apiFetch(`/procurement/items/${itemId}`, { method: 'DELETE' });
      dispatch({ type: 'REMOVE_DRAFT_ITEM', code: d.code, itemId });
      setDeleteCandidateId(null);
      toast('Item berhasil dihapus', 'ok');
    } catch (err: any) {
      toast('Gagal menghapus item: ' + err.message, 'warn');
      setDeleteCandidateId(null);
    }
  }

  async function handleSaveItem(itemId: any) {
    if (
      !editFields.name.trim() ||
      !editFields.qty ||
      !editFields.unit.trim() ||
      !editFields.price
    ) {
      toast('Mohon isi semua field wajib (*)', 'warn');
      return;
    }
    try {
      const priceNum = parseFloat(String(editFields.price).replace(/\D/g, '')) || 0;
      const res = await apiFetch(`/procurement/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          kind: editFields.kind,
          name: editFields.name.trim(),
          qty: parseInt(editFields.qty),
          unit: editFields.unit.trim(),
          price: priceNum,
          link: editFields.link.trim() || null,
          replaces: editFields.kind === 'Inventaris' ? editFields.replaces?.trim() || null : null,
        }),
      });
      if (res.data) {
        dispatch({
          type: 'UPDATE_DRAFT_ITEM',
          code: d.code,
          itemId: itemId,
          item: {
            ...res.data,
            approval: null,
            received: false,
          },
        });
        toast('Item berhasil diperbarui', 'ok');
        setEditingItemId(null);
      }
    } catch (err: any) {
      toast('Gagal memperbarui item: ' + err.message, 'warn');
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.qty || !newItem.unit.trim() || !newItem.price) {
      toast('Mohon isi semua field wajib (*)', 'warn');
      return;
    }
    setAddingItem(true);
    try {
      const priceNum = parseFloat(String(newItem.price).replace(/\D/g, '')) || 0;
      const res = await apiFetch(`/procurement/drafts/${d.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          kind: newItem.kind,
          name: newItem.name.trim(),
          qty: parseInt(newItem.qty),
          unit: newItem.unit.trim(),
          price: priceNum,
          link: newItem.link.trim() || null,
          replaces: newItem.kind === 'Inventaris' ? newItem.replaces.trim() || null : null,
        }),
      });
      if (res.data) {
        dispatch({
          type: 'ADD_DRAFT_ITEM',
          code: d.code,
          item: {
            ...res.data,
            approval: null,
            received: false,
          },
        });
        toast('Item berhasil ditambahkan ke draf', 'ok');
        setNewItem({
          kind: 'Inventaris',
          name: '',
          qty: '',
          unit: 'unit',
          price: '',
          link: '',
          replaces: '',
        });
        setShowAddForm(false);
      }
    } catch (err: any) {
      toast('Gagal menambahkan item: ' + err.message, 'warn');
    } finally {
      setAddingItem(false);
    }
  }

  async function submitDraft() {
    try {
      await apiFetch(`/procurement/drafts/${d.id}/submit`, { method: 'POST' });

      const res = await apiFetch<{ data: any[] }>('/procurement/drafts');
      if (res.data) {
        const formatted = res.data.map((draftObj: any) => ({
          ...draftObj,
          by: draftObj.creator?.name || draftObj.by || 'Kepala Lab',
          role: draftObj.creator?.role || draftObj.role || 'kalab',
          submitted: draftObj.submitted_at
            ? new Date(draftObj.submitted_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '-',
          items:
            draftObj.items?.map((it: any) => ({
              ...it,
              approval:
                it.approval?.status === 'approved'
                  ? 'ok'
                  : it.approval?.status === 'rejected'
                    ? 'no'
                    : null,
              received: it.receivings && it.receivings.length > 0,
            })) || [],
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: formatted });
      }
      toast('Draf diajukan – menunggu Kaprodi', 'ok');
      onBack();
    } catch (err: any) {
      toast('Gagal mengajukan draf: ' + err.message, 'warn');
    }
  }

  async function completeReceiving() {
    if (totals.rec < d.items.filter((it: any) => it.approval !== 'no').length) {
      toast('Masih ada item yang belum diterima', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/complete`, { method: 'POST' });
      dispatch({ type: 'COMPLETE_DRAFT', code: d.code });
      toast('Penerimaan diselesaikan', 'ok');
      onBack();
    } catch (err: any) {
      toast(err.message, 'warn');
    }
  }

  function eligibleCount(items: any) {
    return items.filter((it: any) => it.approval !== 'no').length;
  }

  return (
    <div
      className="page"
      style={{ '--role-accent': role?.accent || 'var(--color-violet)' } as React.CSSProperties}
    >
      <div data-reveal className="mb-[18px]">
        <button className="btn sm" onClick={onBack}>
          <Icon name="chevL" size={12} /> Kembali
        </button>
      </div>

      {d.revision_notes && (
        <div
          className="mb-5 p-4 rounded-lg border border-rose/30 bg-rose/10 text-rose text-sm flex gap-3 items-start"
          data-reveal
        >
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 animate-pulse" />
          <div>
            <div className="font-bold mb-1">Catatan Revisi dari Kaprodi:</div>
            <p className="opacity-90 leading-relaxed">{d.revision_notes}</p>
          </div>
        </div>
      )}

      <div className="page-head" data-reveal>
        <div>
          <div className="mono text-xs text-3 mb-2 tracking-[0.08em]">{d.code}</div>
          <h1 className="page-title text-[30px]">{d.title}</h1>
          <p className="page-sub">
            {d.by} · {d.role} ·{' '}
            {d.status === 'draft' ? 'belum diajukan' : `diajukan ${d.submitted}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="btn"
            onClick={exportToCSV}
            style={{
              background: 'var(--glass)',
              borderColor: 'rgba(255,255,255,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon name="download" size={13} /> Ekspor CSV
          </button>
          <DraftActionsPanel
            d={d}
            mode={mode}
            locked={locked}
            totals={totals}
            submitDraft={submitDraft}
            requestRevision={requestRevision}
            approveAll={approveAll}
            finalize={finalize}
            completeReceiving={completeReceiving}
            navigate={navigate}
            eligibleCount={eligibleCount}
          />
        </div>
      </div>

      {mode === 'admin' ? (
        <AdminReceiveGrid draft={d} totals={totals} onToggle={markReceived} />
      ) : (
        <>
          <DraftItemsTable
            draft={d}
            mode={mode}
            locked={locked}
            setApproval={setApproval}
            totals={totals}
            onRemoveItem={setDeleteCandidateId}
            editingItemId={editingItemId}
            editFields={editFields}
            setEditFields={setEditFields}
            startEdit={startEdit}
            onSaveItem={handleSaveItem}
            onCancelEdit={handleCancelEdit}
          />

          {(mode === 'kalab' || mode === 'staflab') &&
            (d.status === 'draft' || d.status === 'revision') && (
              <div className="mt-6" data-reveal>
                {!showAddForm ? (
                  <button
                    className="btn"
                    onClick={() => setShowAddForm(true)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Icon name="plus" size={12} /> Tambah Item Baru
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddItem}
                    className="card compact p-5 mt-3 border-dashed"
                    style={{
                      background: 'rgba(183,148,255,0.02)',
                      borderColor: 'rgba(183,148,255,0.2)',
                    }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-violet flex items-center gap-1.5">
                        <Icon name="plus" size={14} /> Tambah Item Pengadaan Baru
                      </h4>
                      <button
                        type="button"
                        className="x-btn text-ink-3 hover:text-ink"
                        onClick={() => setShowAddForm(false)}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-3">
                      {!isStaflab && (
                        <>
                          <button
                            type="button"
                            onClick={() => setNewItem((prev) => ({ ...prev, kind: 'Inventaris' }))}
                            className={`btn sm ${newItem.kind === 'Inventaris' ? 'primary' : ''}`}
                          >
                            Inventaris
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewItem((prev) => ({ ...prev, kind: 'BHP' }))}
                            className={`btn sm ${newItem.kind === 'BHP' ? 'primary' : ''}`}
                          >
                            BHP
                          </button>
                        </>
                      )}
                      {isStaflab && (
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

                    <div className="field mb-3">
                      <div className="field-lbl">
                        Nama Barang <span className="req">*</span>
                      </div>
                      <input
                        className="input"
                        value={newItem.name}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nama barang (contoh: Mikroskop Binokuler)"
                        disabled={addingItem}
                      />
                    </div>

                    <div className="gap-3 grid grid-cols-3 mb-3">
                      <div className="field">
                        <div className="field-lbl">
                          Jumlah <span className="req">*</span>
                        </div>
                        <input
                          className="input mono"
                          type="number"
                          min="1"
                          value={newItem.qty}
                          onChange={(e) => setNewItem((prev) => ({ ...prev, qty: e.target.value }))}
                          placeholder="1"
                          disabled={addingItem}
                        />
                      </div>
                      <div className="field">
                        <div className="field-lbl">
                          Satuan <span className="req">*</span>
                        </div>
                        <input
                          className="input"
                          value={newItem.unit}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, unit: e.target.value }))
                          }
                          placeholder="unit/pcs"
                          disabled={addingItem}
                        />
                      </div>
                      <div className="field">
                        <div className="field-lbl">
                          Harga Satuan <span className="req">*</span>
                        </div>
                        <input
                          className="input mono"
                          type="text"
                          value={formatThousand(newItem.price)}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/\D/g, '');
                            setNewItem((prev) => ({ ...prev, price: cleanVal }));
                          }}
                          placeholder="Rp 0"
                          disabled={addingItem}
                        />
                      </div>
                    </div>

                    <div className="field mb-3">
                      <div className="field-lbl">
                        Link Pembelian <span className="text-xs text-ink-3">(Opsional)</span>
                      </div>
                      <input
                        className="input"
                        value={newItem.link}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, link: e.target.value }))}
                        placeholder="https://tokopedia.com/..."
                        disabled={addingItem}
                      />
                    </div>

                    {!isStaflab && newItem.kind === 'Inventaris' && (
                      <div className="field mb-4">
                        <div className="field-lbl">
                          Mengganti Aset{' '}
                          <span className="text-xs text-ink-3">
                            (Opsional jika untuk replace barang rusak)
                          </span>
                        </div>
                        <input
                          className="input"
                          value={newItem.replaces}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, replaces: e.target.value }))
                          }
                          placeholder="Kode Aset (contoh: LAB-INV-MKS-001)"
                          disabled={addingItem}
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-surface">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setShowAddForm(false)}
                        disabled={addingItem}
                      >
                        Batal
                      </button>
                      <button type="submit" className="btn primary sm" disabled={addingItem}>
                        {addingItem ? 'Menyimpan...' : 'Tambahkan Item'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
        </>
      )}

      {/* Custom Confirm Deletion Modal Overlay */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div
            className="card max-w-[400px] w-full p-6 shadow-2xl border border-rose/30 bg-surface-2 flex flex-col gap-4 text-center animate-slide-up"
            style={{ '--role-accent': 'var(--color-rose)' } as React.CSSProperties}
          >
            <div className="mx-auto p-3 rounded-full bg-rose/10 text-rose w-max shrink-0 animate-bounce">
              <Icon name="alert" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Hapus Item Pengadaan?</h3>
              <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus item{' '}
                <b>{d.items.find((it: any) => it.id === deleteCandidateId)?.name}</b>? Tindakan ini
                tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2.5 mt-2 justify-center">
              <button
                type="button"
                className="btn sm grow font-semibold"
                style={{ background: 'var(--glass)', borderColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => setDeleteCandidateId(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn primary sm grow font-semibold bg-rose border-rose hover:bg-rose-600 text-white"
                onClick={() => {
                  handleRemoveItem(deleteCandidateId);
                  setDeleteCandidateId(null);
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
