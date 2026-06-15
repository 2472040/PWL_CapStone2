import { create } from 'zustand';

function getInitialState() {
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

export const useAppStore = create((set) => ({
  ...getInitialState(),

  dispatch: (action) =>
    set((state) => {
      switch (action.type) {
        case 'SET_PENDING_REVIEW_COUNT':
          return { pendingReviewCount: action.count };
        case 'SET_ROLE':
          return { role: action.role, screen: 'dashboard', mobileSidebarOpen: false };
        case 'SET_USER':
          return { currentUser: action.user };
        case 'SET_SCREEN':
          return { screen: action.screen, mobileSidebarOpen: false };
        case 'OPEN_DRAWER':
          return { drawer: action.drawer };
        case 'CLOSE_DRAWER':
          return { drawer: null };
        case 'SET_DRAFTS':
          return { drafts: action.drafts };
        case 'SET_INVENTORY':
          return { inventory: action.inventory };
        case 'SET_USERS':
          return { users: action.users };
        case 'SET_ROOMS':
          return { rooms: action.rooms };
        case 'SET_APPROVAL':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : {
                    ...d,
                    items: d.items.map((it) =>
                      it.id !== action.itemId
                        ? it
                        : { ...it, approval: it.approval === action.value ? null : action.value }
                    ),
                  }
            ),
          };
        case 'APPROVE_ALL':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : {
                    ...d,
                    items: d.items.map((it) => ({ ...it, approval: it.approval || 'ok' })),
                  }
            ),
          };
        case 'FINALIZE_DRAFT':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code ? d : { ...d, status: 'finalized' }
            ),
          };
        case 'MARK_RECEIVED':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : {
                    ...d,
                    items: d.items.map((it) =>
                      it.id !== action.itemId
                        ? it
                        : {
                            ...it,
                            received: !it.received,
                            receivedDate: !it.received ? action.date : null,
                          }
                    ),
                  }
            ),
          };
        case 'COMPLETE_DRAFT':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code ? d : { ...d, status: 'completed' }
            ),
          };
        case 'REQUEST_REVISION':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : { ...d, status: 'revision', revision_notes: action.notes }
            ),
          };
        case 'ADD_DRAFT_ITEM':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code ? d : { ...d, items: [...d.items, action.item] }
            ),
          };
        case 'UPDATE_DRAFT_ITEM':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : {
                    ...d,
                    items: d.items.map((it) =>
                      it.id !== action.itemId ? it : { ...it, ...action.item }
                    ),
                  }
            ),
          };
        case 'REMOVE_DRAFT_ITEM':
          return {
            drafts: state.drafts.map((d) =>
              d.code !== action.code
                ? d
                : { ...d, items: d.items.filter((it) => it.id !== action.itemId) }
            ),
          };
        case 'NEW_DRAFT':
          return { drafts: [action.draft, ...state.drafts] };
        case 'BHP_DELTA':
          return {
            bhp: state.bhp.map((b) =>
              b.id !== action.id ? b : { ...b, stock: Math.max(0, b.stock + action.delta) }
            ),
          };
        case 'BHP_RESTOCK':
          return {
            bhp: state.bhp.map((b) =>
              b.id !== action.id ? b : { ...b, stock: b.stock + action.amount, lastIn: action.date }
            ),
          };
        case 'ADD_MAINT_LOG': {
          let bhp = state.bhp;
          action.log.bhp.forEach((b) => {
            bhp = bhp.map((x) =>
              x.id !== b.id ? x : { ...x, stock: Math.max(0, x.stock - b.qty) }
            );
          });
          const inv = state.inventory.map((x) =>
            x.code !== action.log.asset ? x : { ...x, cond: action.log.cond, last: 'baru saja' }
          );
          return { maintLog: [action.log, ...state.maintLog], bhp, inventory: inv };
        }
        case 'SET_MAINT_LOGS':
          return { maintLog: action.logs };
        case 'SET_BHP':
          return { bhp: action.bhp };
        case 'ADD_USER':
          return { users: [action.user, ...state.users] };
        case 'TOGGLE_USER':
          return {
            users: state.users.map((u) =>
              u.id !== action.id ? u : { ...u, status: u.status === 'active' ? 'paused' : 'active' }
            ),
          };
        case 'ADD_ROOM':
          return { rooms: [action.room, ...state.rooms] };
        case 'UPDATE_ASSET_LABEL':
          return {
            inventory: state.inventory.map((x) =>
              x.code !== action.code ? x : { ...x, ...action.patch }
            ),
          };
        case 'SET_THEME':
          try {
            localStorage.setItem('loka-theme', action.theme);
          } catch (e) {}
          document.documentElement.setAttribute('data-theme', action.theme);
          return { theme: action.theme };
        case 'SET_ACCENT':
          try {
            localStorage.setItem('loka-accent', action.accent);
          } catch (e) {}
          return { accent: action.accent };
        case 'SET_DENSITY':
          try {
            localStorage.setItem('loka-density', action.density);
          } catch (e) {}
          document.documentElement.setAttribute('data-density', action.density);
          return { density: action.density };
        case 'OPEN_MODAL':
          return { modal: action.modal };
        case 'CLOSE_MODAL':
          return { modal: null };
        case 'TOGGLE_MOBILE_SIDEBAR':
          return { mobileSidebarOpen: !state.mobileSidebarOpen };
        case 'CLOSE_MOBILE_SIDEBAR':
          return { mobileSidebarOpen: false };
        default:
          return {};
      }
    }),
}));
