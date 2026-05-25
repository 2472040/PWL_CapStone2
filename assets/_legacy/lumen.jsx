// Lumen — Linear/blueprint dark concept site
(function() {
  if (document.getElementById('lumen-css-loader')) return;
  const marker = document.createElement('meta');
  marker.id = 'lumen-css-loader';
  document.head.appendChild(marker);
  ['lumen-1.css','lumen-2.css','lumen-3.css'].forEach(href => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  });
})();

(function() {
const { useState, useEffect, useRef, useMemo } = React;
const D = window.LAB_DATA;
const fmtRp = window.fmtRp;
const fmtRpShort = window.fmtRpShort;

function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setSeen(true); });
    }, { threshold: 0.12 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen]);
  return [ref, seen];
}

function LuRise({ children, as: As = 'div', className = '', ...rest }) {
  const [ref, inView] = useInView();
  return <As ref={ref} className={`lu-rise ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</As>;
}
function LuStagger({ children, as: As = 'div', className = '', ...rest }) {
  const [ref, inView] = useInView();
  return <As ref={ref} className={`lu-stagger ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</As>;
}

function FakeQR({ seed, size = 6 }) {
  const cells = useMemo(() => {
    const n = size * size;
    const arr = []; let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; arr.push(h % 2); }
    return arr;
  }, [seed, size]);
  return (
    <div className={size === 7 ? 'lu-inv-qr' : 'lu-rec-qr'}>
      {cells.map((c, i) => <div key={i} className={c ? '' : 'on'} />)}
    </div>
  );
}

window.LumenSite = function LumenSite() {
  const [step, setStep] = useState(0);
  const [approvals, setApprovals] = useState(() => {
    const o = {}; D.draft.items.forEach(it => o[it.id] = null); return o;
  });
  const [received, setReceived] = useState({});

  const totals = useMemo(() => {
    let inv = 0, bhp = 0, all = 0, approved = 0;
    D.draft.items.forEach(it => {
      const sub = it.qty * it.price;
      all += sub;
      if (it.kind === 'Inventaris') inv += sub; else bhp += sub;
      if (approvals[it.id] === 'ok') approved += sub;
    });
    return { inv, bhp, all, approved };
  }, [approvals]);

  function setApproval(id, val) { setApprovals(a => ({ ...a, [id]: a[id] === val ? null : val })); }
  function approveAll() { setApprovals(D.draft.items.reduce((o, it) => (o[it.id] = 'ok', o), {})); }
  function setReceive(id) { setReceived(r => ({ ...r, [id]: !r[id] })); }

  return (
    <div className="lu">
      <div className="lu-grid-bg" />
      <div className="lu-glow-bg" />

      <div className="lu-layer">
        <LuNav />
        <LuHero />
        <LuTicker />
        <LuRolesSection />
        <LuFlowSection
          step={step} setStep={setStep}
          approvals={approvals} setApproval={setApproval}
          approveAll={approveAll}
          received={received} setReceive={setReceive}
          totals={totals}
        />
        <LuInventorySection />
        <LuActivitySection />
        <LuCTA />
        <LuFoot />
      </div>
    </div>
  );
};

function LuNav() {
  return (
    <nav className="lu-nav">
      <div className="lu-brand">
        <div className="lu-brand-mark">L</div>
        <div className="lu-brand-text">
          <div className="n">Lumen</div>
          <div className="v">// lab inv. v0.4</div>
        </div>
      </div>
      <div className="lu-nav-links">
        <a>Overview</a>
        <a>Pengadaan</a>
        <a>Inventaris</a>
        <a>Maintenance</a>
        <a>Pricing</a>
        <a>Docs</a>
      </div>
      <div className="lu-nav-right">
        <div className="lu-nav-status"><span className="dot" /> 287 aset online</div>
        <button className="lu-btn">Login</button>
        <button className="lu-btn primary">Mulai →</button>
      </div>
    </nav>
  );
}

