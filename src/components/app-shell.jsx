// app-shell.jsx — Loka shell barrel export file (decomposed into modular files)
// Maintains 100% backward compatibility for all imports.

export { ToastProvider, useToast } from './toast-context.jsx';
export { SearchProvider, useSearch } from './search-context.jsx';
export { StoreProvider, useStore } from './store-context.jsx';
export { themeTransition } from './theme-transition.jsx';
export { Drawer, Modal, DrawerContent, ModalContent } from './drawer-modal.jsx';
export { useRevealFallback, useKeyboardShortcuts, SoundIntegration, MouseTracker, CursorEnabler, TiltEngine, CardHoverEngine } from './effects.jsx';
export { PageBar, PageHost, StatTile, MobileSidebarToggle, ScrollProgress } from './page-layout.jsx';
export { Sidebar } from './sidebar.jsx';

// Re-export shared static assets and utilities
export { LOKA as D } from '../data/app-data.jsx';
export { Icon, QR, downloadQR } from './app-icons.jsx';
