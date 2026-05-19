// app-sounds.js — Micro-interaction sounds using Web Audio API (no external files)
// Respects prefers-reduced-motion (treated as reduced-sensory) and OS silence.

window.LokaSounds = (function() {
  let ctx = null;
  let enabled = true;

  // Check if audio context is allowed
  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        enabled = false;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Respect reduced motion
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) enabled = false;
  mq.addEventListener('change', (e) => { enabled = !e.matches; });

  // Oscillator beep
  function beep({ freq = 440, type = 'sine', duration = 0.06, vol = 0.04, fade = true }) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    if (fade) gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Click — subtle mechanical tick
  function click() {
    beep({ freq: 1200, type: 'triangle', duration: 0.04, vol: 0.03, fade: true });
  }

  // Hover — ultra subtle airy ping
  function hover() {
    beep({ freq: 800, type: 'sine', duration: 0.035, vol: 0.015, fade: true });
  }

  // Success — pleasant chime (two tones)
  function success() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    [523, 784].forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.03, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  // Error — gentle thud
  function error() {
    beep({ freq: 180, type: 'sawtooth', duration: 0.12, vol: 0.025, fade: true });
  }

  // Toggle — quick slide
  function toggle() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.08);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Drawer open — soft whoosh
  function drawer() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  return { click, hover, success, error, toggle, drawer };
