import { motion, AnimatePresence } from 'framer-motion';

export default function PlayersList({ room, compact = false }) {
  const players = room.players || [];
  const meId = room.you?.playerId;

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {players.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
              p.id === meId ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/10 bg-black/15'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-white/25'}`}
              title={p.connected ? 'Online' : 'Offline'}
            />
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal-500/40 font-display text-sm font-bold">
              {p.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate font-semibold">
                <span className="truncate">{p.name}</span>
                {p.id === meId && <span className="text-xs text-gold-300">(you)</span>}
                {p.isHost && <span className="chip bg-royal-500/40 text-white/80">Host</span>}
              </div>
              {!compact && (
                <div className="text-xs text-white/45">
                  {p.tickets.length ? `Ticket ${p.tickets.map((t) => `#${t}`).join(', ')}` : 'No ticket yet'}
                </div>
              )}
            </div>
            {compact && p.tickets.length > 0 && (
              <span className="chip bg-white/10 text-xs text-white/60">{p.tickets.length}🎟️</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
