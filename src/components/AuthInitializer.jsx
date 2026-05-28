import React, { useEffect } from 'react';
import { useStore, D } from './app-shell.jsx';
import { apiFetch, getToken } from '../services/api.js';

export function AuthInitializer({ pendingRole }) {
  const { state, dispatch } = useStore();
  const currentRole = state.role;

  // Immediately apply role from login response or localStorage
  useEffect(() => {
    const role = pendingRole || (() => { try { return localStorage.getItem('loka-role'); } catch (e) { return null; } })();
    if (role) {
      dispatch({ type: 'SET_ROLE', role });
    }
  }, [pendingRole, dispatch]);

  // Also verify with backend (in case token expired or role changed)
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        // Small delay after fresh login to let the HttpOnly cookie settle through the proxy
        if (pendingRole) {
          await new Promise(r => setTimeout(r, 300));
        }
        if (cancelled) return;

        const result = await apiFetch('/auth/me');
        if (cancelled) return;
        const user = result.data;
        if (user && user.role) {
          dispatch({ type: 'SET_USER', user });
          dispatch({ type: 'SET_ROLE', role: user.role });
          try { localStorage.setItem('loka-role', user.role); } catch (e) {}
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Gagal mengambil data user:', error.message);
        // Don't clear token here — the 401 interceptor in apiFetch already handles logout
      }
    }

    if (getToken()) {
      loadCurrentUser();
    }

    return () => { cancelled = true; };
  }, [pendingRole, dispatch]);

  // Real-time synchronization polling mechanism
  useEffect(() => {
    if (!getToken()) return;

    const pollData = async () => {
      try {
        const role = currentRole || pendingRole || (() => { try { return localStorage.getItem('loka-role'); } catch (e) { return null; } })();
        if (!role) return;

        // 1. Fetch Rooms (Sysadmin only on backend, or general fallback)
        if (role === 'sysadmin') {
          try {
            const resRooms = await apiFetch('/rooms');
            if (resRooms.data) {
              dispatch({ type: 'SET_ROOMS', rooms: resRooms.data });
            }
          } catch (e) {
            console.error('Gagal mengambil data ruangan:', e.message);
          }
        }

        // 2. Fetch User lists (Sysadmin only)
        if (role === 'sysadmin') {
          try {
            const resUsers = await apiFetch('/users');
            if (resUsers.data) dispatch({ type: 'SET_USERS', users: resUsers.data });
          } catch (e) {
            console.error('Gagal mengambil data pengguna:', e.message);
          }
        }

        // 3. Fetch Procurement Drafts (Kalab only)
        if (role === 'kalab') {
          try {
            const resDrafts = await apiFetch('/procurement/drafts');
            if (resDrafts.data) {
              const formatted = resDrafts.data.map(d => ({
                ...d,
                by: d.creator?.name || d.by || 'Kepala Lab',
                role: d.creator?.role || d.role || 'kalab',
                submitted: d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                items: d.items?.map(it => ({
                  ...it,
                  approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null,
                  received: it.receivings && it.receivings.length > 0
                })) || []
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data draf:', e.message);
          }

          try {
            const resBhp = await apiFetch('/bhp');
            if (resBhp.data) {
              const formatted = resBhp.data.map(b => ({
                id: b.code || b.id.toString(),
                dbId: b.id,
                name: b.name,
                unit: b.unit,
                stock: parseFloat(b.stock) || 0,
                min: parseFloat(b.min_stock) || 0,
                lastIn: b.last_in || '-',
                cat: b.category || 'General'
              }));
              dispatch({ type: 'SET_BHP', bhp: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data BHP:', e.message);
          }
        }

        // 4. Fetch Procurement Reviews or History (Kaprodi only)
        if (role === 'kaprodi') {
          try {
            const isHistory = state.screen === 'history';
            const endpoint = isHistory ? '/procurement/history' : '/procurement/review';
            const resData = await apiFetch(endpoint);
            if (resData.data) {
              const formatted = resData.data.map(d => ({
                ...d,
                by: d.creator?.name || d.by,
                role: d.creator?.role || d.role,
                items: d.items?.map(it => ({
                  ...it,
                  approval: it.approval?.status === 'approved' ? 'ok' : it.approval?.status === 'rejected' ? 'no' : null
                })) || []
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data pengadaan Kaprodi:', e.message);
          }
        }

        // 5. Fetch Maintenance Logs & BHP (Staf Lab only)
        if (role === 'staflab') {
          try {
            const resLogs = await apiFetch('/maintenance');
            if (resLogs.data) {
              const formatted = resLogs.data.map(l => ({
                id: l.code || l.id,
                date: new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                asset: l.Inventory?.code,
                name: l.Inventory?.name,
                action: l.action,
                tech: l.technician?.name || 'Teknisi',
                cond: l.condition_after,
                bhp: l.bhpUsed?.map(bu => ({
                  id: bu.Bhp?.code || bu.bhp_id,
                  qty: parseFloat(bu.qty_used) || 0,
                  unit: bu.Bhp?.unit || 'pcs'
                })) || []
              }));
              dispatch({ type: 'SET_MAINT_LOGS', logs: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data log pemeliharaan:', e.message);
          }

          try {
            const resBhp = await apiFetch('/bhp');
            if (resBhp.data) {
              const formatted = resBhp.data.map(b => ({
                id: b.code || b.id.toString(),
                dbId: b.id,
                name: b.name,
                unit: b.unit,
                stock: parseFloat(b.stock) || 0,
                min: parseFloat(b.min_stock) || 0,
                lastIn: b.last_in || '-',
                cat: b.category || 'General'
              }));
              dispatch({ type: 'SET_BHP', bhp: formatted });
            }
          } catch (e) {
            console.error('Gagal mengambil data BHP:', e.message);
          }
        }

        // 6. Fetch Inventory for all roles (including Sysadmin)
        try {
          const resInv = await apiFetch('/inventory');
          if (resInv.data) {
            const formatted = resInv.data.map(i => ({
              id: i.id,
              code: i.code,
              name: i.name,
              cat: i.category,
              room: i.Room?.name || 'Gudang',
              cond: i.condition || 'Baik',
              last: i.last_checked ? new Date(i.last_checked).toLocaleDateString('id-ID') : 'Baru saja',
              acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
              value: i.value || 0,
              serial: i.serial || '-',
              specs: i.specs || '-'
            }));
            dispatch({ type: 'SET_INVENTORY', inventory: formatted });
          }
        } catch (e) {
          console.error('Gagal mengambil data inventaris:', e.message);
        }

      } catch (err) {
        console.error('Data sync polling error:', err.message);
      }
    };

    pollData();
    const interval = setInterval(pollData, 4000); // sync every 4 seconds
    return () => clearInterval(interval);
  }, [currentRole, pendingRole, state.screen, dispatch]);

  return null;
}
