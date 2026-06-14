import { motion, AnimatePresence } from 'framer-motion';

const EVENT_ICON = { prize: '🏆', join: '👋', leave: '🚪', game: '🎮', ticket: '🎟️', host: '✨', bogey: '🚫' };

export default function WinnersFeed({ room }) {
  const events = [...(room.events || [])].reverse();

  return (
    <div className="glass p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Prizes & activity</h2>

      <div className="space-y-1.5">
        {room.prizes.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.label}</span>
              <span className={`chip ${p.open ? 'bg-white/10 text-white/55' : 'bg-emerald-500/20 text-emerald-200'}`}>
                {p.winners.length}/{p.qty}
              </span>
            </div>
            {p.winners.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.winners.map((w, i) => (
                  <span key={i} className="chip bg-gold-400/15 text-gold-200">
                    {p.qty > 1 ? `#${w.rank} ` : ''}
                    {w.name} · 🎟️{w.ticketNumber}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((e, i) => (
              <motion.div
                key={`${e.ts}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  e.type === 'prize' ? 'bg-gold-400/10 text-gold-100' : 'text-white/65'
                }`}
              >
                <span>{EVENT_ICON[e.type] || '•'}</span>
                <span>{e.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
