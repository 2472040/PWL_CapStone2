import React, { useState, useMemo, createContext, useContext } from 'react';

const SearchCtx = createContext({ query: '', setQuery: () => {} });

export function SearchProvider({ children }) {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

export const useSearch = () => useContext(SearchCtx);
