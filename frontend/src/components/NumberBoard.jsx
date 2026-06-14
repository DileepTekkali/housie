import { motion } from 'framer-motion';

// The 1-90 master board. Called numbers light up; the latest one pulses.
export default function NumberBoard({ room }) {
  const called = new Set(room.called);
  const current = room.currentNumber;
  const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Board</h2>
        <span className="chip bg-white/10 text-white/60">{room.calledCount} called</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {numbers.map((n) => {
          const isCalled = called.has(n);
          const isCurrent = n === current;
          return (
            <motion.div
              key={n}
              animate={isCurrent ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`flex aspect-square items-center justify-center rounded-md text-[11px] font-bold sm:text-xs ${
                isCurrent
                  ? 'bg-gold-400 text-ink shadow-glow ring-2 ring-white/70'
                  : isCalled
                    ? 'bg-gold-500/80 text-ink'
                    : 'bg-black/25 text-white/35'
              }`}
            >
              {n}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
