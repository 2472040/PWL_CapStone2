import { useState, useMemo, createContext, useContext, ReactNode } from 'react';

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

const SearchCtx = createContext<SearchContextValue>({ query: '', setQuery: () => {} });

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

export const useSearch = (): SearchContextValue => useContext(SearchCtx);
