import { ReactNode } from 'react';
import { useAppStore, AppStoreState } from '../store/useAppStore';

interface StoreContextValue {
  state: AppStoreState;
  dispatch: AppStoreState['dispatch'];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useStore = (): StoreContextValue => {
  const state = useAppStore();
  const dispatch = useAppStore((s) => s.dispatch);

  return {
    state,
    dispatch,
  };
};
