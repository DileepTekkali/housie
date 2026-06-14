import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store.js';

function Toggle({ active, onClick, title, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition ${
        active ? 'bg-gold-400/20 text-gold-200 ring-1 ring-gold-400/40' : 'bg-white/5 text-white/50'
      }`}
    >
      {children}
    </button>
  );
}

export default function CalledNumber({ room }) {
  const prefs = useStore((s) => s.prefs);
  const setPref = useStore((s) => s.setPref);

  const current = room.currentNumber;
  const recent = room.called.slice(-9, -1).reverse(); // a few before the current one

  return (
    <div className="glass flex flex-col items-center p-4">
      <div className="flex w-full items-center justify-between text-sm text-white/55">
        <span className="uppercase tracking-[0.2em]">Current number</span>
        <span>{room.calledCount} / 90 called</span>
      </div>

      <div className="relative my-2 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
        <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-2xl" />
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current ?? 'none'}
            initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="ball relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full sm:h-24 sm:w-24"
          >
            <span className="font-display text-4xl font-extrabold text-ink sm:text-5xl">{current ?? '—'}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex min-h-[2rem] flex-wrap items-center justify-center gap-1.5">
        {recent.length === 0 && <span className="text-sm text-white/40">Numbers will appear here as they’re called</span>}
        {recent.map((n) => (
          <motion.span
            key={n}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/70"
          >
            {n}
          </motion.span>
        ))}
      </div>

      {/* Sound + voice controls live here, with the numbers they affect. */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5">
        <Toggle active={prefs.voice} onClick={() => setPref('voice', !prefs.voice)} title="Read each number aloud">
          🗣️ Voice
        </Toggle>
        <Toggle active={prefs.sound} onClick={() => setPref('sound', !prefs.sound)} title="Play a sound on each draw">
          🔊 Sound
        </Toggle>
      </div>
    </div>
  );
}
