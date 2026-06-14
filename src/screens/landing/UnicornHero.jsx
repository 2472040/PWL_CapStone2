import React from 'react';
import UnicornScene from 'unicornstudio-react';

export default function UnicornHero() {
  return (
    <div
      className="unicorn-hero-wrapper"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
        opacity: 0.6,
      }}
    >
      {/* 
        Ganti projectId dengan Embed ID dari project Unicorn Studio Anda.
        Pastikan production={true} saat deploy agar performa maksimal.
      */}
      <UnicornScene projectId="PLACEHOLDER_ID" width="100%" height="100%" production={false} />
    </div>
  );
}
