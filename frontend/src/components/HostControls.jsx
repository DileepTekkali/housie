import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { callNumber, setCalling, pauseGame, resumeGame, endGame } from '../socket.js';
import { Segmented, Stepper } from './controls.jsx';

export default function HostControls({ room }) {
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);
  const status = room.status;
  const mode = room.settings.calling;
  const seconds = Math.round(room.settings.autoIntervalMs / 1000);

  async function run(fn) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res && !res.ok) pushToast(res.error || 'Action failed', 'error');
  }

  if (status === 'over') {
    return (
      <div className="glass p-5 text-center text-white/70">
        <h2 className="mb-1 font-display text-lg font-bold text-white">Game over</h2>
        The board is closed. Start a new room to play again.
      </div>
    );
  }

  return (
    <div className="glass space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Host controls</h2>
        <span className={`chip ${status === 'running' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-amber-500/25 text-amber-200'}`}>
          {status === 'running' ? '● Live' : 'Paused'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="label mb-0 shrink-0">Calling</div>
        <div className="flex-1">
          <Segmented
            value={mode}
            onChange={(m) => run(() => setCalling(m, room.settings.autoIntervalMs))}
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'auto', label: 'Automatic' },
            ]}
          />
        </div>
      </div>

      {mode === 'auto' ? (
        <div>
          <div className="label">Speed — {seconds}s between numbers</div>
          <Stepper value={seconds} onChange={(s) => run(() => setCalling('auto', s * 1000))} min={2} max={15} suffix="s" />
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={busy || status !== 'running'}
          onClick={() => run(callNumber)}
          className="btn-gold w-full"
        >
          🎲 Call next number
        </motion.button>
      )}

      <div className="flex gap-2">
        {status === 'running' ? (
          <button className="btn-ghost flex-1" disabled={busy} onClick={() => run(pauseGame)}>
            ⏸ Pause
          </button>
        ) : (
          <button className="btn-violet flex-1" disabled={busy} onClick={() => run(resumeGame)}>
            ▶ Resume
          </button>
        )}
        <button
          className="btn-ghost flex-1 text-rose-200"
          disabled={busy}
          onClick={() => {
            if (window.confirm('End the game for everyone?')) run(endGame);
          }}
        >
          ⏹ End game
        </button>
      </div>
    </div>
  );
}
