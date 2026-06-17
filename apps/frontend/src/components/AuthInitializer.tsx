import { useEffect } from 'react';
import { useStore } from './store-context';
import { apiFetch, getToken } from '../services/api';
import type { UserRole } from '../store/store.types';
import { useDataPolling } from './auth/useDataPolling';
import { useWebSocketSync } from './auth/useWebSocketSync';

interface AuthInitializerProps {
  pendingRole: string | null;
}

export function AuthInitializer({ pendingRole }: AuthInitializerProps) {
  const { state, dispatch } = useStore();

  // Immediately apply role from login response or localStorage
  useEffect(() => {
    const role =
      pendingRole ||
      (() => {
        try {
          return localStorage.getItem('loka-role');
        } catch {
          return null;
        }
      })();
    if (role) {
      dispatch({ type: 'SET_ROLE', role: role as UserRole });
    }
  }, [pendingRole, dispatch]);

  // Also verify with backend (in case token expired or role changed)
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        if (pendingRole) {
          await new Promise((r) => setTimeout(r, 300));
        }
        if (cancelled) return;

        const result = await apiFetch<{ data: import('../store/store.types').User }>('/auth/me');
        if (cancelled) return;
        const user = result.data;
        if (user && user.role) {
          dispatch({ type: 'SET_USER', user });
          dispatch({ type: 'SET_ROLE', role: user.role });
          try {
            localStorage.setItem('loka-role', user.role);
          } catch {
            // ignore storage errors
          }
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const msg = error instanceof Error ? error.message : 'unknown';
        console.error('Gagal mengambil data user:', msg);
      }
    }

    const isLoggedIn = getToken() || localStorage.getItem('loka_logged_in') === 'true';
    if (isLoggedIn) {
      loadCurrentUser();
    }

    return () => {
      cancelled = true;
    };
  }, [pendingRole, dispatch]);

  // Use custom hooks for polling and WebSocket synchronization
  const { roleRef, pollDataRef } = useDataPolling(pendingRole, state, dispatch);
  useWebSocketSync({ pendingRole, roleRef, pollDataRef });

  return null;
}
export default AuthInitializer;
