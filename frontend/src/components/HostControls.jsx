import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { callNumber, setCalling, pauseGame, resumeGame, endGame, restartGame, beginCalling } from '../socket.js';
import { Segmented, Stepper } from './controls.jsx';

export default function HostControls({ room }) {
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);
  const status = room.status;
  const started = room.callingStarted;
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
      <div className="glass space-y-3 p-4 text-center">
        <h2 className="font-display text-lg font-bold text-white">Game over</h2>
        <p className="text-sm text-white/65">Start a fresh round with the same players, or close the room.</p>
        <motion.button whileTap={{ scale: 0.97 }} className="btn-gold w-full" disabled={busy} onClick={() => run(restartGame)}>
          ▶ Start new game
        </motion.button>
      </div>
    );
  }

  return (
    <div className="glass space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Host controls</h2>
        <span
          className={`chip ${
            !started ? 'bg-white/10 text-white/60' : status === 'running' ? 'bg-emerald-500/25 text-emerald-200' : 'bg-amber-500/25 text-amber-200'
          }`}
        >
          {!started ? 'Ready' : status === 'running' ? '● Live' : 'Paused'}
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

      {!started ? (
        // Number calling hasn't begun — pressing this starts it (no delay).
        <div className="space-y-1">
          <motion.button whileTap={{ scale: 0.96 }} disabled={busy} onClick={() => run(beginCalling)} className="btn-gold w-full text-lg">
            ▶ Start game
          </motion.button>
          <p className="text-center text-xs text-white/45">Numbers begin only when you press this.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
