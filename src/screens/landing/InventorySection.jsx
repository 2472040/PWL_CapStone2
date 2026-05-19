import React from 'react';
import { D, FakeQR, AuRise, AuStagger, ScrambleText } from './LandingUtils.jsx';

export default function InventorySection() {
  return (
    <section className="au-section" id="inv-section">
      <AuRise>
        <div className="au-section-tag"><ScrambleText text="— Inventaris" /></div>
        <h2 className="au-section-h2">Cari satu aset, tahu segalanya — di mana, <em>kondisinya apa</em>, kapan terakhir dipakai.</h2>
        <p className="au-section-sub">Setiap aset punya kartu sendiri dengan QR fisik, riwayat maintenance, dan riwayat pemakaian per praktikum. Tidak perlu lagi cari di spreadsheet.</p>
      </AuRise>

      <AuStagger className="au-inv-grid">
        {D.inventory.map((it, i) => (
          <div key={it.code} className="au-inv-card">
            <div className="au-inv-card-head">
              <div>
                <div className="au-inv-code">{it.code}</div>
              </div>
              <FakeQR seed={it.code} />
            </div>
            <div className="au-inv-name">{it.name}</div>
            <div className="au-inv-cat">{it.cat}</div>
            <div className="au-inv-meta">
              <div className="au-inv-meta-row">
                <span className="k">Ruangan</span>
                <span className="v">{it.room}</span>
              </div>
              <div className="au-inv-meta-row">
                <span className="k">Kondisi</span>
                <span><span className={`au-cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span></span>
              </div>
              <div className="au-inv-meta-row">
                <span className="k">Terakhir digunakan</span>
                <span className="v au-mono" style={{ fontSize: 11 }}>{it.last}</span>
              </div>
            </div>
          </div>
        ))}
      </AuStagger>
    </section>
  );
}
