import { motion } from 'framer-motion';

// Host toggles which prizes are in play and how many of each (for the prizes
// that support multiple winners, like Full House #1, #2 …).
export default function PrizePicker({ catalog, value, onChange, limits }) {
  const maxQty = limits?.prizeQty?.max ?? 10;

  function toggle(id) {
    onChange({ ...value, [id]: { ...value[id], enabled: !value[id]?.enabled } });
  }
  function setQty(id, qty) {
    const q = Math.max(1, Math.min(maxQty, qty));
    onChange({ ...value, [id]: { ...value[id], qty: q } });
  }

  return (
    <div className="space-y-2">
      {catalog.map((p) => {
        const sel = value[p.id] || { enabled: false, qty: 1 };
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
              sel.enabled ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/10 bg-black/15'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                sel.enabled ? 'border-gold-400 bg-gold-400 text-ink' : 'border-white/30'
              }`}
              aria-pressed={sel.enabled}
              aria-label={`Toggle ${p.label}`}
            >
              {sel.enabled && '✓'}
            </button>

            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{p.label}</div>
              <div className="truncate text-xs text-white/55">{p.hint}</div>
            </div>

            {p.multi && sel.enabled && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/50">winners</span>
                <div className="flex items-center rounded-xl bg-black/30">
                  <button
                    type="button"
                    className="px-2.5 py-1 text-lg leading-none text-white/70 hover:text-white"
                    onClick={() => setQty(p.id, sel.qty - 1)}
                  >
                    −
                  </button>
                  <motion.span key={sel.qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-6 text-center font-bold">
                    {sel.qty}
                  </motion.span>
                  <button
                    type="button"
                    className="px-2.5 py-1 text-lg leading-none text-white/70 hover:text-white"
                    onClick={() => setQty(p.id, sel.qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
