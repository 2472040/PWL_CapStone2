import { User, UserRole, AppAction } from './store.types';

export interface AuthState {
  role: UserRole;
  currentUser: User | null;
  pendingReviewCount: number;
  theme: string;
  accent: string;
  density: string;
}

export const initialAuthState: AuthState = {
  role: 'kalab',
  currentUser: null,
  pendingReviewCount: 0,
  theme: 'dark',
  accent: 'auto',
  density: 'comfortable',
};

export const authReducer = (state: Record<string, any>, action: AppAction): Record<string, any> | null => {
  switch (action.type) {
    case 'SET_ROLE':
      return { role: action.role, screen: 'dashboard', mobileSidebarOpen: false };
    case 'SET_USER':
      return { currentUser: action.user };
    case 'SET_PENDING_REVIEW_COUNT':
      return { pendingReviewCount: action.count };
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
    default:
      return null;
  }
};
