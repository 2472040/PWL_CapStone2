import { create } from 'zustand';
import { initialAuthState, authReducer } from './authStore';
import { initialInventoryState, inventoryReducer } from './inventoryStore';
import { initialProcurementState, procurementReducer } from './procurementStore';
import { AppAction, AppStoreState, User, Room, DrawerPayload, ModalPayload } from './store.types';

export type { AppStoreState } from './store.types';

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
    // Auth & Prefs Slices
    ...initialAuthState,
    theme,
    accent,
    density,

    // Inventory Slice
    ...initialInventoryState,

    // Procurement Slice
    ...initialProcurementState,

    // Global / Admin States
    screen: 'dashboard',
    users: [] as User[],
    rooms: [] as Room[],
    drawer: null as DrawerPayload | null,
    modal: null as ModalPayload | null,
    mobileSidebarOpen: false,
  };
}

export const useAppStore = create<AppStoreState>((set) => ({
  ...getInitialState(),

  dispatch: (action: AppAction) =>
    set((state) => {
      // 1. Try Auth Slice Reducer
      const authUpdate = authReducer(state, action);
      if (authUpdate) return authUpdate;

      // 2. Try Inventory Slice Reducer
      const inventoryUpdate = inventoryReducer(state, action);
      if (inventoryUpdate) return inventoryUpdate;

      // 3. Try Procurement Slice Reducer
      const procurementUpdate = procurementReducer(state, action);
      if (procurementUpdate) return procurementUpdate;

      // 4. Handle Global / UI / Admin Actions
      switch (action.type) {
        case 'SET_SCREEN':
          return { screen: action.screen, mobileSidebarOpen: false };
        case 'OPEN_DRAWER':
          return { drawer: action.drawer };
        case 'CLOSE_DRAWER':
          return { drawer: null };
        case 'SET_USERS':
          return { users: action.users ?? [] };
        case 'SET_ROOMS':
          return { rooms: action.rooms ?? [] };
        case 'ADD_USER':
          return { users: action.user ? [action.user, ...state.users] : state.users };
        case 'TOGGLE_USER':
          return {
            users: state.users.map((u) =>
              u.id !== action.id ? u : { ...u, status: u.status === 'active' ? 'paused' : 'active' }
            ),
          };
        case 'ADD_ROOM':
          return { rooms: action.room ? [action.room, ...state.rooms] : state.rooms };
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
