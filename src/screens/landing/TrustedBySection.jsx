import React from 'react';

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="au-trust-icon">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="currentColor" className="au-trust-icon">
    <rect x="1" y="1" width="10" height="10"/>
    <rect x="12" y="1" width="10" height="10"/>
    <rect x="1" y="12" width="10" height="10"/>
    <rect x="12" y="12" width="10" height="10"/>
  </svg>
);

const VercelIcon = () => (
  <svg viewBox="0 0 256 222" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="au-trust-icon">
    <path d="m128 0 128 221.705H0z"/>
  </svg>
);

const ReactIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.232 23 20.463" fill="currentColor" className="au-trust-icon">
    <circle r="2.05"/>
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2"/>
      <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
      <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
    </g>
  </svg>
);

const NodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="au-trust-icon">
    <path d="M11.998 24c-.321 0-.641-.084-.922-.247l-2.936-1.737c-.438-.245-.224-.332-.08-.383.585-.203.703-.25 1.328-.604.065-.037.15-.023.218.017l2.256 1.339a.29.29 0 00.272 0l8.795-5.076a.277.277 0 00.134-.238V6.921a.28.28 0 00-.137-.242L12.135 1.606a.27.27 0 00-.27 0L3.078 6.68a.281.281 0 00-.139.24v10.15c0 .099.053.19.138.236l2.409 1.392c1.307.653 2.108-.116 2.108-.89V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.112.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675A1.857 1.857 0 011.44 17.07V6.921c0-.68.363-1.313.955-1.652L11.19.193a1.872 1.872 0 011.833 0l8.794 5.076c.592.339.955.971.955 1.652v10.15a1.856 1.856 0 01-.955 1.652l-8.794 5.076a1.825 1.825 0 01-.926.2z"/>
  </svg>
);

const partners = [
  { icon: GithubIcon, name: 'GitHub' },
  { icon: MicrosoftIcon, name: 'Microsoft' },
  { icon: VercelIcon, name: 'Vercel' },
  { icon: ReactIcon, name: 'React' },
  { icon: NodeIcon, name: 'Node.js' },
];

export default function TrustedBySection() {
  return (
    <section className="au-trusted" id="trusted-by-section">
      <p className="au-trusted-label">Teknologi yang mendukung Loka Lab Suite</p>
      <div className="au-trusted-grid">
        {partners.map((p, i) => (
          <div key={p.name} className="au-trusted-item" style={{ animationDelay: `${i * 0.1}s` }}>
            <p.icon />
            <span className="au-trusted-name">{p.name}</span>
          </div>
        ))}
      </div>
      <div className="au-trusted-divider" />
    </section>
  );
}
