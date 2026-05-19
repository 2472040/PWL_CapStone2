import React, { useMemo } from 'react';
import { useStore, StatTile, D, Icon } from '../../components/app-shell.jsx';

export function Dashboard() {
  const { state, dispatch } = useStore();
  const role = D.roles.find(r => r.id === state.role);
  const me = D.me[state.role];
  const stats = useMemo(() => {
    const totalAssets = state.inventory.length;
    const bhpItems = state.bhp.length;
    const lowBhp = state.bhp.filter(b => b.stock <= b.min).length;
    const draftsActive = state.drafts.filter(d => d.status === 'submitted').length;
    const draftsFinalized = state.drafts.filter(d => d.status === 'finalized').length;
    const inMaint = state.inventory.filter(i => i.cond === 'Maintenance').length;
    const needCheck = state.inventory.filter(i => i.cond === 'Perlu cek').length;
    const totalDraftValue = state.drafts.filter(d => d.status === 'submitted').reduce((sum, d) =>
      sum + d.items.reduce((s, it) => s + it.qty * it.price, 0), 0);
    return { totalAssets, bhpItems, lowBhp, draftsActive, draftsFinalized, inMaint, needCheck, totalDraftValue };
  }, [state]);

  const tilesByRole = {
    sysadmin: [
      { l: 'Total pengguna', v: state.users.length, i: 'users', f: 'int' },
      { l: 'Ruangan aktif', v: state.rooms.length, i: 'room', f: 'int' },
      { l: 'Total aset', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Login hari ini', v: 7, i: 'log', f: 'int', d: { dir: 'up', text: '+3 dari kemarin' } },
    ],
    kalab: [
      { l: 'Aset tanggung jawab', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Draf saya', v: state.drafts.filter(d => d.role.includes('Informatika')).length, i: 'cart', f: 'int' },
      { l: 'Total ajuan aktif', v: stats.totalDraftValue, i: 'bolt', f: 'rp' },
      { l: 'BHP perlu restock', v: stats.lowBhp, i: 'flask', f: 'int', d: { dir: 'down', text: 'segera ajukan' } },
    ],
    kaprodi: [
      { l: 'Menunggu review', v: stats.draftsActive, i: 'check', f: 'int' },
      { l: 'Sudah finalisasi', v: stats.draftsFinalized, i: 'log', f: 'int' },
      { l: 'Total ajuan aktif', v: stats.totalDraftValue, i: 'bolt', f: 'rp' },
      { l: 'Total aset prodi', v: stats.totalAssets, i: 'box', f: 'int' },
    ],
    admin: [
      { l: 'Item siap diterima', v: state.drafts.filter(d => d.status === 'finalized').reduce((s, d) => s + d.items.filter(it => it.approval === 'ok' || it.approval === null).length, 0), i: 'truck', f: 'int' },
      { l: 'Sudah dilabeli', v: state.drafts.reduce((s, d) => s + d.items.filter(it => it.received).length, 0), i: 'qr', f: 'int' },
      { l: 'Total aset terdaftar', v: stats.totalAssets, i: 'box', f: 'int' },
      { l: 'Hari kerja minggu ini', v: 4, i: 'cal', f: 'int' },
    ],
    staflab: [
      { l: 'Maintenance terbuka', v: stats.inMaint, i: 'wrench', f: 'int' },
      { l: 'Aset perlu cek', v: stats.needCheck, i: 'alert', f: 'int', d: { dir: 'down', text: 'jadwalkan minggu ini' } },
      { l: 'BHP rendah', v: stats.lowBhp, i: 'flask', f: 'int' },
      { l: 'Log bulan ini', v: state.maintLog.length, i: 'log', f: 'int' },
    ],
  };

  const firstName = me.name.replace(/^(Dr\.|Prof\.|Drs\.|Dra\.|Ir\.)\s+/, '').split(' ')[0];

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Halo, <em>{firstName}.</em></h1>
          <p className="page-sub">{role.title} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2" >
          <button className="btn" onClick={() => window.showToast && window.showToast('Mengekspor data ke CSV…', 'info', 'download')} title="Export ke CSV"><Icon name="download" size={13} /> Export</button>
          <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newDraft' } })}><Icon name="plus" size={13} strokeWidth={2.4} /> Quick action</button>
        </div>
      </div>

      <div className="stats">
        {tilesByRole[state.role].map((t, i) => (
          <StatTile key={i} label={t.l} value={t.v} fmt={t.f} icon={t.i} delta={t.d} accent={i === 0 ? role.accent : undefined} />
        ))}
      </div>

      <div className="gap-3.5 grid" >
        <div className="card glow" style={{'--role-accent': role.accent}} data-reveal>
          <div className="flex between aic mb-4">
            <div>
              <div className="text-3 text-xs mono tracking-[0.1em] uppercase" >— Aktivitas tim</div>
              <h3 className="text-xl fw-5 mt-2 tracking-tight" >Apa yang baru terjadi</h3>
            </div>
            <button className="btn sm"><Icon name="refresh" size={12} /> Live</button>
          </div>
          <div>
            {D.activity.map((a, i) => (
              <div key={i} className="act-row" style={{'--role-accent': role.accent}}>
                <div className="act-avatar">{a.who[0]}</div>
                <div className="act-text">
                  <b>{a.who}</b><span className="role-pill">{a.role}</span> {a.act} <span className="tgt">{a.target}</span>
                </div>
                <div className="act-when">{a.when}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" data-reveal>
          <div className="text-3 text-xs mono mb-3 tracking-[0.1em] uppercase" >— Ringkasan ruangan</div>
          <h3 className="text-xl fw-5 mb-4 tracking-tight" >{state.rooms.length} laboratorium</h3>
          <div className="flex-col gap-2.5" >
            {state.rooms.slice(0, 5).map(r => {
              const pct = Math.min(100, (r.assets / 35) * 100);
              return (
                <div key={r.code}>
                  <div className="flex between aic mb-2">
                    <div className="text-[13px]" ><b>{r.name}</b> <span className="text-3 mono text-xs">· {r.code}</span></div>
                    <div className="mono text-xs text-2">{r.assets} aset</div>
                  </div>
                  <div className="h-[3px]" style={{background: 'var(--surface)', borderRadius: 2, overflow: 'hidden'}}>
                    <div className="rounded-sm" style={{height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--color-violet), var(--color-cyan))'}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
