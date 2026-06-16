import React, { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { createDraftSchema } from '../../../schemas/procurementSchema';

function formatThousand(val) {
  if (val === undefined || val === null || val === '') return '';
  const numString = String(val).replace(/\D/g, ''); // strip non-digits
  if (!numString) return '';
  return Number(numString).toLocaleString('id-ID'); // formats with dot separators in Indonesian locale
}

export function NewDraftForm({ close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const isStaflab = state.role === 'staflab';
  const defaultKind = isStaflab ? 'BHP' : 'Inventaris';
  const [title, setTitle] = useState(
    isStaflab ? 'Pengadaan BHP Lab · Q3 2026' : 'Pengadaan Lab Komputer · Q3 2026'
  );
  const [items, setItems] = useState([
    {
      id: 'I-N1',
      kind: defaultKind,
      name: '',
      qty: '',
      unit: '',
      price: '',
      link: '',
      replaces: '',
    },
  ]);
  const [loading, setLoading] = useState(false);

  function update(i, patch) {
    setItems((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function add() {
    setItems((arr) => [
      ...arr,
      {
        id: 'I-N' + (arr.length + 1),
        kind: defaultKind,
        name: '',
        qty: '',
        unit: '',
        price: '',
        link: '',
        replaces: '',
      },
    ]);
  }
  function remove(i) {
    setItems((arr) => arr.filter((_, j) => j !== i));
  }

  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  async function handleSave(shouldSubmit = false) {
    // Filter out completely blank items (user-friendly cleanup)
    const nonBlankItems = items.filter(
      (it) =>
        it.name.trim() !== '' ||
        it.qty !== '' ||
        it.unit.trim() !== '' ||
        it.price !== '' ||
        (it.link && it.link.trim() !== '') ||
        (it.replaces && it.replaces.trim() !== '')
    );

    const payload = {
      title,
      items: nonBlankItems.map((it) => ({
        kind: it.kind,
        name: it.name,
        qty: it.qty === '' ? undefined : Number(it.qty),
        unit: it.unit,
        price: it.price === '' ? undefined : Number(it.price),
        link: it.link || null,
        replaces: it.replaces || null,
      })),
    };

    // Client-side Zod validation
    const validationResult = createDraftSchema.safeParse(payload);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Input data tidak valid.';
      toast(firstError, 'warn');
      return;
    }

    setLoading(true);
    try {
      const createRes = await apiFetch('/procurement/drafts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          items: payload.items,
        }),
      });

      if (!createRes.data) throw new Error('Gagal membuat draf');
      const newDraft = createRes.data;

      if (shouldSubmit) {
        const submitRes = await apiFetch(`/procurement/drafts/${newDraft.id}/submit`, {
          method: 'POST',
        });
        if (!submitRes.data) throw new Error('Gagal mengajukan draf');
        toast('Draf diajukan · menunggu Kaprodi', 'ok');
      } else {
        toast('Draf berhasil disimpan', 'ok');
      }

      const refreshRes = await apiFetch('/procurement/drafts');
      if (refreshRes.data) {
        const formatted = refreshRes.data.map((d) => ({
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

      close();
    } catch (err) {
      toast('Gagal memproses draf: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">Draf pengadaan baru</div>
        <button className="x-btn" onClick={close} disabled={loading}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="drawer-body">
        <div className="field">
          <div className="field-lbl">
            Judul draf <span className="req">*</span>
          </div>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex between aic mt-4 mb-3">
          <div className="field-lbl m-0">Item barang ({items.length})</div>
          <button className="btn sm" onClick={add} disabled={loading}>
            <Icon name="plus" size={11} /> Item
          </button>
        </div>

        {items.map((it, i) => (
          <div key={i} className="card compact mb-3 p-3.5">
            <div className="flex gap-2 mb-2 aic">
              {!isStaflab && (
                <>
                  <button
                    onClick={() => update(i, { kind: 'Inventaris' })}
                    className={`btn sm ${it.kind === 'Inventaris' ? 'primary' : ''}`}
                    disabled={loading}
                  >
                    Inventaris
                  </button>
                  <button
                    onClick={() => update(i, { kind: 'BHP' })}
                    className={`btn sm ${it.kind === 'BHP' ? 'primary' : ''}`}
                    disabled={loading}
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
              <div className="grow" />
              <button className="x-btn" onClick={() => remove(i)} disabled={loading}>
                <Icon name="x" size={12} />
              </button>
            </div>
            <input
              className="input mb-2"
              value={it.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Nama barang…"
              disabled={loading}
            />
            <div className="gap-1.5 grid mb-1.5">
              <input
                className="input mono"
                type="number"
                value={it.qty}
                onChange={(e) => update(i, { qty: e.target.value })}
                placeholder="Jumlah"
                disabled={loading}
              />
              <input
                className="input"
                value={it.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                placeholder="Satuan (unit/pcs)"
                disabled={loading}
              />
              <input
                className="input mono"
                type="text"
                value={formatThousand(it.price)}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '');
                  update(i, { price: cleanVal });
                }}
                placeholder="Harga Satuan (Rp)"
                disabled={loading}
              />
            </div>
            <input
              className="input mb-2"
              value={it.link}
              onChange={(e) => update(i, { link: e.target.value })}
              placeholder="Link pembelian (opsional)"
              disabled={loading}
            />
            {!isStaflab && it.kind === 'Inventaris' && (
              <input
                className="input"
                value={it.replaces}
                onChange={(e) => update(i, { replaces: e.target.value })}
                placeholder="Mengganti aset apa? (opsional)"
                disabled={loading}
              />
            )}
            <div className="text-xs text-3 mono mt-2 fw-5 text-right">
              Subtotal: {window.fmtRp((Number(it.qty) || 0) * (Number(it.price) || 0))}
            </div>
          </div>
        ))}

        <div
          className="card compact"
          style={{ background: 'rgba(183,148,255,0.1)', borderColor: 'rgba(183,148,255,0.3)' }}
        >
          <div className="flex between aic">
            <div
              className="text-xs mono uppercase"
              style={{ color: 'var(--violet)', letterSpacing: '0.08em' }}
            >
              Estimasi total
            </div>
            <div className="mono text-xl fw-5 text-violet">{window.fmtRp(total)}</div>
          </div>
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={() => handleSave(false)} disabled={loading}>
          Simpan draft
        </button>
        <button className="btn primary" onClick={() => handleSave(true)} disabled={loading}>
          {loading ? (
            'Memproses...'
          ) : (
            <>
              <Icon name="arrow" size={13} /> Ajukan ke Kaprodi
            </>
          )}
        </button>
      </div>
    </>
  );
}
