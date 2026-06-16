import React, { useMemo, useState } from 'react';
import { useStore, useToast, D, Icon } from '../../../components/app-shell.jsx';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import { AdminReceiveGrid } from './ReceivingAdmin.jsx';

function formatThousand(val) {
  if (val === undefined || val === null || val === '') return '';
  const numString = String(val).replace(/\D/g, ''); // strip non-digits
  if (!numString) return '';
  return Number(numString).toLocaleString('id-ID'); // formats with dot separators in Indonesian locale
}

export function DraftDetail({ draft, onBack, mode }) {
  const { state, dispatch } = useStore();
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
    const data = d.items.map((it) => [
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
      ...data.map((row) =>
        row
          .map((val) => {
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

  function startEdit(it) {
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
    d.items.forEach((it) => {
      const sub = it.qty * it.price;
      all += sub;
      if (it.kind === 'Inventaris') inv += sub;
      else bhp += sub;
      if (it.approval === 'ok') approved += sub;
      if (it.received) received += sub;
    });
    const ok = d.items.filter((it) => it.approval === 'ok').length;
    const no = d.items.filter((it) => it.approval === 'no').length;
    const pending = d.items.length - ok - no;
    const rec = d.items.filter((it) => it.received).length;
    return { inv, bhp, all, approved, received, ok, no, pending, rec };
  }, [d]);

  async function approveAll() {
    try {
      const decisions = d.items
        .filter((it) => !it.approval)
        .map((it) => ({
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function markReceived(itemId, formData) {
    const item = d.items.find((it) => it.id === itemId);
    // Remove the `if (!item.received)` check because partial receiving means an item can be received multiple times
    try {
      await apiFetch(`/procurement/receiving`, {
        method: 'POST',
        body: JSON.stringify({
          draft_item_id: itemId,
          qty_received: formData.qty_received || item.qty,
          received_date: formData.received_date,
          code: formData.code,
          qr_photo: formData.qr_photo,
        }),
      });
      dispatch({ type: 'MARK_RECEIVED', code: d.code, itemId, date: formData.received_date });
      toast('Barang ditandai telah diterima', 'ok');
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function setApproval(itemId, value) {
    try {
      const currentVal = d.items.find((it) => it.id === itemId)?.approval;
      const newVal = currentVal === value ? null : value;
      const mappedVal = newVal === 'ok' ? 'approved' : newVal === 'no' ? 'rejected' : 'delete';

      await apiFetch(`/procurement/drafts/${d.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decisions: [{ item_id: itemId, status: mappedVal }] }),
      });

      dispatch({ type: 'SET_APPROVAL', code: d.code, itemId, value: newVal });
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  async function handleRemoveItem(itemId) {
    try {
      await apiFetch(`/procurement/items/${itemId}`, { method: 'DELETE' });
      dispatch({ type: 'REMOVE_DRAFT_ITEM', code: d.code, itemId });
      setDeleteCandidateId(null);
      toast('Item berhasil dihapus', 'ok');
    } catch (err) {
      toast('Gagal menghapus item: ' + err.message, 'warn');
      setDeleteCandidateId(null);
    }
  }

  async function handleSaveItem(itemId) {
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
    } catch (err) {
      toast('Gagal memperbarui item: ' + err.message, 'warn');
    }
  }

  async function handleAddItem(e) {
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
    } catch (err) {
      toast('Gagal menambahkan item: ' + err.message, 'warn');
    } finally {
      setAddingItem(false);
    }
  }

  async function submitDraft() {
    try {
      await apiFetch(`/procurement/drafts/${d.id}/submit`, { method: 'POST' });

      const res = await apiFetch('/procurement/drafts');
      if (res.data) {
        const formatted = res.data.map((d) => ({
          ...d,
          by: d.creator?.name || d.by || 'Kepala Lab',
          role: d.creator?.role || d.role || 'kalab',
          submitted: d.submitted_at
            ? new Date(d.submitted_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '-',
          items:
            d.items?.map((it) => ({
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
      toast('Draf diajukan · menunggu Kaprodi', 'ok');
      onBack();
    } catch (err) {
      toast('Gagal mengajukan draf: ' + err.message, 'warn');
    }
  }

  async function completeReceiving() {
    if (totals.rec < d.items.filter((it) => it.approval !== 'no').length) {
      toast('Masih ada item yang belum diterima', 'warn');
      return;
    }
    try {
      await apiFetch(`/procurement/drafts/${d.id}/complete`, { method: 'POST' });
      dispatch({ type: 'COMPLETE_DRAFT', code: d.code });
      toast('Penerimaan diselesaikan', 'ok');
      onBack();
    } catch (err) {
      toast(err.message, 'warn');
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
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
          {d.status === 'completed' && (
            <a
              href={`/api/procurement/drafts/${d.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'var(--glass)',
                color: 'var(--green)',
                borderColor: 'rgba(163,230,53,0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon name="download" size={13} /> Cetak BAST (PDF)
            </a>
          )}
          {(mode === 'kalab' || mode === 'staflab') &&
            (d.status === 'draft' || d.status === 'revision') && (
              <>
                <span className="chip locked">
                  {d.status === 'revision' ? 'Butuh Revisi' : 'Draft'}
                </span>
                <button className="btn primary" onClick={submitDraft}>
                  <Icon name="arrow" size={12} />{' '}
                  {d.status === 'revision' ? 'Ajukan Ulang ke Kaprodi' : 'Ajukan ke Kaprodi'}
                </button>
              </>
            )}
          {(mode === 'kalab' || mode === 'staflab') && d.status === 'submitted' && (
            <>
              <span className="chip warn">
                <span className="dot" /> Menunggu review Kaprodi
              </span>
              <span
                className="chip locked"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  borderColor: 'rgba(251,191,36,0.25)',
                  color: 'var(--color-gold)',
                  boxShadow: '0 0 12px rgba(251,191,36,0.15)',
                }}
              >
                Locked · tidak bisa diubah
              </span>
            </>
          )}
          {(mode === 'kalab' || mode === 'staflab') &&
            (d.status === 'finalized' || d.status === 'completed') && (
              <span className="chip locked">Locked · tidak bisa diubah</span>
            )}
          {mode === 'kaprodi' && d.status === 'submitted' && (
            <button
              className="btn font-semibold text-rose border-rose/30 bg-rose/5 hover:bg-rose/10"
              onClick={requestRevision}
            >
              <Icon name="x" size={12} /> Minta Revisi
            </button>
          )}
          {mode === 'kaprodi' && !locked && (
            <>
              <span className="chip ok">{totals.ok} OK</span>
              <span className="chip danger">{totals.no} tolak</span>
              <span className="chip">{totals.pending} ?</span>
              {totals.pending > 0 ? (
                <button className="btn" onClick={approveAll}>
                  Approve semua
                </button>
              ) : (
                <button className="btn primary" onClick={finalize}>
                  <Icon name="check" size={13} strokeWidth={2.4} /> Finalisasi & kunci
                </button>
              )}
            </>
          )}
          {mode === 'admin' && (
            <>
              <span className="chip ok">Locked</span>
              <span className="chip info">
                {totals.rec}/{eligibleCount(d.items)} dilabeli
              </span>
              <button className="btn" onClick={() => navigate('/dashboard/labels')}>
                <Icon name="qr" size={13} /> Cetak label
              </button>
              {d.status === 'finalized' && (
                <button className="btn primary" onClick={completeReceiving}>
                  Selesaikan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {mode === 'admin' ? (
        <AdminReceiveGrid draft={d} totals={totals} onToggle={markReceived} />
      ) : (
        <>
          <KalabKaprodiItems
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

      {/* Custom Glassmorphic Confirm Deletion Modal Overlay */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div
            className="card max-w-[400px] w-full p-6 shadow-2xl border border-rose/30 bg-surface-2 flex flex-col gap-4 text-center animate-slide-up"
            style={{ '--role-accent': 'var(--color-rose)' }}
          >
            <div className="mx-auto p-3 rounded-full bg-rose/10 text-rose w-max shrink-0 animate-bounce">
              <Icon name="alert" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Hapus Item Pengadaan?</h3>
              <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus item{' '}
                <b>{d.items.find((it) => it.id === deleteCandidateId)?.name}</b>? Tindakan ini tidak
                dapat dibatalkan.
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

function eligibleCount(items) {
  return items.filter((it) => it.approval !== 'no').length;
}

export function KalabKaprodiItems({
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
}) {
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
        {draft.items.map((it) => {
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
                      onChange={(e) => setEditFields((prev) => ({ ...prev, kind: e.target.value }))}
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
                    onChange={(e) => setEditFields((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nama barang..."
                  />
                  <input
                    className="input sm text-xs mono"
                    value={editFields.link || ''}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, link: e.target.value }))}
                    placeholder="Link pembelian"
                  />
                  {!isStaflab && editFields.kind === 'Inventaris' && (
                    <input
                      className="input sm text-xs"
                      value={editFields.replaces || ''}
                      onChange={(e) =>
                        setEditFields((prev) => ({ ...prev, replaces: e.target.value }))
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
                    onChange={(e) => setEditFields((prev) => ({ ...prev, qty: e.target.value }))}
                  />
                  <input
                    className="input sm text-xs text-center"
                    value={editFields.unit}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, unit: e.target.value }))}
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
                      setEditFields((prev) => ({ ...prev, price: cleanVal }));
                    }}
                    placeholder="Harga (Rp)"
                  />
                  <span className="text-xs text-violet font-semibold">
                    Sub:{' '}
                    {window.fmtRp(
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
                <div className="item-price">{window.fmtRp(it.qty * it.price)}</div>
                <div className="item-price">
                  <span className="sub">@ {window.fmtRp(it.price)}</span>
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
          <div className="summary-tile-val violet">{window.fmtRp(totals.inv)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">Total BHP</div>
          <div className="summary-tile-val cyan">{window.fmtRp(totals.bhp)}</div>
        </div>
        <div className="summary-tile">
          <div className="summary-tile-lbl">{mode === 'kaprodi' ? 'Disetujui' : 'Grand total'}</div>
          <div className="summary-tile-val green">
            {mode === 'kaprodi' ? window.fmtRp(totals.approved) : window.fmtRp(totals.all)}
          </div>
        </div>
        {mode === 'kaprodi' && (
          <div className="summary-tile">
            <div className="summary-tile-lbl">Δ Penghematan</div>
            <div className="summary-tile-val gold">
              {window.fmtRp(totals.all - totals.approved)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
