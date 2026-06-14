import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store.js';

// Shows a small banner only while the socket is disconnected.
export default function ConnectionBadge() {
  const connected = useStore((s) => s.connected);
  const inRoom = useStore((s) => !!s.room);

  return (
    <AnimatePresence>
      {!connected && inRoom && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-300/40 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 backdrop-blur"
        >
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          Reconnecting…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
