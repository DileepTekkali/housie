import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store.js';

const STYLES = {
  prize: 'border-gold-400/60 bg-gold-400/15 text-gold-300',
  error: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
  info: 'border-royal-400/50 bg-royal-500/15 text-royal-100',
};
const ICONS = { prize: '🏆', error: '⚠️', info: '🔔' };

export default function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md ${
              STYLES[t.type] || STYLES.info
            }`}
          >
            <span>{ICONS[t.type] || ICONS.info}</span>
            <span className="text-left">{t.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
