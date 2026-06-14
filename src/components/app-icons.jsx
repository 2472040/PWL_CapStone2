// Shared icon system (Lucide-style inline SVGs)
import React from 'react';

function Icon({ name, size = 16, strokeWidth = 1.6, ...rest }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 21c0-3.5 2.5-6 6-6s6 2.5 6 6M16 4a3 3 0 010 6M19 21c0-2.5-1-4.5-3-5.5" />
      </>
    ),
    room: (
      <>
        <path d="M3 9.5L12 4l9 5.5M5 10v9h14v-9M9 19v-5h6v5" />
      </>
    ),
    log: (
      <>
        <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3v4h6V3M8 11h8M8 15h5" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M3 4h2l2.5 12h12l2.5-9H7" />
      </>
    ),
    box: (
      <>
        <path d="M21 8L12 3 3 8m18 0v8l-9 5-9-5V8m18 0l-9 5m0 0L3 8m9 5v8" />
      </>
    ),
    flask: (
      <>
        <path d="M9 3v6l-5 9a3 3 0 003 3h10a3 3 0 003-3l-5-9V3M9 3h6M7 14h10" />
      </>
    ),
    check: (
      <>
        <path d="M9 12l2 2 4-4m-9 6V6a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H8l-3 3v-3z" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2" />
      </>
    ),
    truck: (
      <>
        <rect x="1" y="6" width="14" height="11" rx="1.5" />
        <path d="M15 9h4l3 3v5h-7M5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </>
    ),
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="3" height="3" />
        <rect x="8" y="14" width="2" height="2" />
        <rect x="14" y="14" width="2" height="2" />
      </>
    ),
    wrench: (
      <>
        <path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 015.4-5.4L15 12l-2-2 1.7-3.7z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    minus: (
      <>
        <path d="M5 12h14" />
      </>
    ),
    x: (
      <>
        <path d="M18 6L6 18M6 6l12 12" />
      </>
    ),
    chev: (
      <>
        <path d="M6 9l6 6 6-6" />
      </>
    ),
    chevR: (
      <>
        <path d="M9 6l6 6-6 6" />
      </>
    ),
    chevL: (
      <>
        <path d="M15 6l-6 6 6 6" />
      </>
    ),
    chevUp: (
      <>
        <path d="M6 15l6-6 6 6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 5l7 7-7 7" />
      </>
    ),
    arrowL: (
      <>
        <path d="M19 12H5M11 5l-7 7 7 7" />
      </>
    ),
    arrowUp: (
      <>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </>
    ),
    arrowDown: (
      <>
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6 1.65 1.65 0 0010 3.09V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    ),
    filter: (
      <>
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </>
    ),
    play: (
      <>
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </>
    ),
    pin: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    ),
    alert: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    bolt: (
      <>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </>
    ),
    swap: (
      <>
        <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
      </>
    ),
    folder: (
      <>
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </>
    ),
    refresh: (
      <>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths[name] || <circle cx="12" cy="12" r="4" />}
    </svg>
  );
}

// High-fidelity standard QR code generator using open API
function QR({ seed, size = 7, cls = '' }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(seed)}`;

  return (
    <div
      className={`qr-img-wrap ${cls}`}
      style={{
        display: 'inline-block',
        background: '#fff',
        padding: 6,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <img
        src={qrUrl}
        alt={`QR ${seed}`}
        style={{ display: 'block', width: size * 10, height: size * 10, borderRadius: 4 }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

async function downloadQR(seed) {
  try {
    const res = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(seed)}`
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${seed}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('QR Code berhasil diunduh!', 'ok');
  } catch (err) {
    window.open(
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(seed)}`,
      '_blank'
    );
  }
}

export { Icon, QR, downloadQR };
