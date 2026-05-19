// Aurora — visionOS-flavored dark concept site
// Loads its own CSS, exposes <AuroraSite/> on window.

(function() {
  if (document.getElementById('aurora-css-loader')) return;
  const marker = document.createElement('meta');
  marker.id = 'aurora-css-loader';
  document.head.appendChild(marker);
  ['aurora-1.css','aurora-2.css','aurora-3.css'].forEach(href => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  });
})();

const { useState, useEffect, useRef, useMemo } = React;
const D = window.LAB_DATA;
const fmtRp = window.fmtRp;
const fmtRpShort = window.fmtRpShort;

// In-view observer hook
function useInView(opts) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setSeen(true); });
    }, { threshold: 0.12, ...opts });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen]);
  return [ref, seen];
}

function AuRise({ children, as: As = 'div', className = '', ...rest }) {
  const [ref, inView] = useInView();
  return <As ref={ref} className={`au-rise ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</As>;
}
function AuStagger({ children, as: As = 'div', className = '', ...rest }) {
  const [ref, inView] = useInView();
  return <As ref={ref} className={`au-stagger ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</As>;
}

// Tiny QR-ish pattern (deterministic from seed)
function FakeQR({ seed }) {
  const cells = useMemo(() => {
    const arr = []; let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    for (let i = 0; i < 36; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; arr.push(h % 2); }
    return arr;
  }, [seed]);
  return (
    <div className="au-inv-qr">
      {cells.map((c, i) => <div key={i} className={c ? '' : 'on'} />)}
    </div>
  );
}

// Role icons
const RoleIcon = ({ kind }) => {
  const map = {
    kalab: <path d="M3 9.5L12 4l9 5.5M5 10v9h14v-9M9 19v-5h6v5" />,
    kaprodi: <path d="M9 12l2 2 4-4m-9 6V6a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H8l-3 3v-3z" />,
    admin: <path d="M4 7h16M4 12h16M4 17h10M19 17l2 2-2 2" />,
    staflab: <path d="M9 3v6l-5 9a3 3 0 003 3h10a3 3 0 003-3l-5-9V3M9 3h6M7 14h10" />,
    sysadmin: <circle cx="12" cy="8" r="3" />,
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {map[kind] || <circle cx="12" cy="12" r="4" />}
      {kind === 'sysadmin' && <path d="M4 21a8 8 0 0116 0M14.5 13l3-2 1.5 2-3 2-1.5-2zm-6 0l-3-2L4 13l3 2 1.5-2z" />}
    </svg>
  );
};

window.AuroraSite = function AuroraSite() {
  // Flow state: 0=Kalab draft, 1=Kaprodi review, 2=Admin receive
  const [step, setStep] = useState(0);
  // Per-item approval state from kaprodi
  const [approvals, setApprovals] = useState(() => {
    const o = {}; D.draft.items.forEach(it => o[it.id] = null); return o;
  });
  // Items received by admin
  const [received, setReceived] = useState({});

  const totals = useMemo(() => {
    let inv = 0, bhp = 0, all = 0, approved = 0, replaceCount = 0;
    D.draft.items.forEach(it => {
      const sub = it.qty * it.price;
      all += sub;
      if (it.kind === 'Inventaris') inv += sub; else bhp += sub;
      if (approvals[it.id] === 'ok') approved += sub;
      if (it.replaces) replaceCount++;
    });
    return { inv, bhp, all, approved, replaceCount };
  }, [approvals]);

  // Cycle approvals when entering kaprodi step (slow auto-fill for demo flavor)
  useEffect(() => {
    if (step !== 1) return;
    // reset if user just arrived
  }, [step]);

  function setApproval(id, val) { setApprovals(a => ({ ...a, [id]: a[id] === val ? null : val })); }
  function approveAll() {
    setApprovals(D.draft.items.reduce((o, it) => (o[it.id] = 'ok', o), {}));
  }
  function setReceive(id) { setReceived(r => ({ ...r, [id]: !r[id] })); }

  return (
    <div className="au">
      <div className="au-aurora"><div className="au-aurora-3" /></div>
      <div className="au-grain" />

      <div className="au-layer">
        <Nav />
        <Hero />
        <Marquee />
        <RolesSection />
        <FlowSection
          step={step} setStep={setStep}
          approvals={approvals} setApproval={setApproval}
          approveAll={approveAll}
          received={received} setReceive={setReceive}
          totals={totals}
        />
        <InventorySection />
        <ActivitySection />
        <CTA />
        <Foot />
      </div>
    </div>
  );
};

function Nav() {
  return (
    <nav className="au-nav">
      <div className="au-brand">
        <div className="au-brand-dot" />
        <span>Loka</span>
        <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>· Lab Suite</span>
      </div>
      <div className="au-nav-links">
        <a>Produk</a>
        <a>Untuk Siapa</a>
        <a>Alur Pengadaan</a>
        <a>Inventaris</a>
        <a>Harga</a>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a style={{ fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', padding: '6px 12px' }}>Sign in</a>
        <button className="au-nav-cta">Mulai uji coba →</button>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="au-hero">
      <div className="au-eyebrow">
        <span className="au-eyebrow-dot" />
        v1.2 · Modul pengadaan tahunan live
      </div>
      <h1 className="au-h1">
        Inventaris lab,<br/>
        <em>hidup</em> dari draf hingga gudang.
      </h1>
      <p className="au-hero-sub">
        Satu sistem untuk Kepala Lab, Kaprodi, Staf Administrasi, dan Staf Lab — dari draf pengadaan tahunan, approval per-item, sampai log maintenance dan stok BHP yang menyusut otomatis.
      </p>
      <div className="au-hero-ctas">
        <button className="au-btn-primary">
          Lihat demo alur
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
        <button className="au-btn-ghost">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polygon points="10,8 16,12 10,16" fill="currentColor"/></svg>
          Tonton 90 detik
        </button>
      </div>

      <AuRise className="au-hero-preview">
        <div className="au-preview-bar">
          <div className="au-preview-dot" style={{ background: '#ff5f57' }} />
          <div className="au-preview-dot" style={{ background: '#febc2e' }} />
          <div className="au-preview-dot" style={{ background: '#28c840' }} />
          <div className="au-preview-title">loka.lab/dashboard</div>
        </div>
        <div className="au-preview-body">
          <div className="au-preview-row">
            <Stat n={D.stats.totalAssets} l="Total aset" />
            <Stat n={D.stats.activeDrafts} l="Draf aktif" />
            <Stat n={D.stats.bhpItems} l="Stok BHP" />
            <Stat n={D.stats.pendingApproval} l="Menunggu approval" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
            <div className="au-preview-stat" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Aktivitas mingguan</div>
                <div className="au-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>21 Apr — 28 Apr</div>
              </div>
              <Sparkline />
            </div>
            <div className="au-preview-stat" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Ruangan</div>
              {D.rooms.slice(0, 3).map(r => (
                <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{r.name}</span>
                  <span className="au-mono" style={{ color: 'var(--ink-3)' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AuRise>
    </section>
  );
}

function Stat({ n, l }) {
  return (
    <div className="au-preview-stat">
      <div className="au-preview-stat-num">{n}</div>
      <div className="au-preview-stat-lbl">{l}</div>
      <div className="au-preview-stat-bar" />
    </div>
  );
}

function Sparkline() {
  // simple SVG sparkline
  const points = [12, 18, 14, 24, 22, 38, 32, 48, 44, 56, 50, 64];
  const max = 70, min = 0;
  const w = 360, h = 70;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / (max - min)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const fillPath = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b794ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#b794ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#sg)" />
      <path d={path} stroke="#b794ff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / (max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="#b794ff" />;
      })}
    </svg>
  );
}

function Marquee() {
  const items = ['Lab Algoritma · R-301', 'Lab Jaringan · R-303', 'Lab Elektro · R-205', 'Lab AI & Robotika · R-401', 'Maker Space · R-101', 'Lab Basis Data · R-302', 'Studio UI/UX · R-202', 'Lab Embedded · R-204'];
  const all = [...items, ...items];
  return (
    <div className="au-marquee">
      <div className="au-marquee-track">
        {all.map((it, i) => <span key={i} className="au-marquee-item">{it}</span>)}
      </div>
    </div>
  );
}

function RolesSection() {
  return (
    <section className="au-section">
      <AuRise>
        <div className="au-section-tag">— Untuk siapa</div>
        <h2 className="au-section-h2">Lima peran, satu <em>alur</em>. Setiap orang tahu giliran mereka.</h2>
        <p className="au-section-sub">Loka memetakan tugas per-role secara eksplisit — tidak ada draf yang ngendap di inbox, tidak ada stok BHP yang lupa dicatat.</p>
      </AuRise>
      <AuStagger className="au-roles">
        {D.roles.map((r, i) => (
          <div key={r.id} className={`au-role ${i === 0 ? 'r-big' : 'r-small'}`} data-c={r.color}>
            <div className="au-role-glow" />
            <div className="au-role-icon" style={{ color: 'var(--ink-2)' }}><RoleIcon kind={r.id} /></div>
            <div className="au-role-short">{r.short}</div>
            <div className="au-role-title">{r.title}</div>
            <div className="au-role-action">{r.action}</div>
            {i === 0 && <div className="au-role-desc">{r.desc}</div>}
            <div className="au-role-tasks">
              {r.tasks.map(t => <div key={t} className="au-role-task">{t}</div>)}
            </div>
          </div>
        ))}
      </AuStagger>
    </section>
  );
}

function FlowSection({ step, setStep, approvals, setApproval, approveAll, received, setReceive, totals }) {
  const steps = [
    { n: 1, label: 'Kalab', sub: 'Draf pengadaan' },
    { n: 2, label: 'Kaprodi', sub: 'Review & approval' },
    { n: 3, label: 'Admin', sub: 'Receive & label' },
  ];
  return (
    <section className="au-section">
      <AuRise>
        <div className="au-section-tag">— Demo interaktif</div>
        <h2 className="au-section-h2">Satu draf <em>mengalir</em> dari satu meja ke meja berikutnya.</h2>
        <p className="au-section-sub">Klik antar role untuk melihat tampilan masing-masing dari draf yang sama. Approval, penolakan, dan penerimaan terpicu di tempat — bukan di email atau spreadsheet terpisah.</p>
      </AuRise>

      <AuRise className="au-flow-stage">
        <div className="au-flow-bar">
          <div className="au-flow-steps">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <button
                  onClick={() => setStep(i)}
                  className={`au-flow-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                  <span className="au-flow-step-n">
                    {i < step ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="5 12 10 17 19 7"/></svg>
                    ) : s.n}
                  </span>
                  <span>{s.label}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 2 }}>· {s.sub}</span>
                </button>
                {i < steps.length - 1 && <span className="au-flow-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
          <span className="au-flow-meta">{D.draft.code}</span>
        </div>

        <div className="au-flow-body">
          {step === 0 && <KalabView />}
          {step === 1 && <KaprodiView approvals={approvals} setApproval={setApproval} approveAll={approveAll} totals={totals} setStep={setStep} />}
          {step === 2 && <AdminView approvals={approvals} received={received} setReceive={setReceive} />}
        </div>
      </AuRise>
    </section>
  );
}

function KalabView() {
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
          <button className="au-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>Kirim ke Kaprodi →</button>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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

function InventorySection() {
  return (
    <section className="au-section">
      <AuRise>
        <div className="au-section-tag">— Inventaris</div>
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

function ActivitySection() {
  return (
    <section className="au-section" style={{ paddingTop: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 60, alignItems: 'start' }}>
        <AuRise>
          <div className="au-section-tag">— Aktivitas tim</div>
          <h2 className="au-section-h2" style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}>Riwayat yang <em>jujur</em> — siapa, kapan, untuk apa.</h2>
          <p className="au-section-sub">Setiap aksi tercatat dengan jejak yang bisa diaudit. Tidak ada perubahan diam-diam.</p>
        </AuRise>
        <AuStagger className="au-activity">
          {D.activity.map((a, i) => (
            <div key={i} className="au-activity-row">
              <div className="au-activity-avatar">{a.who[0]}</div>
              <div className="au-activity-text">
                <b>{a.who}</b><span className="role-tag">{a.role}</span> {a.act} <span className="target">{a.target}</span>
              </div>
              <div className="au-activity-when">{a.when}</div>
            </div>
          ))}
        </AuStagger>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <AuRise as="section" className="au-cta">
      <h2 className="au-cta-h">Inventaris yang akhirnya<br/><em>ngomong sendiri.</em></h2>
      <p className="au-cta-sub">Coba gratis 30 hari untuk satu prodi. Tanpa kartu kredit. Migrasi data dibantu.</p>
      <div className="au-cta-btns">
        <button className="au-btn-primary">
          Mulai uji coba
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
        <button className="au-btn-ghost">Jadwalkan demo</button>
      </div>
    </AuRise>
  );
}

function Foot() {
  return (
    <footer className="au-foot">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="au-brand-dot" style={{ width: 18, height: 18 }} />
        <span>© 2026 Loka Lab Suite · Dibuat di Bandung</span>
      </div>
      <div className="au-foot-links">
        <a>Privasi</a>
        <a>Ketentuan</a>
        <a>Status</a>
        <a>Changelog</a>
      </div>
    </footer>
  );
}

