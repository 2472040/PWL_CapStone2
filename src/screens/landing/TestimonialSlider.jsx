import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { ScrambleText } from './LandingUtils.jsx';

const testimonialsData = [
  {
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop',
    quote:
      'Sistem pengadaan sebelumnya sangat berantakan. Dengan Loka Lab Suite, proses approval jauh lebih cepat dan transparan.',
    name: 'Dr. Sarah Amalia',
    role: 'Kepala Laboratorium Biologi',
    rating: 5,
  },
  {
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
    quote:
      'Stok BHP berkurang otomatis tiap kali ada praktikum. Saya tidak perlu lagi hitung manual tiap akhir bulan.',
    name: 'Budi Santoso',
    role: 'Staf Laboratorium Fisika',
    rating: 5,
  },
  {
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250&auto=format&fit=crop',
    quote:
      'Kartu aset digital dengan QR code sangat memudahkan pelacakan kondisi alat. Cukup scan, semua riwayat muncul.',
    name: 'Nadia Putri',
    role: 'Staf Administrasi',
    rating: 5,
  },
];

const StarRating = ({ rating, className }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
};

export default function TestimonialSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonialsData.length);
  }, []);

  const handlePrevious = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + testimonialsData.length) % testimonialsData.length
    );
  }, []);

  const currentTestimonial = testimonialsData[currentIndex];

  const slideVariants = {
    hidden: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    visible: {
      x: '0%',
      opacity: 1,
      transition: { type: 'spring', stiffness: 260, damping: 30 },
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      transition: { type: 'spring', stiffness: 260, damping: 30 },
    }),
  };

  return (
    <section className="py-24 relative overflow-hidden" id="testimonials">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="au-section-tag justify-center">
            <ScrambleText text="— Apa Kata Mereka" />
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Dipercaya oleh institusi top.
          </h2>
          <p className="text-[#a1a1aa] max-w-2xl mx-auto">
            Kami mendengarkan masalah di lapangan dan membangun solusi yang benar-benar menjawab
            kebutuhan staf laboratorium.
          </p>
        </div>

        <div className="relative w-full max-w-3xl mx-auto overflow-hidden rounded-2xl">
          <div className="relative min-h-[550px] md:min-h-[350px] flex items-center justify-center">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute w-full flex items-center justify-center"
              >
                <div className="flex flex-col md:flex-row items-center justify-center w-full p-4">
                  {/* Image Section */}
                  <div className="relative w-40 h-40 md:w-56 md:h-56 flex-shrink-0 mb-6 md:mb-0 md:mr-[-3rem] z-10">
                    <img
                      src={currentTestimonial.image}
                      alt={currentTestimonial.name}
                      className="w-full h-full object-cover rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10"
                    />
                  </div>

                  {/* Text & Controls Section */}
                  <div className="relative w-full bg-[#18181b] border border-[#27272a] text-white rounded-2xl shadow-xl pt-10 md:pt-6 pl-6 md:pl-20 pr-6 pb-6">
                    <Quote
                      className="absolute top-6 left-6 md:left-12 h-10 w-10 text-white/10"
                      aria-hidden="true"
                    />
                    <blockquote className="text-base md:text-lg mb-6 leading-relaxed text-gray-300">
                      "{currentTestimonial.quote}"
                    </blockquote>
                    <StarRating rating={currentTestimonial.rating} className="mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="pr-12">
                        <p className="font-bold text-lg text-white">{currentTestimonial.name}</p>
                        <p className="text-sm text-gray-400">{currentTestimonial.role}</p>
                      </div>
                      {/* Navigation Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrevious}
                          className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none border border-white/10"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleNext}
                          className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none border border-white/10"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonialsData.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${currentIndex === index ? 'w-6 bg-[#6366F1]' : 'w-2 bg-gray-700 hover:bg-gray-500'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
