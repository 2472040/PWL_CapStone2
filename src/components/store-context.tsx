import { createContext, useContext, ReactNode } from 'react';
import { useAppStore, AppStoreState } from '../store/useAppStore';

interface StoreContextValue {
  state: AppStoreState;
  dispatch: AppStoreState['dispatch'];
}

const StoreCtx = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useAppStore();
  const dispatch = useAppStore((s) => s.dispatch);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export const useStore = (): StoreContextValue => {
  const ctx = useContext(StoreCtx);
  const localState = useAppStore();
  const localDispatch = useAppStore((s) => s.dispatch);

  if (ctx) return ctx;

  return {
    state: localState,
    dispatch: localDispatch,
  };
};
