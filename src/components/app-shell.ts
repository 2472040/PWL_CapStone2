// app-shell.ts — Loka shell barrel export file
// Maintains 100% backward compatibility for all imports.

export { ToastProvider, useToast } from './toast-context';
export { SearchProvider, useSearch } from './search-context';
export { StoreProvider, useStore } from './store-context';
export { themeTransition } from './theme-transition';
export { Drawer, Modal, DrawerContent, ModalContent } from './drawer-modal';
export {
  useRevealFallback,
  useStaggerReveal,
  useListStagger,
  useKeyboardShortcuts,
  SoundIntegration,
  MouseTracker,
  CursorEnabler,
  TiltEngine,
  CardHoverEngine,
  ListStaggerEngine,
} from './effects';
export { PageBar, PageHost, StatTile, MobileSidebarToggle, ScrollProgress } from './page-layout';
export { Sidebar } from './sidebar';

// Re-export shared static assets and utilities
export { LOKA as D } from '../data/app-data';
export { Icon, QR, downloadQR } from './app-icons';
export { CustomSelect } from './CustomSelect';
