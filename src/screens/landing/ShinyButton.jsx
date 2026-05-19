import React from 'react';

export default function ShinyButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-[#170928] px-8 py-4 transition-all hover:scale-[1.02] active:scale-95 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#170928] via-[#1d0d33] to-[#170928] opacity-90" />
      <div className="absolute inset-[2px] rounded-lg bg-gradient-to-b from-[#654358]/40 via-[#1d0d33] to-[#2F0D64]/30 opacity-80" />
      <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-[#C787F6]/10 via-[#1d0d33] to-[#2A1736]/50" />
      
      <div className="absolute inset-[2px] rounded-lg shadow-[inset_0_0_15px_rgba(199,135,246,0.15)]" />
      
      <div className="relative flex items-center justify-center gap-2">
        <span className="bg-gradient-to-b from-[#D69DDE] to-[#B873F8] bg-clip-text text-lg font-medium tracking-tight text-transparent drop-shadow-[0_0_12px_rgba(199,135,246,0.4)]">
          {children}
        </span>
      </div>
      
      <div className="absolute inset-[2px] rounded-lg bg-gradient-to-r from-[#2A1736]/20 via-[#C787F6]/10 to-[#2A1736]/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  );
}
