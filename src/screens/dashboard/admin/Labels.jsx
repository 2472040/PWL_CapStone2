import React, { useState, useEffect } from 'react';
import { useStore, D, Icon, QR, downloadQR } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Labels() {
  const { state } = useStore();
  const role = D.roles.find(r => r.id === 'admin');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    async function loadLabels() {
      try {
        const res = await apiFetch('/inventory');
        if (res.data) {
          const inv = res.data.map(i => ({
            code: i.code,
            name: i.name,
            room: i.Room?.name || 'Belum ada ruangan'
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
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Cetak <em>label</em> QR</h1>
          <p className="page-sub">Generate QR/Barcode untuk aset yang baru diterima. Cetak ukuran 32 × 24 mm pada label thermal.</p>
        </div>
        <button className="btn primary" onClick={() => window.showToast && window.showToast('Mencetak label batch…', 'info', 'download')}><Icon name="download" size={13} /> Print batch</button>
      </div>

      <div data-reveal className="gap-3" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}>
        {recent.map(it => (
          <div key={it.code} className="card p-4 text-center flex flex-col items-center justify-between" >
            <QR seed={it.code} size={10} cls="mb-3" />
            <div>
              <div className="mono text-xs tracking-[0.08em]" style={{color: role.accent}}>{it.code}</div>
              <div className="text-sm fw-5 mt-2 leading-[1.3]" >{it.name}</div>
              <div className="text-xs text-3 mt-2 mb-3">{it.room}</div>
            </div>
            <button className="btn sm w-full justify-center" onClick={() => downloadQR(it.code)}>
              <Icon name="download" size={11} /> Unduh QR
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
