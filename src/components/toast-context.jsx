import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Icon } from './app-icons.jsx';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = (msg, kind = 'ok', icon) => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, msg, kind, icon }]);
    setTimeout(() => {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 350);
    }, 3200);
  };

  // Global access for non-React handlers (demo buttons)
  if (!window.showToast) window.showToast = push;

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host" role="region" aria-label="Notifikasi">
        {items.map((t) => (
          <Toast key={t.id} t={t} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function Toast({ t }) {
  const ref = useRef();
  useEffect(() => {
    if (window.gsap && ref.current) {
      window.gsap.from(ref.current, { x: 30, opacity: 0, duration: 0.35, ease: 'power3.out' });
    }
  }, []);
  return (
    <div
      ref={ref}
      className={`toast ${t.kind} ${t.exiting ? 'exiting' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="ico">
        <Icon
          name={t.icon || (t.kind === 'ok' ? 'check' : t.kind === 'warn' ? 'alert' : 'info')}
          size={13}
          strokeWidth={2.2}
        />
      </div>
      <div>{t.msg}</div>
    </div>
  );
}

export const useToast = () => useContext(ToastCtx);
