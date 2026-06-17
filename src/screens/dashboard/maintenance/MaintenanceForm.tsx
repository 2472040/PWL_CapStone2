import { useState, useEffect } from 'react';
import { useStore, useToast, Icon, QR, CustomSelect } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';

interface BhpRow {
  id: string;
  qty: number | string;
  assetCode: string;
}

export function MaintenanceForm({ payload, close }: { payload?: any; close: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const isEdit = !!payload?.dbId;
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [action, setAction] = useState(payload?.action || '');
  const [cond, setCond] = useState(payload?.cond || 'Baik');
  const [maintDate, setMaintDate] = useState(
    payload?.rawDate ? payload.rawDate.substring(0, 10) : new Date().toISOString().substring(0, 10)
  );
  const [bhpRows, setBhpRows] = useState<BhpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const filteredAssets = state.inventory.filter(
    (i: any) => String(i.roomId) === String(selectedRoomId)
  );
  const selectedAssetData = filteredAssets.filter((a: any) => selectedAssets.includes(a.code));

  useEffect(() => {
    if (isEdit && payload?.asset) {
      const editAsset = state.inventory.find((i: any) => i.code === payload.asset);

      if (editAsset) {
        setSelectedRoomId(editAsset.roomId || '');
        setSelectedAssets([editAsset.code]);
      }
    }
  }, [isEdit, payload, state.inventory]);

  function addBhp() {
    const first = state.bhp[0];
    if (!first) {
      toast('Tidak ada data BHP tersedia', 'warn');
      return;
    }
    setBhpRows((r) => [
      ...r,
      { id: first.id, qty: 1, assetCode: selectedAssets.length > 0 ? selectedAssets[0] : 'all' },
    ]);
  }
  function updateBhp(idx: number, patch: Partial<BhpRow>) {
    setBhpRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function removeBhp(idx: number) {
    setBhpRows((r) => r.filter((_, i) => i !== idx));
  }

  async function save() {
    if (selectedAssets.length === 0) {
      toast('Pilih aset dulu', 'warn');
      return;
    }
    if (!action) {
      toast('Isi tindakan maintenance', 'warn');
      return;
    }
    if (!maintDate) {
      toast('Pilih tanggal maintenance', 'warn');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEdit ? `/maintenance/${payload.dbId}` : '/maintenance';
      const method = isEdit ? 'PUT' : 'POST';

      let bhpPayload: any[] = [];
      if (!isEdit) {
        bhpRows.forEach((b) => {
          const bd = state.bhp.find((x: any) => x.id === b.id);
          if (!bd) return;
          if (b.assetCode === 'all') {
            selectedAssets.forEach((ac) => {
              bhpPayload.push({
                asset_code: ac,
                bhp_id: bd.dbId,
                qty: parseFloat(b.qty as string),
              });
            });
          } else {
            bhpPayload.push({
              asset_code: b.assetCode,
              bhp_id: bd.dbId,
              qty: parseFloat(b.qty as string),
            });
          }
        });
      }

      const body = isEdit
        ? {
            action,
            condition_after: cond,
            date: maintDate,
          }
        : {
            inventory_ids: selectedAssetData.map((a: any) => a.id),
            action,
            condition_after: cond,
            date: maintDate,
            bhp_used: bhpPayload,
          };

      const res = await apiFetch(endpoint, {
        method: method,
        body: JSON.stringify(body),
      });

      if (res.data) {
        const resLogs = await apiFetch('/maintenance');
        if (resLogs.data) {
          const formattedLogs = resLogs.data.map((l: any) => ({
            id: l.code || l.id,
            dbId: l.id,
            date: new Date(l.date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            rawDate: l.date,
            asset: l.Inventory?.code,
            name: l.Inventory?.name,
            action: l.action,
            tech: l.technician?.name || 'Teknisi',
            cond: l.condition_after,
            bhp:
              l.bhpUsed?.map((bu: any) => ({
                id: bu.Bhp?.code || bu.bhp_id,
                qty: parseFloat(bu.qty_used) || 0,
                unit: bu.Bhp?.unit || 'pcs',
              })) || [],
          }));
          dispatch({ type: 'SET_MAINT_LOGS', logs: formattedLogs });
        }
        const resBhp = await apiFetch('/bhp');
        if (resBhp.data) {
          const formattedBhp = resBhp.data.map((b: any) => ({
            id: b.code || b.id.toString(),
            dbId: b.id,
            name: b.name,
            unit: b.unit,
            stock: parseFloat(b.stock) || 0,
            min: parseFloat(b.min_stock) || 0,
            lastIn: b.last_in || '-',
            cat: b.category || 'General',
          }));
          dispatch({ type: 'SET_BHP', bhp: formattedBhp });
        }
        const updatedInventory = state.inventory.map((x: any) =>
          !selectedAssets.includes(x.code) ? x : { ...x, cond: cond, last: 'baru saja' }
        );
        dispatch({ type: 'SET_INVENTORY', inventory: updatedInventory });

        toast(
          isEdit ? 'Log maintenance berhasil diperbarui!' : 'Log maintenance disimpan ke database!',
          'ok'
        );
        close();
      }
    } catch (err: any) {
      toast('Gagal menyimpan log: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">
          {isEdit ? 'Ubah log maintenance' : 'Log maintenance baru'}
        </div>
        <button className="x-btn" onClick={close} disabled={loading}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="drawer-body">
        <div className="field">
          <div className="field-lbl">
            Ruangan <span className="req">*</span>
          </div>
          <CustomSelect
            value={selectedRoomId}
            onChange={(val) => {
              setSelectedRoomId(val);
              setSelectedAssets([]);
            }}
            options={[
              { value: '', label: 'Pilih ruangan…' },
              ...state.rooms.map((r: any) => ({
                value: r.id.toString(),
                label: r.name,
              })),
            ]}
            disabled={loading || isEdit}
            style={{ width: '100%' }}
            placeholder="Pilih ruangan…"
          />
        </div>

        <div className="field">
          <div className="flex between aic mb-2">
            <div className="field-lbl mb-0">
              Aset yang dimaintenance <span className="req">*</span>
            </div>
            {filteredAssets.length > 0 && !isEdit && (
              <label className="text-xs flex aic gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAssets.length === filteredAssets.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssets(filteredAssets.map((a: any) => a.code));
                    } else {
                      setSelectedAssets([]);
                    }
                  }}
                  disabled={loading}
                />
                Pilih Semua
              </label>
            )}
          </div>

          {!selectedRoomId ? (
            <div className="text-xs text-3">Pilih ruangan terlebih dahulu</div>
          ) : (
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid var(--line-2)',
                borderRadius: 8,
                padding: 8,
              }}
            >
              {filteredAssets.map((asset: any) => (
                <label
                  key={asset.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 4px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(asset.code)}
                    disabled={loading || isEdit}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssets((prev) => [...prev, asset.code]);
                      } else {
                        setSelectedAssets((prev) => prev.filter((x) => x !== asset.code));
                      }
                    }}
                  />

                  <span>
                    {asset.code} — {asset.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedAssetData.length > 0 && (
          <div className="card compact mb-4">
            {selectedAssetData.map((asset: any) => (
              <div key={asset.code} className="flex gap-3 items-center mb-2">
                <QR seed={asset.code} size={6} />

                <div>
                  <div className="fw-5">{asset.name}</div>

                  <div className="text-xs text-3">{asset.code}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <div className="field-lbl">
            Tanggal Maintenance <span className="req">*</span>
          </div>
          <input
            className="input w-full"
            type="date"
            value={maintDate}
            onChange={(e) => setMaintDate(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="field">
          <div className="field-lbl">
            Tindakan <span className="req">*</span>
          </div>
          <textarea
            className="textarea"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Misal: Kalibrasi probe, cleaning kontak, ganti termal paste…"
            disabled={loading}
          />
        </div>

        <div className="field">
          <div className="field-lbl">Kondisi setelah maintenance</div>
          <div className="flex gap-1.5">
            {['Baik', 'Perlu cek', 'Maintenance'].map((c) => (
              <button
                key={c}
                disabled={loading}
                className={`btn sm ${cond === c ? 'primary' : ''}`}
                onClick={() => setCond(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isEdit ? (
          <div className="field">
            <div className="field-lbl">BHP yang telah digunakan</div>
            {!payload.bhp || payload.bhp.length === 0 ? (
              <div className="text-3 text-xs mono">// tidak ada BHP yang digunakan</div>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {payload.bhp.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs px-3 py-2 bg-surface/50 border border-line-2 rounded flex justify-between"
                  >
                    <b>{b.id}</b>
                    <span className="mono text-rose">
                      −{b.qty} {b.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="field">
            <div className="flex between aic mb-2">
              <div className="field-lbl mb-0">BHP yang dipakai</div>
              <button
                className="btn sm"
                onClick={addBhp}
                disabled={loading || selectedAssets.length === 0}
              >
                <Icon name="plus" size={11} /> Tambah BHP
              </button>
            </div>
            {bhpRows.length === 0 && (
              <div className="text-3 text-xs mono" style={{ padding: '8px 0' }}>
                // tidak ada BHP yang dipakai
              </div>
            )}
            <div className="flex flex-col gap-2">
              {bhpRows.map((b, i) => {
                const bd = state.bhp.find((x: any) => x.id === b.id);
                return (
                  <div key={i} className="bg-surface/50 border border-line-2 p-2 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        className="select flex-1"
                        value={b.assetCode}
                        onChange={(e) => updateBhp(i, { assetCode: e.target.value })}
                        disabled={loading}
                      >
                        <option value="all">Untuk Semua Aset Terpilih</option>
                        {selectedAssets.map((ac: any) => (
                          <option key={ac} value={ac}>
                            {ac}
                          </option>
                        ))}
                      </select>
                      <button className="x-btn" onClick={() => removeBhp(i)} disabled={loading}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="select flex-[2]"
                        value={b.id}
                        onChange={(e) => updateBhp(i, { id: e.target.value })}
                        disabled={loading}
                      >
                        {state.bhp.map((x: any) => (
                          <option key={x.id} value={x.id}>
                            {x.name} (stok: {x.stock})
                          </option>
                        ))}
                      </select>
                      <input
                        className="input mono flex-1"
                        type="number"
                        step="0.1"
                        value={b.qty}
                        onChange={(e) => updateBhp(i, { qty: e.target.value })}
                        placeholder={bd?.unit}
                        disabled={loading}
                      />
                      <span className="text-xs text-3 font-mono">{bd?.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {bhpRows.length > 0 && (
              <div
                className="text-xs text-3 mt-2"
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                  border: '1px dashed var(--line-2)',
                }}
              >
                <Icon name="info" size={11} /> Stok BHP akan otomatis berkurang setelah disimpan
              </div>
            )}
          </div>
        )}
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>
          Batal
        </button>
        <button className="btn primary" onClick={save} disabled={loading}>
          <Icon name="check" size={13} strokeWidth={2.4} /> Simpan log
        </button>
      </div>
    </>
  );
}
