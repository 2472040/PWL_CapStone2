import React from 'react';
import { useStore, useToast, D, Icon, QR, downloadQR } from '../../../components/app-shell.jsx';

export function InventoryDetail({ payload, close }) {
  const it = payload;
  const { state, dispatch } = useStore();
  const toast = useToast();
  const role = D.roles.find(r => r.id === state.role);
  const logs = state.maintLog.filter(l => l.asset === it.code);
  const canMaintain = state.role === 'staflab';
  const canEdit = state.role === 'admin';

  return (
    <>
      <div className="drawer-bar">
        <div>
          <div className="mono text-xs text-3 mb-2 tracking-[0.06em]" >{it.code}</div>
          <div className="drawer-title">{it.name}</div>
        </div>
        <button className="x-btn" onClick={close}><Icon name="x" size={14} /></button>
      </div>
      <div className="drawer-body">
        <div className="flex gap-4 items-start mb-[22px]" >
          <QR seed={it.code} size={9} />
          <div className="flex-1" >
            <div className="mono text-xs text-3 mb-2 tracking-[0.06em]" >SCAN QR untuk maintenance · log otomatis</div>
            <div className="flex flex-wrap gap-2" >
              <span className={`cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span>
              <span className="chip">{it.cat}</span>
              <span className="chip"><Icon name="pin" size={11} /> {it.room}</span>
            </div>
          </div>
        </div>

        <div className="spec-grid mb-6">
          <div className="spec-cell"><div className="spec-k">Serial</div><div className="spec-v mono">{it.serial}</div></div>
          <div className="spec-cell"><div className="spec-k">Diperoleh</div><div className="spec-v">{it.acquired}</div></div>
          <div className="spec-cell"><div className="spec-k">Nilai</div><div className="spec-v mono">{window.fmtRpShort ? window.fmtRpShort(it.value) : it.value}</div></div>
          <div className="spec-cell"><div className="spec-k">Last used</div><div className="spec-v text-sm">{it.last}</div></div>
        </div>

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase" >— Spesifikasi</div>
        <div className="card compact mb-6 text-[13px] text-ink-2" >{it.specs}</div>

        <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase" >— Riwayat maintenance</div>
        {logs.length === 0 ? (
          <div className="empty">
            <div className="ico"><Icon name="wrench" size={20} /></div>
            <h4>Belum ada log</h4>
            <div>Riwayat maintenance akan muncul di sini.</div>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {logs.map(l => (
              <div key={l.id} className="card compact p-3.5" >
                <div className="flex between aic mb-2">
                  <div className="fw-5 text-sm">{l.action}</div>
                  <div className="mono text-xs text-3">{l.date}</div>
                </div>
                <div className="text-xs text-3">oleh {l.tech} · kondisi setelah: <span className={`cond ${l.cond.toLowerCase().replace(' ', '-')}`}>{l.cond}</span></div>
                {l.bhp.length > 0 && (
                  <div className="text-xs text-3 mt-2">
                    BHP terpakai: {l.bhp.map(b => `${b.qty} ${b.unit} (${b.id})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={() => downloadQR(it.code)}>
          <Icon name="download" size={12} /> Unduh QR
        </button>
        {canEdit && <button className="btn"><Icon name="edit" size={12} /> Update label</button>}
        {canMaintain && (
          <button className="btn primary" onClick={() => {
            close();
            setTimeout(() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'maintenance', payload: { asset: it.code } } }), 200);
          }}>
            <Icon name="wrench" size={13} /> Log maintenance
          </button>
        )}
      </div>
    </>
  );
}
