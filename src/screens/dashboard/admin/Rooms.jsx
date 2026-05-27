import React, { useState, useEffect } from 'react';
import { useStore, useToast, D, Icon, StatTile } from '../../../components/app-shell.jsx';
import { apiFetch } from '../../../services/api.js';

export function Rooms() {
  const { state, dispatch } = useStore();
  const role = D.roles.find(r => r.id === 'sysadmin');
  const toast = useToast();

  useEffect(() => {
    async function loadRooms() {
      try {
        const res = await apiFetch('/rooms');
        if (res.data) {
          dispatch({ type: 'SET_ROOMS', rooms: res.data });
        }
      } catch (err) {
        toast('Gagal memuat data ruangan: ' + err.message, 'warn');
      }
    }
    loadRooms();
  }, [dispatch]);

  return (
    <div className="page" style={{'--role-accent': role.accent}}>
      <div className="page-head" data-reveal>
        <div>
          <h1 className="page-title">Ruangan</h1>
          <p className="page-sub">{state.rooms.length} laboratorium terdaftar · total {state.rooms.reduce((s, r) => s + (Number(r.assets) || 0), 0)} aset</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({ type: 'OPEN_DRAWER', drawer: { kind: 'newRoom' } })}>
          <Icon name="plus" size={13} strokeWidth={2.4} /> Tambah ruangan
        </button>
      </div>

      <div className="gap-[14px]" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}>
        {state.rooms.map(r => {
          const pct = Math.min(100, ((Number(r.assets) || 0) / (Number(r.capacity) || 1)) * 100 * 1.2);
          const picName = typeof r.pic === 'object' ? r.pic?.name : (r.pic || 'Belum ada PIC');
          return (
            <div key={r.code} className="card tilt-card" data-reveal>
              <div className="tilt-shine" />
              <div className="flex between aic mb-3">
                <div className="mono text-xs tracking-[0.08em]" style={{color: role.accent}}>[{r.code}]</div>
                <span className="chip">Lantai {r.floor}</span>
              </div>
              <div className="text-xl fw-5 mb-2 tracking-tight" >{r.name}</div>
              <div className="text-xs text-3 mono mb-4">{r.assets || 0} aset · kapasitas {r.capacity || 0} orang</div>
              <div className="h-1" style={{background: 'var(--surface)', borderRadius: 2, overflow: 'hidden'}}>
                <div className="rounded-sm" style={{height: '100%', width: pct + '%', background: 'linear-gradient(90deg, ' + role.accent + ', var(--color-cyan))'}} />
              </div>
              <div className="flex between aic mt-4">
                <div className="text-xs text-3">PIC <b className="text-ink-2" >{picName}</b></div>
                <button className="btn sm"><Icon name="edit" size={11} /> Ubah</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NewRoomForm({ close }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(30);
  const [picUserId, setPicUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await apiFetch('/users');
        if (res.data) {
          const activeUsers = res.data.filter(u => u.status === 'active');
          setUsers(activeUsers);
          if (activeUsers.length > 0) setPicUserId(activeUsers[0].id);
        }
      } catch (err) {
        console.error('Failed to load users for PIC selection:', err);
      }
    }
    loadUsers();
  }, []);

  async function save() {
    if (!code || !name) { toast('Isi kode dan nama ruangan', 'warn'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          code,
          name,
          floor: Number(floor),
          capacity: Number(capacity),
          pic_user_id: picUserId ? Number(picUserId) : null
        })
      });
      if (res.data) {
        const refreshRes = await apiFetch('/rooms');
        if (refreshRes.data) {
          dispatch({ type: 'SET_ROOMS', rooms: refreshRes.data });
        } else {
          dispatch({ type: 'ADD_ROOM', room: res.data });
        }
        toast('Ruangan berhasil dibuat', 'ok');
        close();
      }
    } catch (err) {
      toast('Gagal membuat ruangan: ' + err.message, 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="drawer-bar"><div className="drawer-title">Tambah ruangan</div><button className="x-btn" onClick={close} disabled={loading}><Icon name="x" size={14} /></button></div>
      <div className="drawer-body">
        <div className="field"><div className="field-lbl">Kode ruangan <span className="req">*</span></div><input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="Misal: L-202" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Nama ruangan <span className="req">*</span></div><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Misal: Lab Rekayasa Perangkat Lunak" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Lantai <span className="req">*</span></div><input className="input" type="number" value={floor} onChange={e => setFloor(e.target.value)} placeholder="1" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Kapasitas (orang)</div><input className="input" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="30" disabled={loading} /></div>
        <div className="field"><div className="field-lbl">Penanggung Jawab (PIC)</div>
          <select className="select" value={picUserId} onChange={e => setPicUserId(e.target.value)} disabled={loading}>
            <option value="">Pilih PIC...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn" onClick={close} disabled={loading}>Batal</button>
        <button className="btn primary" onClick={save} disabled={loading}>
          {loading ? 'Memproses...' : 'Tambah ruangan'}
        </button>
      </div>
    </>
  );
}
