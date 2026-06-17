import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../../services/api';

interface UseWebSocketSyncProps {
  pendingRole: string | null;
  roleRef: React.MutableRefObject<string | null>;
  pollDataRef: React.MutableRefObject<(() => void) | undefined>;
}

export function useWebSocketSync({ pendingRole, roleRef, pollDataRef }: UseWebSocketSyncProps) {
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
        auth: wsToken ? { token: String(wsToken) } : {},
      }
    );

    socket.on('connect', () => {
      console.log('⚡ Connected to LokaLab WebSocket Real-time Sync');
      pollDataRef.current?.();
    });

    socket.on('data_changed', (payload: Record<string, unknown>) => {
      console.log('⚡ WebSocket Sync Event:', payload);
      if (window.clearApiCache) window.clearApiCache();
      pollDataRef.current?.();
    });

    socket.on('notification', (payload: { roles: string[]; message: string; kind?: string }) => {
      console.log('⚡ WebSocket Notification:', payload);
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
      if (role && payload.roles.includes(role)) {
        if (window.showToast) {
          window.showToast(payload.message, (payload.kind || 'info') as 'ok' | 'warn' | 'info');
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [pendingRole]);
}
