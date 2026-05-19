import React from 'react';

export default function DynamicGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 1. Base Dark Gradient */}
      <div className="absolute inset-0 bg-[#0B0A10]" />

      {/* 2. Animated Grid SVG Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)',
        }}
      />

      {/* 3. Glowing Orbs/Aurora Effects */}
      <div 
        className="absolute left-[20%] top-[10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, #8A2BE2 0%, rgba(138,43,226,0) 70%)',
          animation: 'pulse-slow 8s infinite alternate'
        }}
      />
      <div 
        className="absolute right-[20%] bottom-[10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, #00BFFF 0%, rgba(0,191,255,0) 70%)',
          animation: 'pulse-slow 10s infinite alternate-reverse'
        }}
      />

      <style>{`
        @keyframes pulse-slow {
          0% { transform: scale(1) translate(0, 0); opacity: 0.15; }
          100% { transform: scale(1.1) translate(20px, -20px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
