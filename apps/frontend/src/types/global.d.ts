import type { gsap as GsapType, ScrollTrigger as ScrollTriggerType } from 'gsap';
import type LenisType from 'lenis';

declare global {
  interface Window {
    gsap: typeof GsapType;
    ScrollTrigger: typeof ScrollTriggerType;
    Lenis: typeof LenisType;
    LokaSounds?: {
      play: (sound: string) => void;
      [key: string]: unknown;
    };
    showToast?: (message: string, kind?: 'ok' | 'warn' | 'info') => void;
    clearApiCache?: () => void;
    __lokaLogout?: () => void;
  }
}
