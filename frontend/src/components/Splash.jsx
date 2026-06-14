import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Full-screen intro that plays when the site opens, then fades away to reveal
// the landing page. Click anywhere to skip. Kept deliberately light: a few
// composited transform/opacity animations only — no per-letter 3D or animated
// large blurs.
const BALLS = [
  { n: 7, x: -150, color: '#2dd4bf', delay: 0.0 },
  { n: 24, x: -60, color: '#f472b6', delay: 0.1 },
  { n: 90, x: 40, color: '#fbbf24', delay: 0.2 },
  { n: 13, x: 140, color: '#38bdf8', delay: 0.3 },
];

export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0c2b31] via-[#082128] to-[#05161b]"
    >
      {/* soft static glow (fades in only — no blur animation) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
        className="absolute h-72 w-72 rounded-full bg-gold-400/25 blur-2xl sm:h-80 sm:w-80"
      />

      {/* bouncing balls */}
      <div className="relative mb-6 flex h-20 items-end justify-center sm:mb-8 sm:h-24">
        {BALLS.map((b) => (
          <motion.div
            key={b.n}
            initial={{ y: -170, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: b.delay, type: 'spring', stiffness: 200, damping: 14 }}
            className="absolute flex h-14 w-14 items-center justify-center rounded-full font-display text-xl font-extrabold text-ink shadow-ball sm:h-16 sm:w-16 sm:text-2xl"
            style={{ left: `calc(50% + ${b.x}px)`, marginLeft: '-1.75rem', background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${b.color} 72%)` }}
          >
            {b.n}
          </motion.div>
        ))}
      </div>

      {/* title — each word animates as a whole (light) */}
      <div className="relative z-10 select-none text-center leading-none">
        <motion.span
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="block font-display text-5xl font-extrabold text-white drop-shadow-[0_2px_16px_rgba(45,212,191,0.4)] sm:text-7xl"
        >
          Tekkali’s
        </motion.span>
        <motion.span
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-1 block bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text font-display text-6xl font-extrabold text-transparent drop-shadow-[0_4px_20px_rgba(245,158,11,0.4)] sm:mt-2 sm:text-8xl"
        >
          Tambola
        </motion.span>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-6 text-sm uppercase tracking-[0.4em] text-white/55 sm:text-base"
      >
        Live Online Housie
      </motion.p>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="absolute bottom-8 text-xs text-white/40"
      >
        tap to continue
      </motion.span>
    </motion.div>
  );
}
