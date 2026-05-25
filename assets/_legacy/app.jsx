// Mounts the design canvas with two artboards: Aurora + Lumen.
const { useState, useEffect } = React;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="concepts" title="Loka — Lab Inventory" subtitle="Dua arah visual untuk dibandingkan · dark refined, interaktif. Klik tombol di kanan atas tiap artboard untuk fokus penuh.">
        <DCArtboard id="aurora" label="A · Aurora — visionOS glass + glow" width={1440} height={900}>
          <window.AuroraSite />
        </DCArtboard>
        <DCArtboard id="lumen" label="B · Lumen — blueprint, mono accent" width={1440} height={900}>
          {window.LumenSite ? <window.LumenSite /> : <div style={{ padding: 40, color: '#666', fontFamily: 'system-ui' }}>Loading Lumen…</div>}
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
