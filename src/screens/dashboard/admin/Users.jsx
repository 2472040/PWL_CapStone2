import React, { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon, StatTile, useSearch } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Users() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find(r => r.id === 'sysadmin');

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await apiFetch('/users');
        if (res.data) {
          dispatch({ type: 'SET_USERS', users: res.data });
        }
      } catch (err) {
        toast('Gagal memuat data pengguna: ' + err.message, 'warn');
      }
    }
    loadUsers();
  }, [dispatch]);

  const filteredUsers = state.users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  async function toggleStatus(user) {
    const newStatus = user.status === 'active' ? 'paused' : 'active';
    try {
      const res = await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.data) {
        dispatch({ type: 'TOGGLE_USER', id: user.id });
        toast(`Status ${user.name}: ${newStatus === 'active' ? 'aktif' : 'paused'}`, 'info');
      }
    } catch (err) {
      toast('Gagal mengubah status: ' + err.message, 'warn');
    }
  }

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
              const r = D.roles.find(x => x.id === u.role) || { short: u.role, accent: 'var(--color-primary)' };
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
                  <td className="text-xs">{u.last_login ? new Date(u.last_login).toLocaleString('id-ID') : (u.lastLogin || 'belum pernah')}</td>
                  <td>
                    <div className="flex gap-1 justify-end" >
                      <button className="act-btn" onClick={() => toggleStatus(u)} title="Toggle" aria-label={`Toggle status ${u.name}`}><Icon name="swap" size={12} /></button>
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

export function NewUserForm({ close }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staflab');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name || !email) { toast('Isi nama dan email', 'warn'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          role,
          password: 'password123'
        })
      });
      if (res.data) {
        dispatch({ type: 'ADD_USER', user: res.data });
        toast('Pengguna ditambahkan', 'ok');
        close();
      }
    } catch (err) {
      toast('Gagal menambahkan pengguna: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar"><div className="drawer-title">Tambah pengguna</div><button className="x-btn" onClick={close}><Icon name="x" size={14} /></button></div>
      <div className="drawer-body">
        <div className="field"><div className="field-lbl">Nama lengkap <span className="req">*</span></div><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Misal: Tirta Halim" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Email <span className="req">*</span></div><input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="tirta@kampus.id" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Role</div>
          <select className="select" value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            {D.roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
        <div className="card compact text-xs text-3 mt-4" ><Icon name="info" size={11} /> Pengguna akan menerima email konfirmasi.</div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>Batal</button>
        <button className="btn primary" onClick={save} disabled={loading}>
          {loading ? 'Memproses...' : 'Buat akun'}
        </button>
      </div>
    </>
  );
}
