import React, { useState, useEffect } from 'react';
import { useStore, D, Icon, QR, downloadQR } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Labels() {
  const { state, dispatch } = useStore();
  const role = D.roles.find((r) => r.id === 'admin');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    async function loadLabels() {
      try {
        const res = await apiFetch('/inventory');
        if (res.data) {
          const inv = res.data.map((i) => ({
            code: i.code,
            name: i.name,
            room: i.Room?.name || 'Belum ada ruangan',
            photoUrl: i.label?.photo_url || null,
          }));
          setRecent(inv.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to load inventory for labels:', err);
      }
    }
    loadLabels();
  }, []);

  return (
    <div className="page" style={{ '--role-accent': role.accent }}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">
            Cetak <em>label</em> QR
          </h1>
          <p className="page-sub">
            Generate QR internal & foto QR Universitas untuk aset yang baru diterima.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newInventory' } })}
          >
            <Icon name="plus" size={13} strokeWidth={2.4} /> Tambah aset (Manual Scan)
          </button>
          <button
            className="btn"
            onClick={() =>
              window.showToast && window.showToast('Mencetak label batch…', 'info', 'download')
            }
          >
            <Icon name="download" size={13} /> Print batch
          </button>
        </div>
      </div>

      <div
        data-reveal
        className="gap-3"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}
      >
        {recent.map((it) => (
          <div key={it.code} className="card p-4 flex flex-col justify-between">
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-ink-3 uppercase mb-2 font-semibold tracking-wider">
                  QR Internal
                </div>
                <QR seed={it.code} size={8} />
              </div>
              {it.photoUrl && (
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-ink-3 uppercase mb-2 font-semibold tracking-wider">
                    QR Universitas
                  </div>
                  <img
                    src={it.photoUrl}
                    alt="QR Univ"
                    style={{
                      width: 128,
                      height: 128,
                      objectFit: 'contain',
                      background: '#fff',
                      padding: 4,
                      borderRadius: 8,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="mono text-xs tracking-[0.08em]" style={{ color: role.accent }}>
                {it.code}
              </div>
              <div className="text-sm fw-5 mt-2 leading-[1.3]">{it.name}</div>
              <div className="text-xs text-3 mt-2 mb-3">{it.room}</div>
            </div>
            <div className="flex gap-2 mt-auto">
              <button className="btn sm flex-1 justify-center" onClick={() => downloadQR(it.code)}>
                <Icon name="download" size={11} /> Internal
              </button>
              {it.photoUrl && (
                <button
                  className="btn sm flex-1 justify-center"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = it.photoUrl;
                    a.download = `QR_Univ_${it.code}.png`;
                    a.click();
                  }}
                >
                  <Icon name="download" size={11} /> Univ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
