import { motion } from 'framer-motion';
import { useStore } from '../store.js';

// Striking is fully manual: tap any number to mark it (you can even pre-mark a
// number before it's called). For a prize claim, only numbers that are both
// struck AND actually called are counted by the server.
export default function Ticket({ ticket, room }) {
  const marks = useStore((s) => s.marks);
  const toggleMark = useStore((s) => s.toggleMark);

  const called = new Set(room.called);
  const myMarks = new Set(marks[ticket.number] || []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-royal-500/20 to-gold-500/10 p-2.5">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-display text-sm font-bold text-white/80">Ticket #{ticket.number}</span>
        <span className="text-[11px] text-white/45">Tap a number to strike it</span>
      </div>
      <div className="grid grid-cols-9 gap-1 rounded-xl bg-black/30 p-1.5">
        {ticket.grid.map((row, r) =>
          row.map((cell, c) => {
            if (cell == null) {
              return <div key={`${r}-${c}`} className="aspect-square rounded-md bg-white/5" />;
            }
            const isStruck = myMarks.has(cell);
            const isCurrent = cell === room.currentNumber;
            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                onClick={() => toggleMark(ticket.number, cell)}
                whileTap={{ scale: 0.85 }}
                animate={isStruck ? { scale: [1.18, 1] } : { scale: 1 }}
                className={`relative flex aspect-square items-center justify-center rounded-md font-display text-sm font-bold transition-colors sm:text-base ${
                  isStruck ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-ink' : 'bg-white/90 text-ink/90'
                } ${isCurrent && !isStruck ? 'ring-2 ring-gold-300' : ''}`}
              >
                {cell}
                {isStruck && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-ink/30"
                  />
                )}
              </motion.button>
            );
          }),
        )}
      </div>
    </div>
  );
}