function LuHero() {
  return (
    <section className="lu-hero">
      <div className="lu-hero-top">
        <span>System / Lab Inventory</span>
        <span className="div" />
        <span>Build <span className="v">26.05.18</span></span>
        <span className="div" />
        <span>Status <span className="v">● operational</span></span>
      </div>
      <h1 className="lu-h1">
        Operating system<br/>
        untuk <span className="accent">lab kampus.</span><br/>
        <span style={{ color: 'var(--ink-2)', fontSize: '0.6em' }}>Pengadaan, inventaris, maintenance — satu kontur.</span>
      </h1>
      <p className="lu-hero-sub">
        Loka memetakan setiap aset dan barang habis pakai ke jejak audit yang ketat. Tiap aksi punya pemilik, tiap pengadaan punya alur, tiap BHP punya stok yang berkurang otomatis.
      </p>
      <div className="lu-hero-ctas">
        <button className="lu-btn primary" style={{ padding: '10px 18px', fontSize: 14 }}>
          Lihat demo alur
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
        <button className="lu-btn" style={{ padding: '10px 18px', fontSize: 14 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 3-6 3z" fill="currentColor"/></svg>
          90s overview
        </button>
        <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>↳ no card · 30 days · migrate assist</span>
      </div>

      <LuRise className="lu-spec">
        <SpecCell k="Total aset" v={D.stats.totalAssets} unit="unit" />
        <SpecCell k="Draf aktif" v={D.stats.activeDrafts} unit="proc" />
        <SpecCell k="Stok BHP" v={D.stats.bhpItems} unit="SKU" />
        <SpecCell k="Ruangan" v={D.stats.rooms} unit="lab" />
      </LuRise>
    </section>
  );
}

function SpecCell({ k, v, unit }) {
  return (
    <div className="lu-spec-cell">
      <div className="lu-spec-k">{k}</div>
      <div className="lu-spec-v">{v}<span className="unit">{unit}</span></div>
      <div className="lu-spec-bar" />
    </div>
  );
}

function LuTicker() {
  const items = [
    { l: 'R-301', v: 'Lab Algoritma · 24 aset' },
    { l: 'R-303', v: 'Lab Jaringan · 18 aset' },
    { l: 'R-205', v: 'Lab Elektro · 31 aset' },
    { l: 'R-401', v: 'Lab AI & Robotika · 14 aset' },
    { l: 'R-101', v: 'Maker Space · 22 aset' },
    { l: 'R-302', v: 'Lab Basis Data · 26 aset' },
    { l: 'R-204', v: 'Lab Embedded · 19 aset' },
  ];
  const all = [...items, ...items];
  return (
    <div className="lu-ticker">
      <div className="lu-ticker-track">
        {all.map((it, i) => (
          <span key={i} className="lu-ticker-item">
            <span className="acc">[{it.l}]</span>
            <span>{it.v}</span>
            <span style={{ color: 'var(--ink-3)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function LuRolesSection() {
  return (
    <section className="lu-section">
      <LuRise>
        <div className="lu-section-tag">SEC.01 · ROLES</div>
        <h2 className="lu-section-h2">Lima peran. Lima <span className="accent">tanggung jawab</span> yang tidak tumpang tindih.</h2>
        <p className="lu-section-sub">Tiap aksi diberikan ke role yang paling sesuai — kepala lab merencanakan, kaprodi memutuskan, admin mendaftarkan, staf lab menjalankan. Tidak ada zona abu-abu.</p>
      </LuRise>

      <LuStagger className="lu-roles">
        {D.roles.map((r, i) => (
          <div key={r.id} className="lu-role">
            <div className="lu-role-n">
              <span className="ix">#{String(i + 1).padStart(2, '0')}</span>
              <span>USER.ROLE</span>
            </div>
            <div className="lu-role-short">{r.short}</div>
            <div className="lu-role-title">{r.title}</div>
            <div className="lu-role-action">{r.action}</div>
            <div className="lu-role-tasks">
              {r.tasks.map(t => <div key={t} className="lu-role-task">{t}</div>)}
            </div>
          </div>
        ))}
      </LuStagger>
    </section>
  );
}

function LuFlowSection({ step, setStep, approvals, setApproval, approveAll, received, setReceive, totals }) {
  const steps = [
    { n: 'A', label: 'Kalab', sub: 'Draft' },
    { n: 'B', label: 'Kaprodi', sub: 'Review' },
    { n: 'C', label: 'Admin', sub: 'Receive' },
  ];
  return (
    <section className="lu-section">
      <LuRise>
        <div className="lu-section-tag">SEC.02 · LIVE DEMO</div>
        <h2 className="lu-section-h2">Klik antar meja untuk melihat <span className="accent">handoff</span> yang sebenarnya.</h2>
        <p className="lu-section-sub">Draf yang sama, tiga pandangan berbeda. Approval per item terkirim instan, label QR ter-generate begitu staf admin mengetuk "terima".</p>
      </LuRise>

      <LuRise className="lu-flow">
        <div className="lu-flow-bar">
          <div className="lu-flow-steps">
            {steps.map((s, i) => (
              <div key={s.n} onClick={() => setStep(i)} className={`lu-flow-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="lu-flow-step-n">
                  {i < step ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="5 12 10 17 19 7"/></svg>
                  ) : s.n}
                </div>
                <div>
                  <div className="lu-flow-step-lbl">{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="lu-flow-meta">{D.draft.code}</div>
        </div>

        <div className="lu-flow-body">
          {step === 0 && <LuKalab />}
          {step === 1 && <LuKaprodi approvals={approvals} setApproval={setApproval} approveAll={approveAll} totals={totals} setStep={setStep} />}
          {step === 2 && <LuAdmin approvals={approvals} received={received} setReceive={setReceive} />}
        </div>
      </LuRise>
    </section>
  );
}

function LuKalab() {
  return (
    <div>
      <div className="lu-draft-head">
        <div>
          <h3 className="lu-draft-title">{D.draft.title}</h3>
          <div className="lu-draft-sub">
            <span className="lu-mono">{D.draft.code}</span>
            <span>·</span>
            <span>{D.draft.by}</span>
            <span>·</span>
            <span>{D.draft.role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="lu-chip warn">● DRAFT</span>
          <button className="lu-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14m-7-7h14"/></svg> Item</button>
          <button className="lu-btn primary">Submit ke Kaprodi →</button>
        </div>
      </div>

      <div className="lu-items">
        <div className="lu-items-head">
          <div>TYPE</div>
          <div>ITEM / SOURCE</div>
          <div>QTY</div>
          <div style={{ textAlign: 'right' }}>SUBTOTAL</div>
          <div></div>
        </div>
        {D.draft.items.map(it => (
          <div key={it.id} className="lu-item">
            <div className={`lu-item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>{it.kind === 'Inventaris' ? 'INV' : 'BHP'}</div>
            <div>
              <div className="lu-item-name">{it.name}</div>
              <div className="lu-item-sub">
                <span>{it.id}</span>
                <span>·</span>
                <span>{it.link}</span>
                {it.replaces && <span className="replaces">↺ Ganti: {it.replaces}</span>}
              </div>
            </div>
            <div className="lu-item-qty">{it.qty} <span style={{ color: 'var(--ink-3)' }}>{it.unit}</span></div>
            <div>
              <div className="lu-item-price">{fmtRp(it.qty * it.price)}</div>
              <div className="lu-item-price-sub">@ {fmtRpShort(it.price)}</div>
            </div>
            <div className="lu-item-actions">
              <button className="lu-act"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg></button>
            </div>
          </div>
        ))}
      </div>

      <div className="lu-draft-foot">
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Inventaris</div>
          <div className="lu-foot-v blue">{fmtRpShort(D.draft.items.filter(i => i.kind === 'Inventaris').reduce((s, i) => s + i.qty * i.price, 0))}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">BHP</div>
          <div className="lu-foot-v violet">{fmtRpShort(D.draft.items.filter(i => i.kind === 'BHP').reduce((s, i) => s + i.qty * i.price, 0))}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Total</div>
          <div className="lu-foot-v">{fmtRpShort(D.draft.items.reduce((s, i) => s + i.qty * i.price, 0))}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Status</div>
          <div className="lu-foot-v" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Auto-saved · 00:12s</div>
        </div>
      </div>
    </div>
  );
}

function LuKaprodi({ approvals, setApproval, approveAll, totals, setStep }) {
  const ok = Object.values(approvals).filter(v => v === 'ok').length;
  const no = Object.values(approvals).filter(v => v === 'no').length;
  const pending = D.draft.items.length - ok - no;
  return (
    <div>
      <div className="lu-draft-head">
        <div>
          <h3 className="lu-draft-title">Review · {D.draft.title}</h3>
          <div className="lu-draft-sub">
            <span>Diajukan oleh</span>
            <span style={{ color: 'var(--ink)' }}>{D.draft.by}</span>
            <span>·</span>
            <span className="lu-mono">{D.draft.submitted}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="lu-chip ok">{ok} OK</span>
          <span className="lu-chip danger">{no} TOLAK</span>
          <span className="lu-chip">{pending} ?</span>
          {pending > 0 ? (
            <button className="lu-btn" onClick={approveAll}>Approve all</button>
          ) : (
            <button className="lu-btn primary" onClick={() => setStep(2)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
              Finalisasi & lock
            </button>
          )}
        </div>
      </div>

      <div className="lu-items">
        <div className="lu-items-head">
          <div>TYPE</div>
          <div>ITEM</div>
          <div>QTY</div>
          <div style={{ textAlign: 'right' }}>SUBTOTAL</div>
          <div style={{ textAlign: 'right' }}>DECISION</div>
        </div>
        {D.draft.items.map(it => {
          const st = approvals[it.id];
          return (
            <div key={it.id} className={`lu-item ${st === 'ok' ? 'approved' : ''} ${st === 'no' ? 'rejected' : ''}`}>
              <div className={`lu-item-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`}>{it.kind === 'Inventaris' ? 'INV' : 'BHP'}</div>
              <div>
                <div className="lu-item-name">{it.name}</div>
                <div className="lu-item-sub">
                  <span>{it.id}</span>
                  {it.replaces && <><span>·</span><span className="replaces">↺ {it.replaces}</span></>}
                </div>
              </div>
              <div className="lu-item-qty">{it.qty}</div>
              <div>
                <div className="lu-item-price">{fmtRp(it.qty * it.price)}</div>
              </div>
              <div className="lu-item-actions">
                <button className={`lu-act ${st === 'no' ? 'no' : ''}`} onClick={() => setApproval(it.id, 'no')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
                </button>
                <button className={`lu-act ${st === 'ok' ? 'ok' : ''}`} onClick={() => setApproval(it.id, 'ok')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="5 12 10 17 19 7"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lu-draft-foot">
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Diajukan</div>
          <div className="lu-foot-v">{fmtRpShort(totals.all)}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Disetujui</div>
          <div className="lu-foot-v green">{fmtRpShort(totals.approved)}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Δ Penghematan</div>
          <div className="lu-foot-v" style={{ color: 'var(--warn)' }}>{fmtRpShort(totals.all - totals.approved)}</div>
        </div>
        <div className="lu-foot-cell">
          <div className="lu-foot-k">Komentar</div>
          <div className="lu-foot-v" style={{ fontSize: 14, color: 'var(--ink-2)' }}>0 thread</div>
        </div>
      </div>
    </div>
  );
}

function LuAdmin({ approvals, received, setReceive }) {
  const eligible = D.draft.items.filter(it => approvals[it.id] !== 'no');
  const receivedCount = Object.values(received).filter(Boolean).length;
  return (
    <div>
      <div className="lu-draft-head">
        <div>
          <h3 className="lu-draft-title">Penerimaan · {D.draft.title}</h3>
          <div className="lu-draft-sub">
            <span className="lu-chip ok">✓ LOCKED</span>
            <span>·</span>
            <span>{eligible.length} item siap diterima</span>
            <span>·</span>
            <span style={{ color: 'var(--accent)' }}>{receivedCount}/{eligible.length} dilabeli</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="lu-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Print labels
          </button>
          <button className="lu-btn primary">Push ke registry →</button>
        </div>
      </div>

      <div className="lu-rec-grid">
        {eligible.map(it => {
          const isRec = received[it.id];
          return (
            <div key={it.id} className={`lu-rec ${isRec ? 'done' : ''}`}>
              <div className="lu-rec-head">
                <div>
                  <div className={`lu-rec-kind ${it.kind === 'Inventaris' ? 'inv' : 'bhp'}`} style={{ marginBottom: 6 }}>{it.kind === 'Inventaris' ? 'INV' : 'BHP'}</div>
                  <div className="lu-rec-code">LK-NEW-{it.id.replace('-','')}</div>
                </div>
                <FakeQR seed={it.id + (isRec ? '1' : '0')} size={6} />
              </div>
              <div className="lu-rec-name">{it.name}</div>
              <div className="lu-rec-meta">{it.qty} {it.unit} · @ {fmtRpShort(it.price)}</div>
              <button onClick={() => setReceive(it.id)} className={`lu-rec-btn ${isRec ? 'done' : ''}`}>
                {isRec ? (
                  <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="5 12 10 17 19 7"/></svg> Terlabel · hari ini</>
                ) : 'Terima & label'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LuInventorySection() {
  return (
    <section className="lu-section">
      <LuRise>
        <div className="lu-section-tag">SEC.03 · REGISTRY</div>
        <h2 className="lu-section-h2">Setiap aset punya <span className="accent">paspor</span> sendiri.</h2>
        <p className="lu-section-sub">QR fisik mengarah ke kartu digital lengkap — ruangan, kondisi, riwayat maintenance, dan rotasi pemakaian per praktikum.</p>
      </LuRise>

      <LuStagger className="lu-inv-grid">
        {D.inventory.map(it => (
          <div key={it.code} className="lu-inv">
            <div className="lu-inv-band">
              <div className="lu-inv-code">{it.code}</div>
              <div className="lu-inv-cat">{it.cat}</div>
            </div>
            <div className="lu-inv-body">
              <div className="lu-inv-name">{it.name}</div>
              <div className="lu-inv-room">{it.room}</div>
              <div className="lu-inv-row">
                <span className="k">Kondisi</span>
                <span><span className={`lu-cond ${it.cond.toLowerCase().replace(' ', '-')}`}>{it.cond}</span></span>
              </div>
              <div className="lu-inv-row">
                <span className="k">Last used</span>
                <span className="v">{it.last}</span>
              </div>
              <div className="lu-inv-qr-row">
                <FakeQR seed={it.code} size={7} />
                <div className="lu-inv-qr-info">
                  <b>SCAN</b> untuk log<br/>
                  maintenance & cek<br/>
                  riwayat pemakaian
                </div>
              </div>
            </div>
          </div>
        ))}
      </LuStagger>

      <LuRise>
        <div style={{ marginTop: 60 }}>
          <div className="lu-section-tag" style={{ marginBottom: 14 }}>ROOMS · 9 total</div>
          <h3 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Distribusi aset per ruangan</h3>
        </div>
      </LuRise>
      <LuStagger className="lu-rooms">
        {D.rooms.map(r => {
          const filled = Math.min(8, Math.ceil(r.count / 4));
          return (
            <div key={r.code} className="lu-room">
              <div className="lu-room-code">[{r.code}]</div>
              <div className="lu-room-name">{r.name}</div>
              <div className="lu-room-count">{r.count}<span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>aset</span></div>
              <div className="lu-room-bar">
                {Array.from({ length: 8 }).map((_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
              </div>
            </div>
          );
        })}
      </LuStagger>
    </section>
  );
}

function LuActivitySection() {
  const times = ['14:32', '12:08', '09:41', '08:15', '−1d 16:50'];
  return (
    <section className="lu-section" style={{ paddingTop: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 60, alignItems: 'start' }}>
        <LuRise>
          <div className="lu-section-tag">SEC.04 · AUDIT LOG</div>
          <h2 className="lu-section-h2" style={{ fontSize: 'clamp(28px, 3.5vw, 40px)' }}>Tidak ada perubahan <span className="accent">tanpa jejak.</span></h2>
          <p className="lu-section-sub">Setiap log otomatis: waktu, pelaku, role, dan target. Bisa di-filter, di-export ke CSV, dan jadi dasar audit anggaran tahunan.</p>
        </LuRise>
        <LuStagger className="lu-activity">
          {D.activity.map((a, i) => (
            <div key={i} className="lu-act-row">
              <div className="lu-act-time">{times[i] || a.when}</div>
              <div className="lu-act-text">
                <b>{a.who}</b><span className="role">{a.role}</span> {a.act} <span className="target">{a.target}</span>
              </div>
              <div className="lu-act-by">→ {a.when}</div>
            </div>
          ))}
        </LuStagger>
      </div>
    </section>
  );
}

function LuCTA() {
  return (
    <LuRise as="section" className="lu-cta">
      <div className="lu-cta-inner">
        <div>
          <h2 className="lu-cta-h">Pengadaan tahun depan, <span className="accent">selesai</span> sebelum makan siang.</h2>
          <p className="lu-cta-sub">Migrasi data dari spreadsheet & sistem lama dibantu oleh tim. Coba 30 hari, tanpa kartu kredit.</p>
        </div>
        <div className="lu-cta-btns">
          <button className="lu-btn primary" style={{ padding: '10px 20px' }}>Mulai uji coba →</button>
          <button className="lu-btn" style={{ padding: '10px 20px' }}>Jadwalkan demo</button>
        </div>
      </div>
    </LuRise>
  );
}

function LuFoot() {
  return (
    <footer className="lu-foot">
      <div>© 2026 LOKA / LAB OPERATING KIT · MADE IN BANDUNG</div>
      <div className="lu-foot-links">
        <a>privacy</a>
        <a>terms</a>
        <a>changelog</a>
        <a>status</a>
      </div>
    </footer>
  );
}

})();
