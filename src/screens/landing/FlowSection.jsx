import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { D, fmtRp, fmtRpShort, FakeQR, AuRise, ScrambleText } from './LandingUtils.jsx';
import TimelineRail from './TimelineRail.jsx';

export default function FlowSection({ step, setStep, approvals, setApproval, approveAll, received, setReceive, totals }) {
  const steps = [
    { n: 1, label: 'Kalab', sub: 'Draf pengadaan' },
    { n: 2, label: 'Kaprodi', sub: 'Review & approval' },
    { n: 3, label: 'Admin', sub: 'Receive & label' },
  ];
  const flowBarRef = useRef(null);

  useEffect(() => {
    if (step > 0 && flowBarRef.current) {
      const particle = document.createElement('div');
      particle.className = 'au-flow-particle';
      flowBarRef.current.appendChild(particle);
      
      const buttons = flowBarRef.current.querySelectorAll('.au-flow-step');
      if (buttons[step-1] && buttons[step]) {
        const r1 = buttons[step-1].getBoundingClientRect();
        const r2 = buttons[step].getBoundingClientRect();
        const pRect = flowBarRef.current.getBoundingClientRect();
        
        const startX = r1.right - pRect.left - 10;
        const startY = r1.top + r1.height/2 - pRect.top;
        const endX = r2.left - pRect.left + 20;
        
        gsap.fromTo(particle, 
          { x: startX, y: startY, opacity: 1, scale: 0.5 },
          { x: endX, duration: 0.5, ease: 'power2.inOut', scale: 1.5,
            onComplete: () => {
              gsap.to(particle, { opacity: 0, scale: 3, duration: 0.3, onComplete: () => particle.remove() });
              gsap.fromTo(buttons[step], { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }, { scale: 1, backgroundColor: 'rgba(255,255,255,0.08)', duration: 0.4 });
            }
          }
        );
      }
    }
  }, [step]);

  return (
    <section className="au-section" id="flow-section">
      <AuRise>
        <div className="au-section-tag"><ScrambleText text="— Demo interaktif" /></div>
        <h2 className="au-section-h2">Satu draf <em>mengalir</em> dari satu meja ke meja berikutnya.</h2>
        <p className="au-section-sub">Klik antar role untuk melihat tampilan masing-masing dari draf yang sama. Approval, penolakan, dan penerimaan terpicu di tempat — bukan di email atau spreadsheet terpisah.</p>
      </AuRise>

      <AuRise className="au-flow-stage">
        <TimelineRail items={steps} activeIndex={step} onSelect={setStep} />

        <div className="au-flow-body">
          {step === 0 && <KalabView setStep={setStep} />}
          {step === 1 && <KaprodiView approvals={approvals} setApproval={setApproval} approveAll={approveAll} totals={totals} setStep={setStep} />}
          {step === 2 && <AdminView approvals={approvals} received={received} setReceive={setReceive} />}
        </div>
      </AuRise>
    </section>
  );
}

