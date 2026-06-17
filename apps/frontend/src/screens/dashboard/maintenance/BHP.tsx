import { useEffect, useState, useRef } from 'react';
import { useStore, useToast, Icon, D, useSearch } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { BhpItem } from '../../../store/store.types';
import { BhpFilters } from './bhp/BhpFilters';
import { BhpTable } from './bhp/BhpTable';
import { BhpRequestModal, BhpReductionModal, BhpRestockModal, RestockRow } from './bhp/BhpModals';

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

  async function handleRequestSubmit() {
    const validRows = restockRows.filter((r) => r.bhpId && r.qty && Number(r.qty) > 0);
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

      <BhpFilters
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        roomFilter={roomFilter}
        setRoomFilter={setRoomFilter}
        years={years}
        rooms={state.rooms}
      />

      <BhpTable
        loadingList={loadingList}
        filteredBhp={filteredBhp}
        role={state.role}
        dispatch={dispatch}
        onReduceClick={(b) => {
          setReductionItem(b);
          setReductionQty('1');
          setReductionReason('');
        }}
      />

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

      <BhpRequestModal
        isOpen={showRestockRequest}
        onClose={() => setShowRestockRequest(false)}
        bhpItems={state.bhp}
        restockTitle={restockTitle}
        setRestockTitle={setRestockTitle}
        restockRows={restockRows}
        setRestockRows={setRestockRows}
        submittingRestock={submittingRestock}
        onSubmit={handleRequestSubmit}
      />

      <BhpReductionModal
        item={reductionItem}
        onClose={() => setReductionItem(null)}
        reductionQty={reductionQty}
        setReductionQty={setReductionQty}
        reductionReason={reductionReason}
        setReductionReason={setReductionReason}
        reducing={reducing}
        onSubmit={submitReduction}
      />

      <BhpRestockModal
        item={restockItem}
        onClose={() => setRestockItem(null)}
        restockQty={restockQty}
        setRestockQty={setRestockQty}
        restockReason={restockReason}
        setRestockReason={setRestockReason}
        restocking={restocking}
        onSubmit={submitRestock}
      />
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
