import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  useStore,
  useToast,
  Icon,
  D,
  useSearch,
  CustomSelect,
} from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { BhpItem } from '../../../store/store.types';

interface RestockRow {
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

const monthOptions = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export function BHP() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find((r) => r.id === state.role);

  const [reductionItem, setReductionItem] = useState<BhpItem | null>(null);
  const [reductionQty, setReductionQty] = useState('');
  const [reductionReason, setReductionReason] = useState('');
  const [reducing, setReducing] = useState(false);

  const [restockItem, setRestockItem] = useState<BhpItem | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockReason, setRestockReason] = useState('');
  const [restocking, setRestocking] = useState(false);

  // Staflab restock request (via draft)
  const [showRestockRequest, setShowRestockRequest] = useState(false);
  const [restockRows, setRestockRows] = useState<RestockRow[]>([]);
  const [restockTitle, setRestockTitle] = useState(
    'Restock BHP · ' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  );
  const [submittingRestock, setSubmittingRestock] = useState(false);

  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [years, setYears] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [bhpList, setBhpList] = useState<BhpItem[]>([]);
  const limit = 10;
  const prevDeps = useRef({ currentPage, monthFilter, yearFilter, roomFilter, query });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [monthFilter, yearFilter, roomFilter, query]);

  // Fetch unique last_in years once on mount
  useEffect(() => {
    async function fetchBhpYears() {
      try {
        const res = await apiFetch('/bhp?limit=1000');
        if (res.data) {
          const uniqueYears = [
            ...new Set(
              res.data.map((b: any) =>
                b.last_in && b.last_in !== '-' ? b.last_in.split('-')[0] : null
              )
            ),
          ]
            .filter(Boolean)
            .sort() as string[];
          setYears(uniqueYears);
        }
      } catch (err) {
        console.error('Failed to fetch BHP years:', err);
      }
    }
    fetchBhpYears();
  }, []);

  useEffect(() => {
    let active = true;

    const depsChanged =
      prevDeps.current.currentPage !== currentPage ||
      prevDeps.current.monthFilter !== monthFilter ||
      prevDeps.current.yearFilter !== yearFilter ||
      prevDeps.current.roomFilter !== roomFilter ||
      prevDeps.current.query !== query;

    prevDeps.current = { currentPage, monthFilter, yearFilter, roomFilter, query };

    async function loadBhpData(silent = false) {
      if (!silent) setLoadingList(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });
        if (monthFilter !== 'all') params.append('month', monthFilter);
        if (yearFilter !== 'all') params.append('year', yearFilter);
        if (roomFilter !== 'all') params.append('room_id', roomFilter);
        if (query) params.append('search', query);

        const res = await apiFetch(`/bhp?${params.toString()}`);
        if (!active) return;
        if (res.data) {
          const formatted = res.data.map((b: any) => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General',
            roomName: b.Room?.name || 'Gudang',
          }));
          setBhpList(formatted);
          if (res.pagination) {
            setTotalPages(res.pagination.pages || 1);
            setTotalItems(res.pagination.total || 0);
          }
        }
      } catch (err) {
        console.error('Failed to load BHP:', err);
      } finally {
        if (active && !silent) setLoadingList(false);
      }
    }

    const isFirstLoad = bhpList.length === 0;
    const silent = !isFirstLoad && !depsChanged;

    loadBhpData(silent);

    return () => {
      active = false;
    };
  }, [state.bhp, currentPage, monthFilter, yearFilter, roomFilter, query]);

  async function submitRestock() {
    if (!restockItem) return;
    if (!restockQty || isNaN(parseFloat(restockQty)) || parseFloat(restockQty) <= 0) {
      toast('Jumlah penambahan tidak valid!', 'warn');
      return;
    }
    if (!restockReason.trim()) {
      toast('Keterangan sumber barang wajib diisi!', 'warn');
      return;
    }

    setRestocking(true);
    try {
      const qty = parseFloat(restockQty);
      const newStock = restockItem.stock + qty;

      const res = await apiFetch(`/bhp/${restockItem.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock,
          last_in: new Date().toISOString().substring(0, 10),
          reason: restockReason.trim(),
        }),
      });
      if (res.data) {
        dispatch({
          type: 'BHP_RESTOCK',
          id: restockItem.id,
          amount: qty,
          date: new Date().toISOString().slice(0, 10),
        });
        toast(`+${qty} ${restockItem.unit} (${restockItem.name}) berhasil ditambahkan`, 'ok');
        setRestockItem(null);
      }
    } catch (err: any) {
      toast('Gagal melakukan restock: ' + err.message, 'warn');
    } finally {
      setRestocking(false);
    }
  }

  async function submitReduction() {
    if (!reductionItem) return;
    if (!reductionQty || isNaN(parseFloat(reductionQty)) || parseFloat(reductionQty) <= 0) {
      toast('Jumlah pengurangan tidak valid!', 'warn');
      return;
    }
    if (parseFloat(reductionQty) > reductionItem.stock) {
      toast(
        `Jumlah melebihi stok yang ada (${reductionItem.stock} ${reductionItem.unit})!`,
        'warn'
      );
      return;
    }
    if (!reductionReason.trim()) {
      toast('Keterangan keperluan wajib diisi!', 'warn');
      return;
    }

    setReducing(true);
    try {
      const qty = parseFloat(reductionQty);
      const newStock = Math.max(0, reductionItem.stock - qty);

      const res = await apiFetch(`/bhp/${reductionItem.dbId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stock: newStock,
          reason: reductionReason.trim(),
        }),
      });

      if (res.data) {
        dispatch({ type: 'BHP_DELTA', id: reductionItem.id, delta: -qty });
        toast(`−${qty} ${reductionItem.unit} (${reductionItem.name}) berhasil dikurangi`, 'ok');
        setReductionItem(null);
      }
    } catch (err: any) {
      toast('Gagal mengurangi stok: ' + err.message, 'warn');
    } finally {
      setReducing(false);
    }
  }

  const filteredBhp = bhpList;

  return (
    <div className="page" style={{ '--role-accent': role ? role.accent : undefined } as any}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Barang Habis Pakai</h1>
          <p className="page-sub">
            Pantau stok barang habis pakai (BHP) dan prediksi AI kebutuhan stok berdasarkan tren
            historis dan riwayat maintenance aset di lab.
          </p>
        </div>
        {(state.role === 'staflab' || state.role === 'admin') && (
          <button
            className="btn primary"
            onClick={() => {
              setRestockRows([
                {
                  bhpId: state.bhp[0]?.id || '',
                  qty: '',
                  unit: state.bhp[0]?.unit || 'pcs',
                  price: '',
                },
              ]);
              setRestockTitle(
                'Restock BHP · ' +
                  new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
              );
              setShowRestockRequest(true);
            }}
          >
            <Icon name="plus" size={13} strokeWidth={2.4} /> Ajukan Restock
          </button>
        )}
      </div>

      <div
        data-reveal
        className="flex flex-wrap gap-2 mb-[18px]"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <CustomSelect
          value={monthFilter}
          onChange={setMonthFilter}
          options={monthOptions}
          style={{ width: '130px' }}
          placeholder="Semua Bulan"
        />
        <CustomSelect
          value={yearFilter}
          onChange={setYearFilter}
          options={[
            { value: 'all', label: 'Semua Tahun' },
            ...years.map((y) => ({ value: y, label: y })),
          ]}
          style={{ width: '130px' }}
          placeholder="Semua Tahun"
        />
        <CustomSelect
          value={roomFilter}
          onChange={setRoomFilter}
          options={[
            { value: 'all', label: 'Semua Ruangan' },
            ...state.rooms.map((r: any) => ({
              value: r.id.toString(),
              label: `${r.code} - ${r.name}`,
            })),
          ]}
          style={{ width: '180px' }}
          placeholder="Semua Ruangan"
        />
      </div>

      <div className="bhp-list" data-reveal>
        <div
          className=""
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 100px 1fr 100px 110px',
            gap: 14,
            padding: '12px 18px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid var(--color-line)',
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <div>ID</div>
          <div>NAMA / KATEGORI</div>
          <div>STOK</div>
          <div>BAR</div>
          <div>TERAKHIR MASUK</div>
          <div>AKSI</div>
        </div>
        {loadingList ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="skeleton-row shimmer"
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 100px 1fr 100px 110px',
                gap: 14,
                padding: '12px 18px',
                alignItems: 'center',
                height: 'auto',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    width: '120px',
                    height: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                  }}
                />
                <div
                  style={{
                    width: '60px',
                    height: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <div
                style={{
                  width: '40px',
                  height: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  width: '80px',
                  height: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  width: '30px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                }}
              />
            </div>
          ))
        ) : filteredBhp.length === 0 ? (
          <div
            className="empty"
            style={{
              padding: '48px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="ico"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Icon name="search" size={20} />
            </div>
            <h4>Tidak ada BHP cocok</h4>
            <div className="text-3" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
              Coba ubah kata kunci pencarian atau filter tanggal.
            </div>
          </div>
        ) : (
          filteredBhp.map((b: BhpItem) => {
            const pct = Math.min(100, (b.stock / (b.min * 3)) * 100);
            const status = b.stock <= b.min ? 'low' : b.stock <= b.min * 1.5 ? 'warn' : 'ok';
            return (
              <div key={b.id} className={`bhp-row ${b.stock <= b.min ? 'low' : ''}`}>
                <div className="bhp-id">{b.id}</div>
                <div>
                  <div className="bhp-name">{b.name}</div>
                  <div className="bhp-cat">
                    {b.cat} · {b.roomName || 'Gudang'}
                  </div>
                </div>
                <div className="bhp-stock-v">
                  {b.stock}
                  <span className="bhp-unit" style={{ marginLeft: 4 }}>
                    {b.unit}
                  </span>
                </div>
                <div>
                  <div
                    className={`bhp-stock-bar ${status === 'low' ? 'low' : status === 'warn' ? 'warn' : ''}`}
                  >
                    <span className="" style={{ width: pct + '%' }} />
                  </div>
                  <div className="text-3 mono text-xs mt-2">
                    min: {b.min} {b.unit}
                  </div>
                </div>
                <div className="text-3 mono text-xs">{b.lastIn}</div>
                <div className="flex gap-1">
                  <button
                    className="act-btn text-violet hover:bg-violet/10"
                    style={{ color: '#a855f7' }}
                    onClick={() =>
                      dispatch({
                        type: 'OPEN_MODAL',
                        modal: {
                          kind: 'aiPredictive',
                          payload: { bhpId: b.dbId, bhpName: b.name },
                        },
                      })
                    }
                    title="AI Predictive Analysis"
                  >
                    <Icon name="bolt" size={12} strokeWidth={2.4} />
                  </button>
                  {state.role === 'staflab' && (
                    <>
                      <button
                        className="act-btn"
                        onClick={() => {
                          setReductionItem(b);
                          setReductionQty('1');
                          setReductionReason('');
                        }}
                        title="Kurangi Stok"
                        aria-label={`Kurangi stok ${b.name}`}
                      >
                        <Icon name="minus" size={12} strokeWidth={2.4} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className="flex justify-between items-center mt-6 p-4 border-t border-line"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.01)',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <span className="text-sm text-ink-3" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            Menampilkan {filteredBhp.length} dari {totalItems} barang (Halaman {currentPage} dari{' '}
            {totalPages})
          </span>
          <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn sm border border-line"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Sebelumnya
            </button>
            <button
              className="btn sm border border-line"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* ── Staflab Restock Request Modal ── */}
      {showRestockRequest &&
        createPortal(
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
                <button
                  className="x-btn"
                  onClick={() => setShowRestockRequest(false)}
                  disabled={submittingRestock}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
              <p className="text-xs text-3 mb-4" style={{ lineHeight: 1.5 }}>
                Pengajuan akan dikirim sebagai draf pengadaan ke <strong>Kaprodi</strong> untuk
                di-review dan disetujui sebelum barang bisa diterima.
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
                    setRestockRows((r: RestockRow[]) => [
                      ...r,
                      {
                        bhpId: state.bhp[0]?.id || '',
                        qty: '',
                        unit: state.bhp[0]?.unit || 'pcs',
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
                            const found = state.bhp.find((b: any) => b.id === e.target.value);
                            setRestockRows((r: RestockRow[]) =>
                              r.map((x, j) =>
                                j === i
                                  ? { ...x, bhpId: e.target.value, unit: found?.unit || 'pcs' }
                                  : x
                              )
                            );
                          }}
                          disabled={submittingRestock}
                        >
                          {state.bhp.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} (stok: {b.stock} {b.unit})
                            </option>
                          ))}
                        </select>
                        <button
                          className="x-btn"
                          onClick={() =>
                            setRestockRows((r: RestockRow[]) => r.filter((_, j) => j !== i))
                          }
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
                            setRestockRows((r: RestockRow[]) =>
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
                            setRestockRows((r: RestockRow[]) =>
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
                <button
                  className="btn"
                  onClick={() => setShowRestockRequest(false)}
                  disabled={submittingRestock}
                >
                  Batal
                </button>
                <button
                  className="btn primary"
                  disabled={submittingRestock}
                  onClick={async () => {
                    const validRows = restockRows.filter(
                      (r) => r.bhpId && r.qty && Number(r.qty) > 0
                    );
                    if (validRows.length === 0) {
                      toast('Isi minimal 1 item BHP dengan jumlah!', 'warn');
                      return;
                    }

                    setSubmittingRestock(true);
                    try {
                      const items = validRows.map((r) => {
                        const found = state.bhp.find((b: any) => b.id === r.bhpId);
                        return {
                          kind: 'BHP',
                          name: found?.name || r.bhpId,
                          qty: Number(r.qty),
                          unit: r.unit || 'pcs',
                          price: Number(String(r.price).replace(/\D/g, '')) || 0,
                          link: null,
                          replaces: null,
                        };
                      });

                      const createRes = await apiFetch('/procurement/drafts', {
                        method: 'POST',
                        body: JSON.stringify({ title: restockTitle, items }),
                      });
                      if (!createRes.data) throw new Error('Gagal membuat pengajuan');

                      await apiFetch(`/procurement/drafts/${createRes.data.id}/submit`, {
                        method: 'POST',
                      });
                      toast('Pengajuan restock berhasil dikirim ke Kaprodi!', 'ok');
                      setShowRestockRequest(false);
                    } catch (err: any) {
                      toast('Gagal mengirim pengajuan: ' + err.message, 'warn');
                    } finally {
                      setSubmittingRestock(false);
                    }
                  }}
                >
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
        )}

      {/* ── Reduction Modal ── */}
      {reductionItem &&
        createPortal(
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
                    Kurangi stok <b>{reductionItem.name}</b> · Stok saat ini:{' '}
                    <b>
                      {reductionItem.stock} {reductionItem.unit}
                    </b>
                  </p>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-lbl">
                  Jumlah Pengurangan ({reductionItem.unit}) <span className="req">*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  min="0.1"
                  max={reductionItem.stock}
                  value={reductionQty}
                  onChange={(e) => setReductionQty(e.target.value)}
                  placeholder={`Maksimal ${reductionItem.stock} ${reductionItem.unit}`}
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
                <button className="btn" onClick={() => setReductionItem(null)} disabled={reducing}>
                  Batal
                </button>
                <button className="btn danger" onClick={submitReduction} disabled={reducing}>
                  {reducing ? 'Mengurangi...' : 'Kurangi Stok'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Restock (Addition) Modal ── */}
      {restockItem &&
        createPortal(
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
                    Tambah stok <b>{restockItem.name}</b> · Stok saat ini:{' '}
                    <b>
                      {restockItem.stock} {restockItem.unit}
                    </b>
                  </p>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-lbl">
                  Jumlah Penambahan ({restockItem.unit}) <span className="req">*</span>
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
                <button className="btn" onClick={() => setRestockItem(null)} disabled={restocking}>
                  Batal
                </button>
                <button className="btn primary" onClick={submitRestock} disabled={restocking}>
                  {restocking ? 'Menambahkan...' : 'Tambah Stok'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function NewBhpForm({ payload, close }: { payload?: any; close: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const [mode, setMode] = useState('restock'); // 'restock' or 'new'
  const [loading, setLoading] = useState(false);

  // Mode Restock
  const [selectedId, setSelectedId] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [drawerReason, setDrawerReason] = useState('');

  // Mode New
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [category, setCategory] = useState('General');

  // Pre-fill if payload is provided
  useEffect(() => {
    if (payload?.bhpId) {
      setMode('restock');
      setSelectedId(payload.bhpId);
    }
  }, [payload]);

  const categories = ['General', 'Networking', 'Fabrikasi', 'Workstation', 'Instrumen', 'Embedded'];

  async function handleSave() {
    setLoading(true);
    try {
      if (mode === 'restock') {
        if (!selectedId) {
          toast('Silakan pilih item BHP.', 'warn');
          setLoading(false);
          return;
        }
        const qty = parseFloat(restockQty);
        if (isNaN(qty) || qty <= 0) {
          toast('Jumlah restock harus lebih besar dari 0.', 'warn');
          setLoading(false);
          return;
        }
        const b = state.bhp.find((x: any) => x.id === selectedId);
        if (!b) {
          toast('Item BHP tidak ditemukan.', 'warn');
          setLoading(false);
          return;
        }

        const res = await apiFetch(`/bhp/${b.dbId}`, {
          method: 'PUT',
          body: JSON.stringify({
            stock: b.stock + qty,
            last_in: new Date().toISOString().substring(0, 10),
            reason: drawerReason.trim() || 'Restock manual via drawer',
          }),
        });

        if (res.data) {
          dispatch({
            type: 'BHP_RESTOCK',
            id: selectedId,
            amount: qty,
            date: new Date().toISOString().slice(0, 10),
          });
          toast(`+${qty} ${b.unit} ${b.name} ditambahkan`, 'ok');
          close();
        }
      } else {
        // Mode New
        if (!code || !name || !unit) {
          toast('Kode, Nama, dan Satuan wajib diisi.', 'warn');
          setLoading(false);
          return;
        }

        // Check if code already exists
        const exists = state.bhp.some((x: any) => x.id.toLowerCase() === code.toLowerCase());
        if (exists) {
          toast(`Kode BHP "${code}" sudah terdaftar.`, 'warn');
          setLoading(false);
          return;
        }

        const res = await apiFetch('/bhp', {
          method: 'POST',
          body: JSON.stringify({
            code,
            name,
            unit,
            stock: parseFloat(stock) || 0,
            min_stock: parseFloat(minStock) || 0,
            category,
            last_in: stock ? new Date().toISOString().substring(0, 10) : null,
          }),
        });

        if (res.data) {
          const b = res.data;
          const formattedNewItem = {
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General',
          };
          dispatch({ type: 'SET_BHP', bhp: [...state.bhp, formattedNewItem] });
          toast(`BHP "${name}" berhasil ditambahkan.`, 'ok');
          close();
        }
      }
    } catch (err: any) {
      toast('Gagal memproses manual restock: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">Restock Manual BHP</div>
        <button className="x-btn" onClick={close} disabled={loading}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="drawer-body">
        {/* Toggle mode */}
        <div
          className="flex gap-1.5 p-1 bg-surface border border-line rounded-lg mb-4"
          style={{ background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 10 }}
        >
          <button
            type="button"
            className={`btn sm flex-1 ${mode === 'restock' ? 'primary' : 'ghost'}`}
            onClick={() => setMode('restock')}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            Restock Item Terdaftar
          </button>
          <button
            type="button"
            className={`btn sm flex-1 ${mode === 'new' ? 'primary' : 'ghost'}`}
            onClick={() => setMode('new')}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
          >
            Tambah Item Baru
          </button>
        </div>

        {mode === 'restock' ? (
          <div
            className="flex flex-col gap-4"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="field">
              <div className="field-lbl">
                Pilih Item BHP <span className="req">*</span>
              </div>
              <select
                className="select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Pilih Barang --</option>
                {state.bhp.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.id} - {b.name} (Stok: {b.stock} {b.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="field-lbl">
                Jumlah Ditambahkan <span className="req">*</span>
              </div>
              <div
                className="flex gap-2 items-center"
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  type="number"
                  className="input"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="Misal: 50"
                  disabled={loading}
                />
                <span
                  className="text-sm font-semibold mono color-ink-3"
                  style={{ opacity: 0.5, fontFamily: 'monospace' }}
                >
                  {selectedId ? state.bhp.find((x: any) => x.id === selectedId)?.unit : ''}
                </span>
              </div>
            </div>

            <div className="field">
              <div className="field-lbl">Keterangan / Sumber Barang</div>
              <textarea
                className="textarea"
                value={drawerReason}
                onChange={(e) => setDrawerReason(e.target.value)}
                placeholder="Contoh: Pengadaan semester ganjil 2025/2026"
                disabled={loading}
                rows={2}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col gap-4"
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div
              className="grid grid-cols-2 gap-3"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
              <div className="field">
                <div className="field-lbl">
                  Kode BHP <span className="req">*</span>
                </div>
                <input
                  type="text"
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="B-011"
                  disabled={loading}
                />
              </div>
              <div className="field">
                <div className="field-lbl">Kategori</div>
                <select
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <div className="field-lbl">
                Nama Barang <span className="req">*</span>
              </div>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Solder Tin 1.0mm Goot"
                disabled={loading}
              />
            </div>

            <div
              className="grid grid-cols-3 gap-3"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}
            >
              <div className="field">
                <div className="field-lbl">Stok Awal</div>
                <input
                  type="number"
                  className="input"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  disabled={loading}
                />
              </div>
              <div className="field">
                <div className="field-lbl">Batas Min</div>
                <input
                  type="number"
                  className="input"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="10"
                  disabled={loading}
                />
              </div>
              <div className="field">
                <div className="field-lbl">
                  Satuan <span className="req">*</span>
                </div>
                <input
                  type="text"
                  className="input"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs / roll"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>
          Batal
        </button>
        <button className="btn primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Memproses...' : 'Simpan'}
        </button>
      </div>
    </>
  );
}
