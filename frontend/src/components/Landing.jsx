import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import Logo from './Logo.jsx';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function Landing() {
  const setView = useStore((s) => s.setView);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-1 flex-col">
      <motion.header variants={item} className="flex items-center justify-between">
        <Logo size="md" animate />
      </motion.header>

      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center sm:py-16">
        <motion.h1
          variants={item}
          className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl"
        >
          Gather your crew.
          <br />
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
            Call the numbers.
          </span>
        </motion.h1>

        
        <motion.div variants={item} className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button className="btn-gold flex-1 text-lg" onClick={() => setView('create', true)}>
            🎉 Create a room
          </button>
          <button className="btn-ghost flex-1 text-lg" onClick={() => setView('join', true)}>
            🚪 Join a room
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
