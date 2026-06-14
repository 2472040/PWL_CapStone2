import React, { createContext, useContext, useReducer } from 'react';

const StoreCtx = createContext(null);

function initStore() {
  let theme = 'dark';
  let accent = 'auto';
  let density = 'comfortable';
  try {
    theme = localStorage.getItem('loka-theme') || 'dark';
    accent = localStorage.getItem('loka-accent') || 'auto';
    density = localStorage.getItem('loka-density') || 'comfortable';
  } catch (e) {}
  return {
    role: 'kalab',
    screen: 'dashboard',
    theme,
    accent,
    density,
    currentUser: null,
    drafts: [],
    inventory: [],
    bhp: [],
    users: [],
    rooms: [],
    maintLog: [],
    drawer: null,
    modal: null,
    mobileSidebarOpen: false,
    pendingReviewCount: 0,
  };
}

function reducer(s, a) {
  switch (a.type) {
    case 'SET_PENDING_REVIEW_COUNT':
      return { ...s, pendingReviewCount: a.count };
    case 'SET_ROLE':
      return { ...s, role: a.role, screen: 'dashboard', mobileSidebarOpen: false };
    case 'SET_USER':
      return { ...s, currentUser: a.user };
    case 'SET_SCREEN':
      return { ...s, screen: a.screen, mobileSidebarOpen: false };
    case 'OPEN_DRAWER':
      return { ...s, drawer: a.drawer };
    case 'CLOSE_DRAWER':
      return { ...s, drawer: null };
    case 'SET_DRAFTS':
      return { ...s, drafts: a.drafts };
    case 'SET_INVENTORY':
      return { ...s, inventory: a.inventory };
    case 'SET_USERS':
      return { ...s, users: a.users };
    case 'SET_ROOMS':
      return { ...s, rooms: a.rooms };
    case 'SET_APPROVAL': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code
            ? d
            : {
                ...d,
                items: d.items.map((it) =>
                  it.id !== a.itemId
                    ? it
                    : { ...it, approval: it.approval === a.value ? null : a.value }
                ),
              }
        ),
      };
    }
    case 'APPROVE_ALL': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code
            ? d
            : {
                ...d,
                items: d.items.map((it) => ({ ...it, approval: it.approval || 'ok' })),
              }
        ),
      };
    }
    case 'FINALIZE_DRAFT': {
      return {
        ...s,
        drafts: s.drafts.map((d) => (d.code !== a.code ? d : { ...d, status: 'finalized' })),
      };
    }
    case 'MARK_RECEIVED': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code
            ? d
            : {
                ...d,
                items: d.items.map((it) =>
                  it.id !== a.itemId
                    ? it
                    : { ...it, received: !it.received, receivedDate: !it.received ? a.date : null }
                ),
              }
        ),
      };
    }
    case 'COMPLETE_DRAFT': {
      return {
        ...s,
        drafts: s.drafts.map((d) => (d.code !== a.code ? d : { ...d, status: 'completed' })),
      };
    }
    case 'REQUEST_REVISION': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code ? d : { ...d, status: 'revision', revision_notes: a.notes }
        ),
      };
    }
    case 'ADD_DRAFT_ITEM': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code ? d : { ...d, items: [...d.items, a.item] }
        ),
      };
    }
    case 'UPDATE_DRAFT_ITEM': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code
            ? d
            : {
                ...d,
                items: d.items.map((it) => (it.id !== a.itemId ? it : { ...it, ...a.item })),
              }
        ),
      };
    }
    case 'REMOVE_DRAFT_ITEM': {
      return {
        ...s,
        drafts: s.drafts.map((d) =>
          d.code !== a.code ? d : { ...d, items: d.items.filter((it) => it.id !== a.itemId) }
        ),
      };
    }
    case 'NEW_DRAFT': {
      return { ...s, drafts: [a.draft, ...s.drafts] };
    }
    case 'BHP_DELTA': {
      return {
        ...s,
        bhp: s.bhp.map((b) =>
          b.id !== a.id ? b : { ...b, stock: Math.max(0, b.stock + a.delta) }
        ),
      };
    }
    case 'BHP_RESTOCK': {
      return {
        ...s,
        bhp: s.bhp.map((b) =>
          b.id !== a.id ? b : { ...b, stock: b.stock + a.amount, lastIn: a.date }
        ),
      };
    }
    case 'ADD_MAINT_LOG': {
      let bhp = s.bhp;
      a.log.bhp.forEach((b) => {
        bhp = bhp.map((x) => (x.id !== b.id ? x : { ...x, stock: Math.max(0, x.stock - b.qty) }));
      });
      const inv = s.inventory.map((x) =>
        x.code !== a.log.asset ? x : { ...x, cond: a.log.cond, last: 'baru saja' }
      );
      return { ...s, maintLog: [a.log, ...s.maintLog], bhp, inventory: inv };
    }
    case 'SET_MAINT_LOGS':
      return { ...s, maintLog: a.logs };
    case 'SET_BHP':
      return { ...s, bhp: a.bhp };
    case 'ADD_USER':
      return { ...s, users: [a.user, ...s.users] };
    case 'TOGGLE_USER':
      return {
        ...s,
        users: s.users.map((u) =>
          u.id !== a.id ? u : { ...u, status: u.status === 'active' ? 'paused' : 'active' }
        ),
      };
    case 'ADD_ROOM':
      return { ...s, rooms: [a.room, ...s.rooms] };
    case 'UPDATE_ASSET_LABEL': {
      return {
        ...s,
        inventory: s.inventory.map((x) => (x.code !== a.code ? x : { ...x, ...a.patch })),
      };
    }
    case 'SET_THEME': {
      try {
        localStorage.setItem('loka-theme', a.theme);
      } catch (e) {}
      document.documentElement.setAttribute('data-theme', a.theme);
      return { ...s, theme: a.theme };
    }
    case 'SET_ACCENT': {
      try {
        localStorage.setItem('loka-accent', a.accent);
      } catch (e) {}
      return { ...s, accent: a.accent };
    }
    case 'SET_DENSITY': {
      try {
        localStorage.setItem('loka-density', a.density);
      } catch (e) {}
      document.documentElement.setAttribute('data-density', a.density);
      return { ...s, density: a.density };
    }
    case 'OPEN_MODAL':
      return { ...s, modal: a.modal };
    case 'CLOSE_MODAL':
      return { ...s, modal: null };
    case 'TOGGLE_MOBILE_SIDEBAR':
      return { ...s, mobileSidebarOpen: !s.mobileSidebarOpen };
    case 'CLOSE_MOBILE_SIDEBAR':
      return { ...s, mobileSidebarOpen: false };
    default:
      return s;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initStore);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
