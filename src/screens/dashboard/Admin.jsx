import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, useToast, D, Icon, QR, StatTile, useSearch } from '../../components/app-shell.jsx';

function Users() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === 'sysadmin');

  const filteredUsers = state.users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-sub">{state.users.filter(u => u.status === 'active').length} aktif · {state.users.filter(u => u.status === 'paused').length} di-pause</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newUser' } })}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Tambah pengguna
        </button>
      </div>

      <div className="stats">
        {D.roles.map((r, i) => (
          <StatTile key={r.id} label={r.title} value={state.users.filter(u => u.role === r.id).length} fmt="int" icon="users" accent={i === 0 ? role.accent : undefined} />
        ))}
      </div>

      {query && filteredUsers.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada pengguna cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="table-wrap" data-reveal>
        <table className="tbl">
          <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead>
          <tbody>
            {filteredUsers.map(u => {
              const r = D.roles.find(x => x.id === u.role);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex gap-2.5 items-center" >
                      <div className="avatar sm" style={{'--av-c': r.accent}}>{u.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                      <b>{u.name}</b>
                    </div>
                  </td>
                  <td className="mono text-xs">{u.email}</td>
                  <td><span className="chip" style={{color: r.accent, borderColor: r.accent + '55'}}>{r.short}</span></td>
                  <td>{u.status === 'active' ? <span className="chip ok"><span className="dot" /> Aktif</span> : <span className="chip warn"><span className="dot" /> Paused</span>}</td>
                  <td className="text-xs">{u.lastLogin}</td>
                  <td>
                    <div className="flex gap-1 justify-end" >
                      <button className="act-btn" onClick={() => { dispatch({ type: 'TOGGLE_USER', id: u.id }); toast(`Status ${u.name}: ${u.status === 'active' ? 'paused' : 'aktif'}`, 'info'); }} title="Toggle" aria-label={`Toggle status ${u.name}`}><Icon name="swap" size={12} /></button>
                      <button className="act-btn" title="Edit" aria-label={`Edit ${u.name}`}><Icon name="edit" size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewUserForm({ close }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staflab');
  function save() {
    if (!name || !email) { toast('Isi nama dan email', 'warn'); return; }
    dispatch({ type: 'ADD_USER', user: {
      id: 'u' + Math.floor(Math.random() * 1000),
      name, email, role, status: 'active', lastLogin: 'belum pernah',
    } });
    toast('Pengguna ditambahkan', 'ok');
    close();
  }
  return (
    <>
      <div className="drawer-bar"><div className="drawer-title">Tambah pengguna</div><button className="x-btn" onClick={close}><Icon name="x" size={14} /></button></div>
      <div className="drawer-body">
        <div className="field"><div className="field-lbl">Nama lengkap <span className="req">*</span></div><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Misal: Tirta Halim" /></div>
        <div className="field"><div className="field-lbl">Email <span className="req">*</span></div><input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="tirta@kampus.id" /></div>
        <div className="field"><div className="field-lbl">Role</div>
          <select className="select" value={role} onChange={e => setRole(e.target.value)}>
            {D.roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
        <div className="card compact text-xs text-3 mt-4" ><Icon name="info" size={11} /> Pengguna akan menerima email konfirmasi.</div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close}>Batal</button>
        <button className="btn primary" onClick={save}>Buat akun</button>
      </div>
    </>
  );
}

// ===== ROOMS (Sysadmin) =====
function Rooms() {
  const { state, dispatch } = useStore();
  const role = D.roles.find(r => r.id === 'sysadmin');
  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Ruangan</h1>
          <p className="page-sub">{state.rooms.length} laboratorium terdaftar · total {state.rooms.reduce((s, r) => s + r.assets, 0)} aset</p>
        </div>
        <button className="btn primary" onClick={() => window.showToast && window.showToast('Form tambah ruangan akan segera hadir', 'warn', 'info')}><Icon name="plus" size={13} strokeWidth={2.4} /> Tambah ruangan</button>
      </div>

      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}>
        {state.rooms.map(r => {
          const pct = Math.min(100, (r.assets / r.capacity) * 100 * 1.2);
          return (
            <div key={r.code} className="card tilt-card" data-reveal>
            <div className="tilt-shine" />
              <div className="flex between aic mb-3">
                <div className="mono text-xs tracking-[0.08em]" style={{color: role.accent}}>[{r.code}]</div>
                <span className="chip">Lantai {r.floor}</span>
              </div>
              <div className="text-xl fw-5 mb-2 tracking-tight" >{r.name}</div>
              <div className="text-xs text-3 mono mb-4">{r.assets} aset · kapasitas {r.capacity} orang</div>
              <div className="h-1" style={{background: 'var(--surface)', borderRadius: 2, overflow: 'hidden'}}>
                <div className="rounded-sm" style={{height: '100%', width: pct + '%', background: 'linear-gradient(90deg, ' + role.accent + ', var(--color-cyan))'}} />
              </div>
              <div className="flex between aic mt-4">
                <div className="text-xs text-3">PIC <b className="text-ink-2" >{r.pic}</b></div>
                <button className="btn sm"><Icon name="edit" size={11} /> Ubah</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== AUDIT LOG (Sysadmin) =====
function Audit() {
  const role = D.roles.find(r => r.id === 'sysadmin');
  const { query } = useSearch();
  const [filter, setFilter] = useState('all');
  const baseFiltered = filter === 'all' ? D.audit : D.audit.filter(a => a.role.toLowerCase().includes(filter));
  const filtered = query ? baseFiltered.filter(a =>
    a.user.toLowerCase().includes(query.toLowerCase()) ||
    a.action.toLowerCase().includes(query.toLowerCase()) ||
    a.target.toLowerCase().includes(query.toLowerCase()) ||
    a.role.toLowerCase().includes(query.toLowerCase())
  ) : baseFiltered;

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-sub">Semua aksi tercatat. Bisa di-filter per role atau di-export ke CSV.</p>
        </div>
        <button className="btn" onClick={() => window.showToast && window.showToast('Mengekspor audit log ke CSV…', 'info', 'download')}><Icon name="download" size={13} /> Export CSV</button>
      </div>

      <div data-reveal className="flex flex-wrap gap-1.5 mb-3.5" >
        {['all', 'kalab', 'kaprodi', 'admin', 'staf', 'sys'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn sm ${filter === f ? 'primary' : ''}`} style={{textTransform: 'capitalize'}}>{f === 'all' ? 'Semua' : f}</button>
        ))}
      </div>

      {query && filtered.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico"><Icon name="search" size={20} /></div>
          <h4>Tidak ada audit cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="table-wrap" data-reveal>
        <table className="tbl">
          <thead><tr><th>Waktu</th><th>Pengguna</th><th>Role</th><th>Aksi</th><th>Target</th><th>IP</th></tr></thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td className="mono text-xs">{a.ts}</td>
                <td><b>{a.user}</b></td>
                <td><span className="chip">{a.role}</span></td>
                <td className="mono text-xs text-cyan" >{a.action}</td>
                <td className="text-sm">{a.target}</td>
                <td className="mono text-xs text-3">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== LABELS (Admin) =====
function Labels() {
  const { state } = useStore();
  const role = D.roles.find(r => r.id === 'admin');
  const recent = state.inventory.slice(0, 8);
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
          <div key={it.code} className="card p-4 text-center" >
            <QR seed={it.code} size={10} cls="mb-3" />
            <div className="mono text-xs tracking-[0.08em]" style={{color: role.accent}}>{it.code}</div>
            <div className="text-sm fw-5 mt-2 leading-[1.3]" >{it.name}</div>
            <div className="text-xs text-3 mt-2">{it.room}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== NEW DRAFT (Kalab) =====
function NewDraftForm({ close }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('Pengadaan Lab Komputer · Q3 2026');
  const [items, setItems] = useState([
    { id: 'I-N1', kind: 'Inventaris', name: '', qty: 1, unit: 'unit', price: 0, link: '', replaces: '' },
  ]);

  function update(i, patch) { setItems(arr => arr.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  function add() { setItems(arr => [...arr, { id: 'I-N' + (arr.length + 1), kind: 'Inventaris', name: '', qty: 1, unit: 'unit', price: 0, link: '', replaces: '' }]); }
  function remove(i) { setItems(arr => arr.filter((_, j) => j !== i)); }

  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  function save() {
    const valid = items.filter(it => it.name && it.price > 0);
    if (valid.length === 0) { toast('Tambahkan minimal 1 item dengan nama & harga', 'warn'); return; }
    const code = 'PRC-2026-LK' + String(Math.floor(Math.random() * 90 + 10));
    dispatch({ type: 'NEW_DRAFT', draft: {
      code, title, by: D.me.kalab.name, byInit: D.me.kalab.initials,
      role: 'Kepala Laboratorium · Informatika',
      submitted: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'submitted',
      items: valid.map((it, i) => ({ ...it, id: it.id || ('I-' + i), qty: Number(it.qty), price: Number(it.price), approval: null, received: false, replaces: it.replaces || null })),
    }});
    toast('Draf diajukan · menunggu Kaprodi', 'ok');
    close();
  }

  return (
    <>
      <div className="drawer-bar"><div className="drawer-title">Draf pengadaan baru</div><button className="x-btn" onClick={close}><Icon name="x" size={14} /></button></div>
      <div className="drawer-body">
        <div className="field"><div className="field-lbl">Judul draf <span className="req">*</span></div><input className="input" value={title} onChange={e => setTitle(e.target.value)} /></div>

        <div className="flex between aic mt-4 mb-3">
          <div className="field-lbl m-0" >Item barang ({items.length})</div>
          <button className="btn sm" onClick={add}><Icon name="plus" size={11} /> Item</button>
        </div>

        {items.map((it, i) => (
          <div key={i} className="card compact mb-3 p-3.5" >
            <div className="flex gap-2 mb-2 aic">
              <button onClick={() => update(i, { kind: 'Inventaris' })} className={`btn sm ${it.kind === 'Inventaris' ? 'primary' : ''}`}>Inventaris</button>
              <button onClick={() => update(i, { kind: 'BHP' })} className={`btn sm ${it.kind === 'BHP' ? 'primary' : ''}`}>BHP</button>
              <div className="grow" />
              <button className="x-btn" onClick={() => remove(i)}><Icon name="x" size={12} /></button>
            </div>
            <input className="input mb-2" value={it.name} onChange={e => update(i, { name: e.target.value })} placeholder="Nama barang…" />
            <div className="gap-1.5 grid mb-1.5" >
              <input className="input mono" type="number" value={it.qty} onChange={e => update(i, { qty: e.target.value })} placeholder="qty" />
              <input className="input" value={it.unit} onChange={e => update(i, { unit: e.target.value })} placeholder="unit" />
              <input className="input mono" type="number" value={it.price} onChange={e => update(i, { price: e.target.value })} placeholder="harga satuan" />
            </div>
            <input className="input mb-2" value={it.link} onChange={e => update(i, { link: e.target.value })} placeholder="Link pembelian (opsional)" />
            {it.kind === 'Inventaris' && (
              <input className="input" value={it.replaces} onChange={e => update(i, { replaces: e.target.value })} placeholder="Mengganti aset apa? (opsional)" />
            )}
            <div className="text-xs text-3 mono mt-2 fw-5 text-right" >Subtotal: {window.fmtRp((Number(it.qty)||0) * (Number(it.price)||0))}</div>
          </div>
        ))}

        <div className="card compact" style={{background: 'rgba(183,148,255,0.1)', borderColor: 'rgba(183,148,255,0.3)'}}>
          <div className="flex between aic">
            <div className="text-xs mono uppercase" style={{color: 'var(--violet)', letterSpacing: '0.08em'}}>Estimasi total</div>
            <div className="mono text-xl fw-5 text-violet" >{window.fmtRp(total)}</div>
          </div>
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close}>Simpan draft</button>
        <button className="btn primary" onClick={save}><Icon name="arrow" size={13} /> Ajukan ke Kaprodi</button>
      </div>
    </>
  );
}

export { Users, NewUserForm, Rooms, Audit, Labels, NewDraftForm };


