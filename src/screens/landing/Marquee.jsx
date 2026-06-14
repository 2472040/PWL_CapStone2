import React from 'react';

export default function Marquee() {
  const items = ['LOKA LAB', 'SMART INVENTORY', 'AUTOMATED WORKFLOW', 'VISION OS'];
  const all = [...items, ...items, ...items];
  return (
    <div
      className="au-marquee"
      style={{ padding: '80px 0', border: 'none', background: 'transparent' }}
    >
      <div className="au-marquee-track">
        {all.map((it, i) => (
          <span key={i} className="au-marquee-item-giant">
            {it} <span style={{ color: 'var(--cyan)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
