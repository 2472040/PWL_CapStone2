import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { D, AuRise, ScrambleText } from './LandingUtils';

export default function ActivitySection() {
  const [items, setItems] = useState(D.activity);

  // Automatically cycle the list to create a "Live Feed" effect
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => {
        const newItems = [...prev];
        const lastItem = newItems.pop();
        if (lastItem) {
          newItems.unshift(lastItem);
        }
        return newItems;
      });
    }, 4000); // cycle every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="au-section" style={{ paddingTop: 0 }} id="activity-feed">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 items-start">
        <AuRise>
          <div className="au-section-tag">
            <ScrambleText text="— Aktivitas tim" />
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-6">
            Riwayat yang <em>jujur</em> — siapa, kapan, untuk apa.
          </h2>
          <p className="text-[#a1a1aa] text-lg">
            Setiap aksi tercatat dengan jejak yang bisa diaudit. Tidak ada perubahan diam-diam.
          </p>
        </AuRise>

        <div className="relative w-full h-[400px] overflow-hidden rounded-2xl bg-[#09090B] border border-[#27272A] p-6 shadow-2xl">
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {items.map((a) => (
                <motion.div
                  key={a.who + a.act + a.target}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6366F1] to-[#D69DDE] flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-lg">
                    {a.who[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">
                      <b className="text-white">{a.who}</b>{' '}
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70 mx-1">
                        {a.role}
                      </span>{' '}
                      {a.act} <span className="font-mono text-[#6366F1]">{a.target}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">{a.when}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Fade overlays for the list */}
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[#09090B] to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
