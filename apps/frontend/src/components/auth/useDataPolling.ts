import { useEffect, useRef } from 'react';
import { apiFetch, getToken } from '../../services/api';
import { mapDraft, mapBhp, mapMaintLog, mapInventory } from './mappers';
import type {
  ApiDraftResponse,
  ApiBhpResponse,
  ApiMaintenanceLogResponse,
  ApiInventoryResponse,
  AppStoreState,
  AppAction,
} from '../../store/store.types';

export function useDataPolling(
  pendingRole: string | null,
  state: AppStoreState,
  dispatch: React.Dispatch<AppAction>
) {
  const currentRole = state.role;
  const screenRef = useRef(state.screen);
  const roleRef = useRef(state.role);
  const pollDataRef = useRef<() => void>();
  const abortRef = useRef<AbortController | null>(null);

  // Keep references updated to prevent closure capturing in asynchronous callbacks
  useEffect(() => {
    screenRef.current = state.screen;
    roleRef.current = state.role;
  }, [state.screen, state.role]);

  const pollData = async () => {
    // Abort previous in-flight requests
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const role =
        roleRef.current ||
        pendingRole ||
        (() => {
          try {
            return localStorage.getItem('loka-role');
          } catch {
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
          const resRooms = await apiFetch<{ data: import('../../store/store.types').Room[] }>(
            '/rooms',
            { signal }
          );
          if (resRooms.data) {
            dispatch({ type: 'SET_ROOMS', rooms: resRooms.data });
          }
        } catch (e: unknown) {
          console.error('Gagal mengambil data ruangan:', e instanceof Error ? e.message : '');
        }
      }

      // 2. Fetch User lists (Sysadmin only, on 'users', 'dashboard', or if empty)
      const needUsers = screen === 'users' || screen === 'dashboard' || state.users.length === 0;
      if (needUsers && role === 'sysadmin') {
        try {
          const resUsers = await apiFetch<{ data: import('../../store/store.types').User[] }>(
            '/users',
            { signal }
          );
          if (resUsers.data) dispatch({ type: 'SET_USERS', users: resUsers.data });
        } catch (e: unknown) {
          console.error('Gagal mengambil data pengguna:', e instanceof Error ? e.message : '');
        }
      }

      // 3. Fetch Procurement Drafts (Kalab only, on 'pengadaan', 'dashboard', or if empty)
      if (role === 'kalab') {
        const needDrafts =
          screen === 'pengadaan' || screen === 'dashboard' || state.drafts.length === 0;
        if (needDrafts) {
          try {
            const resDrafts = await apiFetch<{ data: ApiDraftResponse[] }>('/procurement/drafts', {
              signal,
            });
            if (resDrafts.data) {
              dispatch({ type: 'SET_DRAFTS', drafts: resDrafts.data.map(mapDraft) });
            }
          } catch (e: unknown) {
            console.error('Gagal mengambil data draf:', e instanceof Error ? e.message : '');
          }
        }
      }

      // 4. Fetch Procurement Reviews or History (Kaprodi only)
      if (role === 'kaprodi') {
        try {
          // Always fetch review drafts to get the latest badge count
          const resReview = await apiFetch<{ data: ApiDraftResponse[] }>('/procurement/review', {
            signal,
          });
          let reviewCount = 0;
          if (resReview.data) {
            reviewCount = resReview.data.filter((d) => d.status === 'submitted').length;
            dispatch({ type: 'SET_PENDING_REVIEW_COUNT', count: reviewCount });
          }

          // Only dispatch drafts to state if they belong to the active screen view
          if (screen === 'history') {
            const resHistory = await apiFetch<{ data: ApiDraftResponse[] }>(
              '/procurement/history',
              { signal }
            );
            if (resHistory.data) {
              dispatch({ type: 'SET_DRAFTS', drafts: resHistory.data.map(mapDraft) });
            }
          } else if (screen === 'review' || screen === 'dashboard' || state.drafts.length === 0) {
            if (resReview.data) {
              dispatch({ type: 'SET_DRAFTS', drafts: resReview.data.map(mapDraft) });
            }
          }
        } catch (e: unknown) {
          console.error(
            'Gagal mengambil data pengadaan Kaprodi:',
            e instanceof Error ? e.message : ''
          );
        }
      }

      // 5. Fetch Procurement Receiving (Admin only, on 'receiving', 'dashboard', or if empty)
      if (role === 'admin') {
        const needReceiving =
          screen === 'receiving' || screen === 'dashboard' || state.drafts.length === 0;
        if (needReceiving) {
          try {
            const resReceiving = await apiFetch<{ data: ApiDraftResponse[] }>(
              '/procurement/receiving',
              { signal }
            );
            if (resReceiving.data) {
              dispatch({ type: 'SET_DRAFTS', drafts: resReceiving.data.map(mapDraft) });
            }
          } catch (e: unknown) {
            console.error('Gagal mengambil data penerimaan:', e instanceof Error ? e.message : '');
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
            const resBhp = await apiFetch<{ data: ApiBhpResponse[] }>('/bhp', { signal });
            if (resBhp.data) {
              dispatch({ type: 'SET_BHP', bhp: resBhp.data.map(mapBhp) });
            }
          } catch (e: unknown) {
            console.error('Gagal mengambil data BHP:', e instanceof Error ? e.message : '');
          }
        }
      }

      // 7. Fetch Maintenance Logs (Staf Lab only, on 'maintenance', 'dashboard', or if empty)
      if (role === 'staflab') {
        const needMaint =
          screen === 'maintenance' || screen === 'dashboard' || state.maintLog.length === 0;
        if (needMaint) {
          try {
            const resLogs = await apiFetch<{ data: ApiMaintenanceLogResponse[] }>('/maintenance', {
              signal,
            });
            if (resLogs.data) {
              dispatch({ type: 'SET_MAINT_LOGS', logs: resLogs.data.map(mapMaintLog) });
            }
          } catch (e: unknown) {
            console.error(
              'Gagal mengambil data log pemeliharaan:',
              e instanceof Error ? e.message : ''
            );
          }
        }
      }

      // 8. Fetch Inventory (all roles, on 'inventaris', 'dashboard', or if empty)
      const needInventory =
        screen === 'inventaris' || screen === 'dashboard' || state.inventory.length === 0;
      if (needInventory) {
        try {
          const resInv = await apiFetch<{ data: ApiInventoryResponse[] }>('/inventory', { signal });
          if (resInv.data) {
            dispatch({ type: 'SET_INVENTORY', inventory: resInv.data.map(mapInventory) });
          }
        } catch (e: unknown) {
          console.error('Gagal mengambil data inventaris:', e instanceof Error ? e.message : '');
        }
      }
    } catch (err: unknown) {
      console.error('Data sync polling error:', err instanceof Error ? err.message : '');
    }
  };

  // Safety Interval & Screen Change Polling Trigger Hook
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
      if (abortRef.current) abortRef.current.abort();
    };
  }, [currentRole, pendingRole, state.screen, dispatch]);

  return {
    pollData,
    pollDataRef,
    roleRef,
  };
}
