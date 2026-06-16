import React, { useState, useEffect } from 'react';
import { useStore, D, QR, Icon, useSearch, useToast } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { DraftDetail } from './DraftDetail.jsx';
import { DraftCard } from './PengadaanKalab.jsx';

function generateNextLabel(baseLabel, index) {
  if (index === 0) return baseLabel;
  const match = baseLabel.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${baseLabel}-${index + 1}`;
  }
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = parseInt(numStr, 10) + index;
  const paddedNum = String(nextNum).padStart(numStr.length, '0');
  return prefix + paddedNum;
}

export function ReceivingAdmin() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const role = D.roles.find((r) => r.id === 'admin');

  useEffect(() => {
    async function loadReceiving() {
      try {
        const res = await apiFetch('/procurement/receiving');
        const validDrafts = (res.data || []).map((d) => ({
          ...d,
          by: d.creator?.name || d.by,
          role: d.creator?.role || d.role,
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
              receivedDate:
                it.receivings && it.receivings.length > 0
                  ? new Date(it.receivings[0].received_date).toLocaleDateString('id-ID')
                  : null,
            })) || [],
        }));
        dispatch({ type: 'SET_DRAFTS', drafts: validDrafts });
      } catch (err) {
        console.error('Failed to load receiving drafts:', err);
      }
    }
    loadReceiving();
  }, [dispatch]);

  const queue = state.drafts.filter((d) => {
    if (d.status !== 'finalized' && d.status !== 'completed') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.by && d.by.toLowerCase().includes(q))
    );
  });

  const [openCode, setOpenCode] = useState(null);

  if (openCode) {
    const opened = state.drafts.find(
      (d) => d.code === openCode && (d.status === 'finalized' || d.status === 'completed')
    );
    if (opened) {
      return <DraftDetail draft={opened} onBack={() => setOpenCode(null)} mode="admin" />;
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Penerimaan barang</h1>
          <p className="page-sub">
            Terima barang fisik dari draf pengadaan yang telah difinalisasi, catat aset baru, dan
            cetak label inventaris.
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty" data-reveal>
          <div className="ico">
            <Icon name={query ? 'search' : 'box'} size={20} />
          </div>
          <h4>{query ? 'Tidak ada penerimaan cocok' : 'Tidak ada penerimaan'}</h4>
          <div>
            {query
              ? 'Coba kata kunci lain atau kosongkan pencarian.'
              : 'Belum ada barang yang siap diterima.'}
          </div>
        </div>
      ) : (
        <div
          className="gap-[14px]"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
          data-reveal-children
        >
          {queue.map((d) => (
            <DraftCard
              key={d.code}
              d={d}
              onClick={() => setOpenCode(d.code)}
              accent={role.accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminReceiveGrid({ draft, totals, onToggle }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [openForms, setOpenForms] = useState({});
  const [formsData, setFormsData] = useState({});

  // Bulk Receive state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkItemId, setBulkItemId] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().substring(0, 10));
  const [bulkStartCode, setBulkStartCode] = useState('');
  const [bulkQrPhoto, setBulkQrPhoto] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total, label }
  const [bulkLoading, setBulkLoading] = useState(false);

  const eligible = draft.items.filter((it) => it.approval !== 'no');

  const displayCards = [];
  eligible.forEach((it) => {
    if (it.kind === 'Inventaris') {
      const receivings = it.receivings || [];
      for (let i = 0; i < it.qty; i++) {
        const rec = receivings[i];
        displayCards.push({
          ...it,
          cardId: `${it.id}-${i}`,
          unitIndex: i + 1,
          isRec: !!rec,
          recData: rec,
          maxQty: 1,
        });
      }
    } else {
      const receivings = it.receivings || [];
      const totalReceived = receivings.reduce(
        (sum, r) => sum + (parseFloat(r.qty_received) || 0),
        0
      );
      displayCards.push({
        ...it,
        cardId: `${it.id}-bhp`,
        isRec: totalReceived >= it.qty,
        recData: receivings.length > 0 ? receivings[receivings.length - 1] : null,
        totalReceived,
        maxQty: it.qty - totalReceived,
      });
    }
  });

  const handleOpenForm = (cardId, maxQty) => {
    setOpenForms((prev) => ({ ...prev, [cardId]: true }));
    setFormsData((prev) => ({
      ...prev,
      [cardId]: {
        received_date: new Date().toISOString().substring(0, 10),
        code: '',
        qr_photo: null,
        qty_received: maxQty,
      },
    }));
  };

  const handleCancelForm = (cardId) => {
    setOpenForms((prev) => ({ ...prev, [cardId]: false }));
  };

  const handleChange = (cardId, field, value) => {
    setFormsData((prev) => ({ ...prev, [cardId]: { ...prev[cardId], [field]: value } }));
  };

  const handleFileChange = (cardId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => handleChange(cardId, 'qr_photo', e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (card) => {
    const data = formsData[card.cardId];
    if (card.kind === 'Inventaris' && (!data.code || !data.qr_photo)) {
      toast(
        'Untuk inventaris, Penomoran Label Internal dan Foto QR dari Universitas wajib diisi.',
        'warn'
      );
      return;
    }
    if (card.kind !== 'Inventaris' && (!data.qty_received || data.qty_received <= 0)) {
      toast('Jumlah diterima harus lebih dari 0.', 'warn');
      return;
    }
    onToggle(card.id, data);
  };

  const unreceivedItems = eligible
    .filter((it) => {
      if (it.kind !== 'Inventaris') return false;
      const recCount = (it.receivings || []).length;
      return recCount < it.qty;
    })
    .map((it) => {
      const recCount = (it.receivings || []).length;
      const remaining = it.qty - recCount;
      return {
        ...it,
        remaining,
        recCount,
      };
    });

  return (
    <>
      {unreceivedItems.length > 0 && (
        <div
          className="card mb-5 p-4 border border-line-2"
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          <div className="flex between aic mb-3">
            <div className="flex gap-2 aic">
              <Icon
                name="bolt"
                className="text-violet animate-pulse animate-duration-[2000ms]"
                size={16}
              />
              <b className="text-sm">Penerimaan Massal (Bulk Receive)</b>
            </div>
            <button
              className={`btn sm ${showBulk ? '' : 'primary'}`}
              onClick={() => setShowBulk(!showBulk)}
            >
              {showBulk ? 'Sembunyikan' : 'Buka Form'}
            </button>
          </div>

          {showBulk && (
            <div
              className="grid gap-3 mt-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
            >
              <div className="field">
                <div className="field-lbl">
                  Pilih Aset <span className="req">*</span>
                </div>
                <select
                  className="select text-xs w-full"
                  value={bulkItemId}
                  onChange={(e) => {
                    setBulkItemId(e.target.value);
                    const selected = unreceivedItems.find((it) => String(it.id) === e.target.value);
                    if (selected) {
                      setBulkStartCode(
                        `INV-${new Date().getFullYear()}-${String(selected.id).padStart(3, '0')}-001`
                      );
                    }
                  }}
                  disabled={bulkLoading}
                >
                  <option value="">Pilih barang...</option>
                  {unreceivedItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.remaining} unit belum diterima)
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="field-lbl">
                  Tanggal Diterima <span className="req">*</span>
                </div>
                <input
                  type="date"
                  className="input text-xs w-full"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  disabled={bulkLoading}
                />
              </div>

              <div className="field">
                <div className="field-lbl">
                  Label Awal (Nomor Seri) <span className="req">*</span>
                </div>
                <input
                  type="text"
                  className="input text-xs w-full"
                  placeholder="Contoh: INV-2026-001"
                  value={bulkStartCode}
                  onChange={(e) => setBulkStartCode(e.target.value)}
                  disabled={bulkLoading}
                />
              </div>

              <div className="field">
                <div className="field-lbl">
                  Foto QR Universitas <span className="req">*</span>
                </div>
                <input
                  type="file"
                  className="input text-xs w-full"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (el) => setBulkQrPhoto(el.target.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  disabled={bulkLoading}
                />
              </div>
            </div>
          )}

          {showBulk && bulkItemId && (
            <div className="mt-3 p-3 bg-surface/50 border border-line-2 rounded-lg flex flex-col gap-3">
              {(() => {
                const sel = unreceivedItems.find((it) => String(it.id) === bulkItemId);
                if (!sel) return null;
                return (
                  <div className="text-xs text-3 leading-relaxed">
                    Sistem akan memproses penerimaan sebanyak{' '}
                    <b className="text-ink-2">{sel.remaining} unit</b> untuk barang{' '}
                    <b className="text-ink-2">{sel.name}</b>.
                    <br />
                    Label yang dihasilkan:{' '}
                    <span className="mono bg-surface px-1.5 py-0.5 rounded text-violet">
                      {bulkStartCode}
                    </span>{' '}
                    s.d.{' '}
                    <span className="mono bg-surface px-1.5 py-0.5 rounded text-violet">
                      {generateNextLabel(bulkStartCode, sel.remaining - 1)}
                    </span>
                    .
                  </div>
                );
              })()}

              {bulkProgress && (
                <div className="w-full">
                  <div className="flex between text-xs mb-1.5">
                    <span>
                      Memproses unit {bulkProgress.current} dari {bulkProgress.total}...
                    </span>
                    <span className="mono text-violet">{bulkProgress.label}</span>
                  </div>
                  <div className="h-2 rounded bg-surface overflow-hidden">
                    <div
                      className="h-full bg-violet"
                      style={{
                        width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                        transition: 'width 0.3s ease-out',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  className="btn primary"
                  disabled={bulkLoading || !bulkStartCode || !bulkQrPhoto}
                  onClick={async () => {
                    const sel = unreceivedItems.find((it) => String(it.id) === bulkItemId);
                    if (!sel) return;
                    setBulkLoading(true);
                    try {
                      for (let index = 0; index < sel.remaining; index++) {
                        const currentLabel = generateNextLabel(bulkStartCode, index);
                        setBulkProgress({
                          current: index + 1,
                          total: sel.remaining,
                          label: currentLabel,
                        });

                        await apiFetch(`/procurement/receiving`, {
                          method: 'POST',
                          body: JSON.stringify({
                            draft_item_id: sel.id,
                            qty_received: 1,
                            received_date: bulkDate,
                            code: currentLabel,
                            qr_photo: bulkQrPhoto,
                          }),
                        });
                      }

                      // Refresh drafts state to update the UI
                      const res = await apiFetch('/procurement/receiving');
                      const validDrafts = (res.data || []).map((d) => ({
                        ...d,
                        by: d.creator?.name || d.by,
                        role: d.creator?.role || d.role,
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
                            receivedDate:
                              it.receivings && it.receivings.length > 0
                                ? new Date(it.receivings[0].received_date).toLocaleDateString(
                                    'id-ID'
                                  )
                                : null,
                          })) || [],
                      }));
                      dispatch({ type: 'SET_DRAFTS', drafts: validDrafts });
                      toast('Penerimaan massal berhasil diselesaikan!', 'ok');

                      // Reset form
                      setBulkItemId('');
                      setBulkQrPhoto(null);
                      setBulkProgress(null);
                      setShowBulk(false);
                    } catch (err) {
                      toast('Gagal memproses penerimaan massal: ' + err.message, 'warn');
                    } finally {
                      setBulkLoading(false);
                    }
                  }}
                >
                  {bulkLoading ? 'Memproses...' : 'Mulai Penerimaan Massal'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="gap-[14px]"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {displayCards.map((card) => {
          const isRec = card.isRec;
          const showForm = openForms[card.cardId];
          const data = formsData[card.cardId] || {};

          return (
            <div
              key={card.cardId}
              data-reveal
              className="p-5 rounded-[18px]"
              style={{
                background: isRec ? 'rgba(163,230,53,0.1)' : '',
                border: '1px solid ' + (isRec ? 'rgba(163,230,53,0.3)' : 'var(--color-line)'),
                transition: 'all 0.25s',
              }}
            >
              <div className="flex items-start justify-between mb-3.5">
                <div>
                  <div className={`item-kind ${card.kind === 'Inventaris' ? 'inv' : 'bhp'} mb-2`}>
                    {card.kind === 'Inventaris' ? 'INV' : 'BHP'}
                  </div>
                  {isRec && <div className="mono text-xs text-3 tracking-[0.06em]">DITERIMA</div>}
                  {!isRec && card.kind !== 'Inventaris' && card.totalReceived > 0 && (
                    <div className="mono text-xs text-amber-500 tracking-[0.06em]">
                      PARSIAL ({card.totalReceived}/{card.qty})
                    </div>
                  )}
                </div>
              </div>
              <div className="leading-[1.3] mb-1.5 text-sm">
                {card.name}{' '}
                {card.kind === 'Inventaris' ? `(Unit ${card.unitIndex}/${card.qty})` : ''}
              </div>
              <div className="text-3 text-xs mono mb-4 tracking-[0.04em]">
                {card.kind === 'Inventaris'
                  ? `1 ${!card.unit || card.unit.trim() === '1' || card.unit.trim() === '' ? 'unit' : card.unit}`
                  : `${card.qty} ${!card.unit || card.unit.trim() === '1' || card.unit.trim() === '' ? 'unit' : card.unit}`}{' '}
                · @ {window.fmtRp(card.price)}
              </div>
              {card.replaces && (
                <div className="text-xs" style={{ color: 'var(--gold)', marginBottom: 12 }}>
                  ↺ {card.replaces}
                </div>
              )}

              {!isRec && !showForm && (
                <button
                  onClick={() => handleOpenForm(card.cardId, card.maxQty)}
                  className="btn justify-center"
                >
                  Tandai diterima
                </button>
              )}

              {showForm && !isRec && (
                <div className="bg-surface/50 border border-line-2 rounded-lg p-3 text-xs flex flex-col gap-3">
                  <div className="field mb-0">
                    <div className="field-lbl">
                      Tanggal Diterima <span className="req">*</span>
                    </div>
                    <input
                      type="date"
                      className="input text-xs"
                      value={data.received_date}
                      onChange={(e) => handleChange(card.cardId, 'received_date', e.target.value)}
                    />
                  </div>
                  {card.kind === 'Inventaris' && (
                    <>
                      <div className="field mb-0">
                        <div className="field-lbl">
                          Penomoran Label Internal <span className="req">*</span>
                        </div>
                        <input
                          type="text"
                          className="input text-xs"
                          placeholder="Contoh: INV-2026-001"
                          value={data.code}
                          onChange={(e) => handleChange(card.cardId, 'code', e.target.value)}
                        />
                        <div className="text-[10px] text-ink-3 mt-1">
                          Sistem akan otomatis meng-generate QR Code dari nomor ini.
                        </div>
                      </div>
                      <div className="field mb-0">
                        <div className="field-lbl">
                          Upload Foto QR Universitas <span className="req">*</span>
                        </div>
                        <input
                          type="file"
                          className="input text-xs"
                          accept="image/*"
                          onChange={(e) => handleFileChange(card.cardId, e.target.files[0])}
                        />
                      </div>
                    </>
                  )}
                  {card.kind !== 'Inventaris' && (
                    <div className="field mb-0">
                      <div className="field-lbl">
                        Jumlah Diterima <span className="req">*</span>
                      </div>
                      <input
                        type="number"
                        className="input text-xs"
                        max={card.maxQty}
                        min={0.1}
                        step="0.1"
                        value={data.qty_received}
                        onChange={(e) => handleChange(card.cardId, 'qty_received', e.target.value)}
                      />
                      <div className="text-[10px] text-ink-3 mt-1">
                        Sisa yang harus diterima: {card.maxQty} {card.unit}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleSubmit(card)}
                      className="btn sm primary flex-1 justify-center"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => handleCancelForm(card.cardId)}
                      className="btn sm justify-center"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {isRec && (
                <div className="mt-3 pt-3 border-t border-line-2/50 text-[11px] text-ink-3 flex flex-col gap-1.5">
                  <div className="flex gap-2 aic">
                    <Icon name="calendar" size={11} />{' '}
                    {card.recData &&
                      new Date(card.recData.received_date).toLocaleDateString('id-ID')}
                  </div>
                  {card.kind === 'Inventaris' && card.recData?.Inventory && (
                    <>
                      <div className="flex gap-2 aic">
                        <Icon name="tag" size={11} /> {card.recData.Inventory.code}
                      </div>
                      {card.recData.Inventory.Labels &&
                        card.recData.Inventory.Labels[0]?.photo_url && (
                          <div className="flex gap-2 aic text-emerald-500">
                            <Icon name="check" size={11} /> Foto QR Univ tersimpan
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
