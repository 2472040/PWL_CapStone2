import { useRef } from 'react';
import { useStore, Icon, QR, downloadQR, useToast } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import jsQR from 'jsqr';
import { fmtRpShort } from '../../../utils/formatter';

export function InventoryDetail({ payload, close }: { payload: any; close: () => void }) {
  const it = payload;
  const { state, dispatch } = useStore();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logs = state.maintLog.filter((l: any) => l.asset === it.code);
  const canMaintain = state.role === 'staflab';
  const canEdit = state.role === 'admin';

  const handleLabelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imgData.data, imgData.width, imgData.height);
          const qrDataVal = decoded && decoded.data ? decoded.data.trim() : `UNIV-${it.code}`;

          const res = await apiFetch(`/inventory/${it.id}/label`, {
            method: 'PUT',
            body: JSON.stringify({
              label_number: it.code,
              qr_data: qrDataVal,
              photo_url: base64,
            }),
          });

          if (res.data) {
            const updatedInv = state.inventory.map((item: any) =>
              item.id === it.id ? { ...item, photo_url: base64 } : item
            );
            dispatch({ type: 'SET_INVENTORY', inventory: updatedInv });
            toast('Label dan foto QR Universitas berhasil diperbarui!', 'ok');
            close();
          }
        } catch (err: any) {
          console.error('Error updating label:', err);
          toast('Gagal memperbarui label: ' + err.message, 'warn');
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="drawer-bar">
        <div>
          <div className="mono text-xs text-3 mb-2 tracking-[0.06em]">{it.code}</div>
          <div className="drawer-title">{it.name}</div>
        </div>
        <button className="x-btn" onClick={close}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="drawer-body">
        <div className="flex gap-4 items-start mb-[22px]">
          <QR seed={it.code} size={9} />
          <div className="flex-1">
            <div className="mono text-xs text-3 mb-2 tracking-[0.06em]">
              SCAN QR untuk maintenance · log otomatis
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span>
              <span className="chip">{it.cat}</span>
              <span className="chip">
                <Icon name="pin" size={11} /> {it.room}
              </span>
            </div>
          </div>
        </div>

        <div className="spec-grid mb-6">
          <div className="spec-cell">
            <div className="spec-k">Serial</div>
            <div className="spec-v mono">{it.serial}</div>
          </div>
          <div className="spec-cell">
            <div className="spec-k">Diperoleh</div>
            <div className="spec-v">{it.acquired}</div>
          </div>
          <div className="spec-cell">
            <div className="spec-k">Nilai</div>
            <div className="spec-v mono">{fmtRpShort(it.value)}</div>
          </div>
          <div className="spec-cell">
            <div className="spec-k">Last used</div>
            <div className="spec-v text-sm">{it.last}</div>
          </div>
        </div>

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">— Spesifikasi</div>
        <div className="card compact mb-6 text-[13px] text-ink-2">{it.specs}</div>

        {it.photo_url && (
          <>
            <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
              — Bukti QR Universitas
            </div>
            <div
              className="card compact mb-6 flex justify-center p-2"
              style={{ background: 'rgba(0,0,0,0.2)' }}
            >
              <img
                src={it.photo_url}
                alt="QR Universitas"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                }}
              />
            </div>
          </>
        )}

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase">
          — Riwayat maintenance
        </div>
        {logs.length === 0 ? (
          <div className="empty">
            <div className="ico">
              <Icon name="wrench" size={20} />
            </div>
            <h4>Belum ada log</h4>
            <div>Riwayat maintenance akan muncul di sini.</div>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {logs.map((l: any) => (
              <div key={l.id} className="card compact p-3.5">
                <div className="flex between aic mb-2">
                  <div className="fw-5 text-sm">{l.action}</div>
                  <div className="mono text-xs text-3">{l.date}</div>
                </div>
                <div className="text-xs text-3">
                  oleh {l.tech} · kondisi setelah:{' '}
                  <span className={`cond ${l.cond.toLowerCase().replace(' ', '-')}`}>{l.cond}</span>
                </div>
                {l.bhp.length > 0 && (
                  <div className="text-xs text-3 mt-2">
                    BHP terpakai: {l.bhp.map((b: any) => `${b.qty} ${b.unit} (${b.id})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="drawer-foot">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleLabelUpload}
        />
        <button className="btn" onClick={() => downloadQR(it.code)}>
          <Icon name="download" size={12} /> Unduh QR
        </button>
        {canEdit && (
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <Icon name="edit" size={12} /> Update label
          </button>
        )}
        {canMaintain && (
          <button
            className="btn primary"
            onClick={() => {
              close();
              setTimeout(
                () =>
                  dispatch({
                    type: 'OPEN_DRAWER',
                    drawer: { kind: 'maintenance', payload: { asset: it.code } },
                  }),
                200
              );
            }}
          >
            <Icon name="wrench" size={13} /> Log maintenance
          </button>
        )}
      </div>
    </>
  );
}
