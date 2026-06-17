import { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon, StatTile, useSearch, CustomSelect } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';
import { User, UserRole } from '../../../store/store.types';

export function Users() {
  const { state, dispatch } = useStore();
  const { query } = useSearch();
  const toast = useToast();
  const role = D.roles.find((r) => r.id === 'sysadmin') || D.roles[0];

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await apiFetch('/users');
        if (res.data) {
          dispatch({ type: 'SET_USERS', users: res.data });
        }
      } catch (err: any) {
        toast('Gagal memuat data pengguna: ' + err.message, 'warn');
      }
    }
    loadUsers();
  }, [dispatch]);

  const filteredUsers = state.users.filter((u: User) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  async function toggleStatus(user: User) {
    const newStatus = user.status === 'active' ? 'paused' : 'active';
    try {
      const res = await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.data) {
        dispatch({ type: 'TOGGLE_USER', id: user.id });
        toast(`Status ${user.name}: ${newStatus === 'active' ? 'aktif' : 'paused'}`, 'info');
      }
    } catch (err: any) {
      toast('Gagal mengubah status: ' + err.message, 'warn');
    }
  }

  function handleDeleteUser(user: User) {
    const neverLoggedIn = !user.last_login && !user.lastLogin;
    const msg = neverLoggedIn
      ? `Apakah Anda yakin ingin menghapus permanen pengguna "${user.name}" yang belum pernah login ini?`
      : `Apakah Anda yakin ingin menonaktifkan pengguna "${user.name}"? Sesi aktif pengguna akan dicabut.`;

    dispatch({
      type: 'OPEN_MODAL',
      modal: {
        kind: 'confirm',
        payload: {
          title: neverLoggedIn ? 'Hapus Pengguna' : 'Nonaktifkan Pengguna',
          message: msg,
          isDanger: true,
          confirmText: neverLoggedIn ? 'Ya, Hapus' : 'Ya, Nonaktifkan',
          cancelText: 'Batal',
          onConfirm: async () => {
            try {
              const res = await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
              const refresh = await apiFetch('/users');
              if (refresh.data) {
                dispatch({ type: 'SET_USERS', users: refresh.data });
              }
              toast(res.message || `Pengguna "${user.name}" berhasil diproses.`, 'ok');
            } catch (err: any) {
              toast('Gagal menghapus pengguna: ' + err.message, 'warn');
            }
          },
        },
      },
    });
  }

  function exportToCSV() {
    if (state.users.length === 0) {
      toast('Tidak ada data pengguna untuk diekspor.', 'warn');
      return;
    }

    try {
      // CSV headers
      const headers = [
        'ID',
        'Nama',
        'Email',
        'Role',
        'Status',
        'Initials',
        'Login Terakhir',
        'Dibuat Pada',
      ];

      const parseDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return isNaN(date.getTime()) ? String(d) : date.toISOString();
      };

      // CSV rows
      const rows = state.users.map((u: User) => {
        const nameStr = u.name ? String(u.name).replace(/"/g, '""') : '';
        const emailStr = u.email ? String(u.email).replace(/"/g, '""') : '';
        const roleStr = u.role ? String(u.role).replace(/"/g, '""') : '';
        const statusStr = u.status ? String(u.status).replace(/"/g, '""') : '';
        const initialsStr = u.initials ? String(u.initials).replace(/"/g, '""') : '';

        let lastLoginStr = 'belum pernah';
        if (u.last_login) {
          lastLoginStr = parseDate(u.last_login);
        } else if (u.lastLogin) {
          lastLoginStr = parseDate(u.lastLogin);
        }

        let createdAtStr = '';
        if (u.createdAt) {
          createdAtStr = parseDate(u.createdAt);
        } else if (u.created_at) {
          createdAtStr = parseDate(u.created_at);
        }

        return [
          u.id,
          `"${nameStr}"`,
          `"${emailStr}"`,
          `"${roleStr}"`,
          `"${statusStr}"`,
          `"${initialsStr}"`,
          `"${lastLoginStr}"`,
          `"${createdAtStr}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `lokalab_users_${new Date().toISOString().substring(0, 10)}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast('Data pengguna berhasil diekspor ke CSV!', 'ok');
    } catch (err: any) {
      console.error(err);
      toast('Gagal mengekspor CSV: ' + err.message, 'warn');
    }
  }

  return (
    <div className="page" style={{ '--role-accent': role.accent } as any}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-sub">
            {state.users.filter((u: User) => u.status === 'active').length} aktif ·{' '}
            {state.users.filter((u: User) => u.status === 'paused').length} di-pause
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={exportToCSV} title="Export ke CSV">
            <Icon name="download" size={13} /> Export CSV
          </button>
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newUser' } })}
          >
            <Icon name="plus" size={13} strokeWidth={2.4} /> Tambah pengguna
          </button>
        </div>
      </div>

      <div className="stats">
        {D.roles.map((r, i) => (
          <StatTile
            key={r.id}
            label={r.title}
            value={state.users.filter((u: User) => u.role === r.id).length}
            fmt="int"
            icon="users"
            accent={i === 0 ? role.accent : undefined}
          />
        ))}
      </div>

      {query && filteredUsers.length === 0 && (
        <div className="empty" data-reveal>
          <div className="ico">
            <Icon name="search" size={20} />
          </div>
          <h4>Tidak ada pengguna cocok</h4>
          <div>Coba kata kunci lain.</div>
        </div>
      )}

      <div className="table-wrap" data-reveal>
        <table className="tbl">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Login terakhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u: User) => {
              const r = D.roles.find((x) => x.id === u.role) || {
                short: u.role,
                accent: 'var(--color-primary)',
              };
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex gap-2.5 items-center">
                      <div className="avatar sm" style={{ '--av-c': r.accent } as any}>
                        {u.name
                          .split(' ')
                          .map((w: string) => w[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <b>{u.name}</b>
                    </div>
                  </td>
                  <td className="mono text-xs">{u.email}</td>
                  <td>
                    <span
                      className="chip"
                      style={{ color: r.accent, borderColor: r.accent + '55' }}
                    >
                      {r.short}
                    </span>
                  </td>
                  <td>
                    {u.status === 'active' ? (
                      <span className="chip ok">
                        <span className="dot" /> Aktif
                      </span>
                    ) : (
                      <span className="chip warn">
                        <span className="dot" /> Paused
                      </span>
                    )}
                  </td>
                  <td className="text-xs">
                    {u.last_login
                      ? new Date(u.last_login).toLocaleString('id-ID')
                      : u.lastLogin || 'belum pernah'}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button
                        className="act-btn"
                        onClick={() => toggleStatus(u)}
                        title="Aktif/Pause Pengguna"
                        aria-label={`Toggle status ${u.name}`}
                      >
                        <Icon name="swap" size={12} />
                      </button>
                      <button
                        className="act-btn"
                        onClick={() =>
                          dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newUser', payload: u } })
                        }
                        title="Ubah Pengguna"
                        aria-label={`Edit ${u.name}`}
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        className="act-btn danger"
                        onClick={() => handleDeleteUser(u)}
                        title="Hapus (Nonaktifkan)"
                        aria-label={`Hapus ${u.name}`}
                      >
                        <Icon name="trash" size={12} />
                      </button>
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

export function NewUserForm({ payload, close }: { payload?: User; close: () => void }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const isEdit = !!payload;

  const [name, setName] = useState(payload?.name || '');
  const [email, setEmail] = useState(payload?.email || '');
  const [role, setRole] = useState(payload?.role || 'staflab');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name || !email) {
      toast('Isi nama dan email', 'warn');
      return;
    }
    if (!isEdit && !password) {
      toast('Password wajib diisi untuk pengguna baru', 'warn');
      return;
    }
    if (password && password !== confirmPassword) {
      toast('Password dan konfirmasi tidak cocok', 'warn');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEdit ? `/users/${payload.id}` : '/users';
      const method = isEdit ? 'PUT' : 'POST';

      const body: { name: string; email: string; role: string; password?: string } = {
        name,
        email,
        role,
      };

      if (password) {
        body.password = password;
      }

      const res = await apiFetch(endpoint, {
        method: method,
        body: JSON.stringify(body),
      });
      if (res.data) {
        const refreshRes = await apiFetch('/users');
        if (refreshRes.data) {
          dispatch({ type: 'SET_USERS', users: refreshRes.data });
        }
        toast(isEdit ? 'Pengguna berhasil diperbarui' : 'Pengguna ditambahkan', 'ok');
        close();
      }
    } catch (err: any) {
      toast(`Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} pengguna: ` + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar">
        <div className="drawer-title">{isEdit ? 'Ubah pengguna' : 'Tambah pengguna'}</div>
        <button className="x-btn" onClick={close} disabled={loading}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="drawer-body">
        <div className="field">
          <div className="field-lbl">
            Nama lengkap <span className="req">*</span>
          </div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Tirta Halim"
            disabled={loading}
          />
        </div>
        <div className="field">
          <div className="field-lbl">
            Email <span className="req">*</span>
          </div>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tirta@kampus.id"
            disabled={loading}
          />
        </div>
        <div className="field">
          <div className="field-lbl">Role</div>
          <CustomSelect
            value={role}
            onChange={(val) => setRole(val as UserRole)}
            options={D.roles.map((r) => ({
              value: r.id,
              label: r.title,
            }))}
            disabled={loading}
            style={{ width: '100%' }}
            placeholder="Pilih role…"
          />
        </div>
        <div className="field">
          <div className="field-lbl">
            {isEdit ? 'Ubah Password (kosongkan jika tidak ingin diubah)' : 'Password'}{' '}
            <span className={!isEdit ? 'req' : 'hidden'}>*</span>
          </div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              isEdit ? 'Masukkan password baru jika ingin diubah' : 'Wajib diisi untuk akun baru'
            }
            disabled={loading}
          />
        </div>
        {password && (
          <div className="field">
            <div className="field-lbl">
              Konfirmasi Password <span className="req">*</span>
            </div>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password"
              disabled={loading}
            />
          </div>
        )}
        <div className="card compact text-xs text-3 mt-4">
          <Icon name="info" size={11} />{' '}
          {isEdit
            ? 'Perubahan role akan segera mencabut sesi aktif pengguna tersebut.'
            : 'Password tidak boleh dikosongkan untuk pendaftaran pengguna baru.'}
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>
          Batal
        </button>
        <button className="btn primary" onClick={save} disabled={loading}>
          {loading ? 'Memproses...' : isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
        </button>
      </div>
    </>
  );
}
