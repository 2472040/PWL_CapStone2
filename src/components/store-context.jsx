import React, { createContext, useContext } from 'react';
import { useAppStore } from '../store/useAppStore';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const state = useAppStore();
  const dispatch = useAppStore((s) => s.dispatch);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  const localState = useAppStore();
  const localDispatch = useAppStore((s) => s.dispatch);

  if (ctx) return ctx;

  return {
    state: localState,
    dispatch: localDispatch,
  };
};
