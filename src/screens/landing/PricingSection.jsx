import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ShinyButton from './ShinyButton.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function PricingSection() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cards = el.querySelectorAll('.pricing-card');
    
    gsap.fromTo(cards, 
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
        }
      }
    );
  }, []);

  return (
    <section ref={containerRef} id="pricing" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#6366F1]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-6">
            Investasi Terjangkau,<br/> <span className="text-[#A2A4FB]">Kontrol Penuh.</span>
          </h2>
          <p className="text-[#A1A1AA] text-lg">
            Pilih paket yang sesuai dengan ukuran dan kebutuhan operasional laboratorium institusi Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-center max-w-5xl mx-auto">
          
          {/* Basic Plan */}
          <div className="pricing-card w-full bg-[#09090B] border border-[#27272A] p-8 rounded-2xl flex flex-col h-full transition-all hover:border-[#6366F1]/30">
            <p className="text-[#A1A1AA] font-medium mb-4">Starter</p>
            <h3 className="text-4xl font-semibold text-white mb-2">Rp 0<span className="text-lg text-[#A1A1AA] font-normal">/bln</span></h3>
            <p className="text-[#71717A] text-sm mb-8">Untuk laboratorium kecil atau tahap uji coba awal.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['1 Laboratorium', 'Maks. 500 Item Inventaris', 'Manajemen Pengadaan Dasar', 'Dukungan Komunitas'].map((feat, i) => (
                <li key={i} className="flex items-center gap-3 text-[#D4D4D8]">
                  <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-4 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition-colors font-medium">
              Mulai Gratis
            </button>
          </div>

          {/* Pro Plan (Most Popular) */}
          <div className="pricing-card w-full bg-gradient-to-b from-[#18181B] to-[#09090B] border-2 border-[#6366F1] p-8 rounded-2xl relative shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col h-full scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#6366F1] text-white px-4 py-1 rounded-full text-xs font-medium tracking-wide">
              PALING POPULER
            </div>
            <p className="text-[#A2A4FB] font-medium mb-4">Professional</p>
            <h3 className="text-4xl font-semibold text-white mb-2">Rp 499rb<span className="text-lg text-[#A1A1AA] font-normal">/bln</span></h3>
            <p className="text-[#71717A] text-sm mb-8">Solusi lengkap untuk operasional laboratorium standar.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['Hingga 5 Laboratorium', 'Inventaris Tidak Terbatas', 'Approval Workflow Bertingkat', 'Log Maintenance Otomatis', 'Prioritas Dukungan Teknis', 'Export Laporan Lengkap'].map((feat, i) => (
                <li key={i} className="flex items-center gap-3 text-[#D4D4D8]">
                  <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <ShinyButton className="w-full py-3" onClick={() => window.location.href='#'}>
                Berlangganan Pro
              </ShinyButton>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-card w-full bg-[#09090B] border border-[#27272A] p-8 rounded-2xl flex flex-col h-full transition-all hover:border-[#6366F1]/30">
            <p className="text-[#A1A1AA] font-medium mb-4">Enterprise</p>
            <h3 className="text-4xl font-semibold text-white mb-2">Custom</h3>
            <p className="text-[#71717A] text-sm mb-8">Disesuaikan untuk institusi skala besar & universitas.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['Laboratorium Tidak Terbatas', 'Custom Integrasi API (SIAKAD)', 'SSO & Advanced Security', 'Dedicated Account Manager', 'SLA 99.9% Uptime'].map((feat, i) => (
                <li key={i} className="flex items-center gap-3 text-[#D4D4D8]">
                  <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-4 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition-colors font-medium">
              Hubungi Sales
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
