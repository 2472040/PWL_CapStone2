import { useEffect, useRef } from 'react';
import { useStore } from './store-context';
import { apiFetch, getToken } from '../services/api';
import { io, Socket } from 'socket.io-client';

declare global {
  interface Window {
    clearApiCache?: () => void;
    showToast?: (msg: string, kind?: 'ok' | 'warn' | 'info', icon?: string) => void;
  }
}

interface AuthInitializerProps {
  pendingRole: string | null;
}

export function AuthInitializer({ pendingRole }: AuthInitializerProps) {
  const { state, dispatch } = useStore();
  const currentRole = state.role;

  const screenRef = useRef(state.screen);
  const roleRef = useRef(state.role);
  const pollDataRef = useRef<() => void>();

  // Keep references updated to prevent closure capturing in asynchronous callbacks
  useEffect(() => {
    screenRef.current = state.screen;
    roleRef.current = state.role;
  }, [state.screen, state.role]);

  // Immediately apply role from login response or localStorage
  useEffect(() => {
    const role =
      pendingRole ||
      (() => {
        try {
          return localStorage.getItem('loka-role');
        } catch (e) {
          return null;
        }
      })();
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
          await new Promise((r) => setTimeout(r, 300));
        }
        if (cancelled) return;

        const result = await apiFetch('/auth/me');
        if (cancelled) return;
        const user = result.data;
        if (user && user.role) {
          dispatch({ type: 'SET_USER', user });
          dispatch({ type: 'SET_ROLE', role: user.role });
          try {
            localStorage.setItem('loka-role', user.role);
          } catch (e) {}
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error('Gagal mengambil data user:', error.message);
        // Don't clear token here — the 401 interceptor in apiFetch already handles logout
      }
    }

    // Check login flag (not the JWT itself) to decide whether to verify session with backend
    const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';
    if (isLoggedIn) {
      loadCurrentUser();
    }

    return () => {
      cancelled = true;
    };
  }, [pendingRole, dispatch]);

  // Screen-aware and role-aware sync polling logic
  const pollData = async () => {
    try {
      const role =
        roleRef.current ||
        pendingRole ||
        (() => {
          try {
            return localStorage.getItem('loka-role');
          } catch (e) {
            return null;
          }
        })();
      if (!role) return;

      const screen = screenRef.current;

      // 1. Fetch Rooms (only on 'rooms', 'dashboard', or if rooms array is empty)
      const needRooms = screen === 'rooms' || screen === 'dashboard' || state.rooms.length === 0;
      if (
        needRooms &&
        (role === 'sysadmin' || role === 'staflab' || role === 'admin' || role === 'kalab')
      ) {
        try {
          const resRooms = await apiFetch('/rooms');
          if (resRooms.data) {
            dispatch({ type: 'SET_ROOMS', rooms: resRooms.data });
          }
        } catch (e: any) {
          console.error('Gagal mengambil data ruangan:', e.message);
        }
      }

      // 2. Fetch User lists (Sysadmin only, on 'users', 'dashboard', or if empty)
      const needUsers = screen === 'users' || screen === 'dashboard' || state.users.length === 0;
      if (needUsers && role === 'sysadmin') {
        try {
          const resUsers = await apiFetch('/users');
          if (resUsers.data) dispatch({ type: 'SET_USERS', users: resUsers.data });
        } catch (e: any) {
          console.error('Gagal mengambil data pengguna:', e.message);
        }
      }

      // 3. Fetch Procurement Drafts (Kalab only, on 'pengadaan', 'dashboard', or if empty)
      if (role === 'kalab') {
        const needDrafts =
          screen === 'pengadaan' || screen === 'dashboard' || state.drafts.length === 0;
        if (needDrafts) {
          try {
            const resDrafts = await apiFetch('/procurement/drafts');
            if (resDrafts.data) {
              const formatted = resDrafts.data.map((d: any) => ({
                ...d,
                by: d.creator?.name || d.by || 'Kepala Lab',
                role: d.creator?.role || d.role || 'kalab',
                submitted: d.submitted_at
                  ? new Date(d.submitted_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-',
                items:
                  d.items?.map((it: any) => ({
                    ...it,
                    approval:
                      it.approval?.status === 'approved'
                        ? 'ok'
                        : it.approval?.status === 'rejected'
                          ? 'no'
                          : null,
                    received: it.receivings && it.receivings.length > 0,
                  })) || [],
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e: any) {
            console.error('Gagal mengambil data draf:', e.message);
          }
        }
      }

      // 4. Fetch Procurement Reviews or History (Kaprodi only)
      if (role === 'kaprodi') {
        try {
          // Always fetch review drafts to get the latest badge count
          const resReview = await apiFetch('/procurement/review');
          let reviewCount = 0;
          if (resReview.data) {
            reviewCount = resReview.data.filter((d: any) => d.status === 'submitted').length;
            dispatch({ type: 'SET_PENDING_REVIEW_COUNT', count: reviewCount });
          }

          // Only dispatch drafts to state if they belong to the active screen view
          if (screen === 'history') {
            const resHistory = await apiFetch('/procurement/history');
            if (resHistory.data) {
              const formatted = resHistory.data.map((d: any) => ({
                ...d,
                by: d.creator?.name || d.by,
                role: d.creator?.role || d.role,
                items:
                  d.items?.map((it: any) => ({
                    ...it,
                    approval:
                      it.approval?.status === 'approved'
                        ? 'ok'
                        : it.approval?.status === 'rejected'
                          ? 'no'
                          : null,
                  })) || [],
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } else if (screen === 'review' || screen === 'dashboard' || state.drafts.length === 0) {
            if (resReview.data) {
              const formatted = resReview.data.map((d: any) => ({
                ...d,
                by: d.creator?.name || d.by,
                role: d.creator?.role || d.role,
                items:
                  d.items?.map((it: any) => ({
                    ...it,
                    approval:
                      it.approval?.status === 'approved'
                        ? 'ok'
                        : it.approval?.status === 'rejected'
                          ? 'no'
                          : null,
                  })) || [],
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          }
        } catch (e: any) {
          console.error('Gagal mengambil data pengadaan Kaprodi:', e.message);
        }
      }

      // 5. Fetch Procurement Receiving (Admin only, on 'receiving', 'dashboard', or if empty)
      if (role === 'admin') {
        const needReceiving =
          screen === 'receiving' || screen === 'dashboard' || state.drafts.length === 0;
        if (needReceiving) {
          try {
            const resReceiving = await apiFetch('/procurement/receiving');
            if (resReceiving.data) {
              const formatted = resReceiving.data.map((d: any) => ({
                ...d,
                by: d.creator?.name || d.by,
                role: d.creator?.role || d.role,
                items:
                  d.items?.map((it: any) => ({
                    ...it,
                    approval:
                      it.approval?.status === 'approved'
                        ? 'ok'
                        : it.approval?.status === 'rejected'
                          ? 'no'
                          : null,
                    received: it.receivings && it.receivings.length > 0,
                    receivedDate:
                      it.receivings && it.receivings.length > 0
                        ? new Date(it.receivings[0].received_date).toLocaleDateString('id-ID')
                        : null,
                  })) || [],
              }));
              dispatch({ type: 'SET_DRAFTS', drafts: formatted });
            }
          } catch (e: any) {
            console.error('Gagal mengambil data penerimaan:', e.message);
          }
        }
      }

      // 6. Fetch BHP (Kalab, Admin, Staf Lab)
      if (role === 'kalab' || role === 'admin' || role === 'staflab') {
        const needBhp =
          screen === 'bhp' ||
          screen === 'dashboard' ||
          screen === 'maintenance' ||
          state.bhp.length === 0;
        if (needBhp) {
          try {
            const resBhp = await apiFetch('/bhp');
            if (resBhp.data) {
              const formatted = resBhp.data.map((b: any) => ({
                id: b.code || b.id.toString(),
                dbId: b.id,
                name: b.name,
                unit: b.unit,
                stock: parseFloat(b.stock) || 0,
                min: parseFloat(b.min_stock) || 0,
                lastIn: b.last_in || '-',
                cat: b.category || 'General',
              }));
              dispatch({ type: 'SET_BHP', bhp: formatted });
            }
          } catch (e: any) {
            console.error('Gagal mengambil data BHP:', e.message);
          }
        }
      }

      // 7. Fetch Maintenance Logs (Staf Lab only, on 'maintenance', 'dashboard', or if empty)
      if (role === 'staflab') {
        const needMaint =
          screen === 'maintenance' || screen === 'dashboard' || state.maintLog.length === 0;
        if (needMaint) {
          try {
            const resLogs = await apiFetch('/maintenance');
            if (resLogs.data) {
              const formatted = resLogs.data.map((l: any) => ({
                id: l.code || l.id,
                date: new Date(l.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                asset: l.Inventory?.code,
                name: l.Inventory?.name,
                action: l.action,
                tech: l.technician?.name || 'Teknisi',
                cond: l.condition_after,
                bhp:
                  l.bhpUsed?.map((bu: any) => ({
                    id: bu.Bhp?.code || bu.bhp_id,
                    qty: parseFloat(bu.qty_used) || 0,
                    unit: bu.Bhp?.unit || 'pcs',
                  })) || [],
              }));
              dispatch({ type: 'SET_MAINT_LOGS', logs: formatted });
            }
          } catch (e: any) {
            console.error('Gagal mengambil data log pemeliharaan:', e.message);
          }
        }
      }

      // 8. Fetch Inventory (all roles, on 'inventaris', 'dashboard', or if empty)
      const needInventory =
        screen === 'inventaris' || screen === 'dashboard' || state.inventory.length === 0;
      if (needInventory) {
        try {
          const resInv = await apiFetch('/inventory');
          if (resInv.data) {
            const formatted = resInv.data.map((i: any) => ({
              id: i.id,
              code: i.code,
              name: i.name,
              cat: i.category,
              room: i.Room?.name || 'Gudang',
              roomId: i.room_id || (i.Room ? i.Room.id : null),
              cond: i.condition || 'Baik',
              last: i.last_checked
                ? new Date(i.last_checked).toLocaleDateString('id-ID')
                : 'Baru saja',
              acquired: i.acquired_date ? i.acquired_date.substring(0, 7) : '2025-01',
              value: i.value || 0,
              serial: i.serial || '-',
              specs: i.specs || '-',
            }));
            dispatch({ type: 'SET_INVENTORY', inventory: formatted });
          }
        } catch (e: any) {
          console.error('Gagal mengambil data inventaris:', e.message);
        }
      }
    } catch (err: any) {
      console.error('Data sync polling error:', err.message);
    }
  };

  // 1. Persistent WebSocket Connection Hook
  useEffect(() => {
    const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';
    if (!isLoggedIn) return;

    const wsToken = getToken();
    const socket: Socket = io(
      window.location.origin === 'http://localhost:5173'
        ? 'http://localhost:3000'
        : window.location.origin,
      {
        withCredentials: true,
        auth: wsToken ? { token: wsToken } : {},
      }
    );

    socket.on('connect', () => {
      console.log('⚡ Connected to LokaLab WebSocket Real-time Sync');
      pollDataRef.current?.();
    });

    socket.on('data_changed', (payload: any) => {
      console.log('⚡ WebSocket Sync Event:', payload);
      if (window.clearApiCache) window.clearApiCache();
      pollDataRef.current?.();
    });

    socket.on('notification', (payload: any) => {
      console.log('⚡ WebSocket Notification:', payload);
      const role =
        roleRef.current ||
        pendingRole ||
        (() => {
          try {
            return localStorage.getItem('loka-role');
          } catch (e) {
            return null;
          }
        })();
      if (role && payload.roles.includes(role)) {
        if (window.showToast) {
          window.showToast(payload.message, payload.kind || 'info');
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [pendingRole]);

  // 2. Safety Interval & Screen Change Polling Trigger Hook
  useEffect(() => {
    const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';
    if (!isLoggedIn) return;

    pollDataRef.current = pollData;
    pollData();

    const safetyInterval = setInterval(pollData, 30000);

    const onOnline = () => pollData();
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(safetyInterval);
      window.removeEventListener('online', onOnline);
    };
  }, [currentRole, pendingRole, state.screen, dispatch]);

  return null;
}