function KalabView({ setStep }) {
  return (
    <div>
      <div className="au-draft-head">
        <div>
          <h3 className="au-draft-title">{D.draft.title}</h3>
          <div className="au-draft-sub">
            <span className="au-mono">{D.draft.code}</span>
            <span>·</span>
            <span>{D.draft.by}</span>
            <span>·</span>
            <span>{D.draft.role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="au-chip warn"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> Draft</span>
          <button className="au-btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
            Tambah barang
          </button>
          <button className="au-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setStep(1)}>Kirim ke Kaprodi →</button>
        </div>
      </div>

      <div className="au-items">
        {D.draft.items.map((it, i) => (
          <div key={it.id} className="au-item" style={{ animationDelay: `${i * 30}ms` }}>
            <div className={`au-item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>{it.kind === 'Inventaris' ? 'Inv' : 'BHP'}</div>
            <div>
              <div className="au-item-name">{it.name}</div>
              <div className="au-item-name-sub">
                <span className="au-mono">{it.id}</span>
                <span>·</span>
                <span>{it.link}</span>
                {it.replaces && (<><span>·</span><span className="replaces">↺ Ganti: {it.replaces}</span></>)}
              </div>
            </div>
            <div className="au-item-qty">{it.qty} {it.unit}</div>
            <div>
              <div className="au-item-price">{fmtRp(it.qty * it.price)}</div>
              <div className="au-item-price-sub">@ {fmtRpShort(it.price)}</div>
            </div>
            <button className="au-act-btn" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="au-draft-foot">
        <div className="au-totals">
          <div>
            <div className="au-total-label">Total Inventaris</div>
            <div className="au-total-val violet">{fmtRpShort(D.draft.items.filter(i => i.kind === 'Inventaris').reduce((s, i) => s + i.qty * i.price, 0))}</div>
          </div>
          <div>
            <div className="au-total-label">Total BHP</div>
            <div className="au-total-val cyan">{fmtRpShort(D.draft.items.filter(i => i.kind === 'BHP').reduce((s, i) => s + i.qty * i.price, 0))}</div>
          </div>
          <div>
            <div className="au-total-label">Grand Total</div>
            <div className="au-total-val">{fmtRpShort(D.draft.items.reduce((s, i) => s + i.qty * i.price, 0))}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Auto-save · disimpan 12 detik lalu
        </div>
      </div>
    </div>
  );
}

function KaprodiView({ approvals, setApproval, approveAll, totals, setStep }) {
  const approvedCount = Object.values(approvals).filter(v => v === 'ok').length;
  const rejectedCount = Object.values(approvals).filter(v => v === 'no').length;
  const pending = D.draft.items.length - approvedCount - rejectedCount;
  return (
    <div>
      <div className="au-draft-head">
        <div>
          <h3 className="au-draft-title">Review · {D.draft.title}</h3>
          <div className="au-draft-sub">
            <span>Dari</span><span style={{ color: 'var(--ink)' }}>{D.draft.by}</span>
            <span>·</span>
            <span className="au-mono">{D.draft.submitted}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="au-chip ok">{approvedCount} approved</span>
          <span className="au-chip danger">{rejectedCount} rejected</span>
          <span className="au-chip">{pending} pending</span>
          {pending > 0 ? (
            <button className="au-btn-ghost" onClick={approveAll} style={{ padding: '8px 14px', fontSize: 12 }}>Approve semua</button>
          ) : (
            <button className="au-btn-primary" onClick={() => setStep(2)} style={{ padding: '8px 14px', fontSize: 12 }}>
              Finalisasi & lock
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="au-items">
        {D.draft.items.map(it => {
          const st = approvals[it.id];
          return (
            <div key={it.id} className={`au-item ${st === 'ok' ? 'approved' : ''} ${st === 'no' ? 'rejected' : ''}`}>
              <div className={`au-item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>{it.kind === 'Inventaris' ? 'Inv' : 'BHP'}</div>
              <div>
                <div className="au-item-name">{it.name}</div>
                <div className="au-item-name-sub">
                  <span className="au-mono">{it.id}</span>
                  {it.replaces && (<><span>·</span><span className="replaces">↺ {it.replaces}</span></>)}
                </div>
              </div>
              <div className="au-item-qty">{it.qty} {it.unit}</div>
              <div>
                <div className="au-item-price">{fmtRp(it.qty * it.price)}</div>
                <div className="au-item-price-sub">@ {fmtRpShort(it.price)}</div>
              </div>
              <div className="au-item-approve">
                <button className={`au-act-btn ${st === 'no' ? 'no' : ''}`} title="Tolak" onClick={() => setApproval(it.id, 'no')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
                </button>
                <button className={`au-act-btn ${st === 'ok' ? 'ok' : ''}`} title="Setujui" onClick={() => setApproval(it.id, 'ok')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="5 12 10 17 19 7"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="au-draft-foot">
        <div className="au-totals">
          <div>
            <div className="au-total-label">Diajukan</div>
            <div className="au-total-val">{fmtRpShort(totals.all)}</div>
          </div>
          <div>
            <div className="au-total-label">Disetujui</div>
            <div className="au-total-val green">{fmtRpShort(totals.approved)}</div>
          </div>
          <div>
            <div className="au-total-label">Penghematan</div>
            <div className="au-total-val cyan">{fmtRpShort(totals.all - totals.approved)}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Komentar revisi · drop a note untuk Kalab
        </div>
      </div>
    </div>
  );
}

function AdminView({ approvals, received, setReceive }) {
  const approvedItems = D.draft.items.filter(it => approvals[it.id] === 'ok' || approvals[it.id] === null);
  const eligible = D.draft.items.filter(it => approvals[it.id] !== 'no');
  const receivedCount = Object.values(received).filter(Boolean).length;
  return (
    <div>
      <div className="au-draft-head">
        <div>
          <h3 className="au-draft-title">Penerimaan · {D.draft.title}</h3>
          <div className="au-draft-sub">
            <span className="au-chip ok">Disetujui & terkunci</span>
            <span>·</span>
            <span>{eligible.length} item siap diterima</span>
            <span>·</span>
            <span style={{ color: 'var(--green)' }}>{receivedCount} sudah dilabeli</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="au-btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Cetak label batch
          </button>
          <button className="au-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>Export ke aset</button>
        </div>
      </div>

      <div className="au-admin-grid">
        {eligible.map(it => {
          const isRec = received[it.id];
          return (
            <div key={it.id} className="au-inv-card" style={{ padding: 16, opacity: isRec ? 1 : 0.85 }}>
              <div className="au-inv-card-head">
                <div>
                  <div className={`au-item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`} style={{ display: 'inline-block', marginBottom: 6 }}>{it.kind === 'Inventaris' ? 'Inv' : 'BHP'}</div>
                  <div className="au-inv-code">LK-NEW-{it.id.replace('-','')}</div>
                </div>
                <FakeQR seed={it.id + (isRec ? '1' : '0')} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{it.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 14 }}>{it.qty} {it.unit}</div>
              <button
                onClick={() => setReceive(it.id)}
                className={isRec ? 'au-btn-primary' : 'au-btn-ghost'}
                style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: 12 }}>
                {isRec ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="5 12 10 17 19 7"/></svg>
                    Diterima · hari ini
                  </>
                ) : (
                  <>Tandai diterima</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
