import type { AppAction } from '../store/store.types';

declare global {
  interface HTMLElement {
    _applied?: boolean;
  }
}

let _themeTransitioning = false;

export function themeTransition(
  dispatch: (action: AppAction) => void,
  newTheme: string,
  e?: React.MouseEvent | MouseEvent
) {
  // Prevent overlapping transitions
  if (_themeTransitioning) {
    dispatch({ type: 'SET_THEME', theme: newTheme });
    return;
  }

  // Reduced motion preference — skip animation
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dispatch({ type: 'SET_THEME', theme: newTheme });
    return;
  }

  // Get click origin coordinates
  const btn = e?.currentTarget || e?.target;
  let originX: number, originY: number;
  if (btn instanceof HTMLElement) {
    const rect = btn.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  } else {
    originX = window.innerWidth / 2;
    originY = window.innerHeight / 2;
  }

  // Calculate radius needed to cover the entire viewport
  const maxRadius =
    Math.ceil(
      Math.hypot(
        Math.max(originX, window.innerWidth - originX),
        Math.max(originY, window.innerHeight - originY)
      )
    ) + 20;

  const doc = document as any;
  if (doc.startViewTransition) {
    _themeTransitioning = true;
    document.documentElement.style.setProperty('--theme-x', `${originX}px`);
    document.documentElement.style.setProperty('--theme-y', `${originY}px`);
    document.documentElement.style.setProperty('--theme-r', `${maxRadius}px`);

    const transition = doc.startViewTransition(() => {
      dispatch({ type: 'SET_THEME', theme: newTheme });
    });

    transition.finished.finally(() => {
      _themeTransitioning = false;
    });
  } else {
    // Fallback: GSAP animation with a solid overlay
    const overlay = document.createElement('div') as HTMLElement & { _applied?: boolean };
    const bgColor = newTheme === 'dark' ? '#08070d' : '#f5f0e6';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      pointerEvents: 'none',
      background: bgColor,
      clipPath: `circle(0px at ${originX}px ${originY}px)`,
      willChange: 'clip-path',
    });
    document.body.appendChild(overlay);
    _themeTransitioning = true;

    if (window.gsap) {
      window.gsap.to(overlay, {
        clipPath: `circle(${maxRadius}px at ${originX}px ${originY}px)`,
        duration: 0.55,
        ease: 'power2.inOut',
        onUpdate: function (this: any) {
          if (this.progress() >= 0.35 && !overlay._applied) {
            overlay._applied = true;
            dispatch({ type: 'SET_THEME', theme: newTheme });
          }
        },
        onComplete: () => {
          if (!overlay._applied) dispatch({ type: 'SET_THEME', theme: newTheme });
          overlay.remove();
          _themeTransitioning = false;
        },
      });
    } else {
      overlay.style.transition = 'clip-path 0.55s cubic-bezier(0.4,0,0.2,1)';
      requestAnimationFrame(() => {
        overlay.style.clipPath = `circle(${maxRadius}px at ${originX}px ${originY}px)`;
      });
      setTimeout(() => dispatch({ type: 'SET_THEME', theme: newTheme }), 200);
      setTimeout(() => {
        overlay.remove();
        _themeTransitioning = false;
      }, 600);
    }
  }
}
