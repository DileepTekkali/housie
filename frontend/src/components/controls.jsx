import { useId } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo.jsx';
import { useStore } from '../store.js';

// A pill segmented control. Each instance gets a unique layoutId so multiple
// controls on the same page don't share (and fight over) one highlight pill.
export function Segmented({ options, value, onChange }) {
  const layoutId = useId();
  return (
    <div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition"
          >
            {active && (
              <motion.span
                layoutId={`seg-active-${layoutId}`}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-royal-400 to-royal-600"
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              />
            )}
            <span className={`relative z-10 ${active ? 'text-white' : 'text-white/55'}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, step = 1, suffix }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/25 px-2 py-1.5">
      <button type="button" className="h-9 w-9 rounded-xl bg-white/5 text-xl hover:bg-white/10" onClick={() => set(value - step)}>
        −
      </button>
      <div className="font-display text-lg font-bold">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-white/50">{suffix}</span>}
      </div>
      <button type="button" className="h-9 w-9 rounded-xl bg-white/5 text-xl hover:bg-white/10" onClick={() => set(value + step)}>
        +
      </button>
    </div>
  );
}

// Top bar with logo + a back action for sub-screens.
export function ScreenHeader({ onBack }) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <Logo size="sm" />
      {onBack && (
        <button className="btn-ghost px-4 py-2 text-sm" onClick={onBack}>
          ← Back
        </button>
      )}
    </header>
  );
}

export function useToast() {
  return useStore((s) => s.pushToast);
}
