import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { submitClaim } from '../socket.js';
import { isComplete } from '../lib/patterns.js';
import { celebrate } from '../lib/confetti.js';
import { playWin, playError } from '../lib/sound.js';

export default function ClaimBar({ room }) {
  const pushToast = useStore((s) => s.pushToast);
  const prefs = useStore((s) => s.prefs);
  const marks = useStore((s) => s.marks);
  const [busy, setBusy] = useState(null);

  const myTickets = room.you?.tickets || [];
  if (myTickets.length === 0) {
    return <div className="glass p-5 text-center text-white/60">You’re watching this round — no ticket.</div>;
  }

  const called = new Set(room.called);
  const live = room.status === 'running' || room.status === 'paused';
  const myNumbers = new Set(myTickets.map((t) => t.number));

  // The numbers that count for THIS player on a ticket: the ones they've struck
  // by tapping, and only if that number has actually been called.
  function struckSet(ticket) {
    return new Set((marks[ticket.number] || []).filter((n) => called.has(n)));
  }

  async function claim(prize) {
    // find one of my tickets that completes the pattern using only struck numbers
    let target = null;
    let struck = null;
    for (const t of myTickets) {
      const s = struckSet(t);
      if (isComplete(prize.id, t.grid, s)) {
        target = t;
        struck = s;
        break;
      }
    }
    if (!target) {
      if (prefs.sound) playError();
      pushToast(`Strike all your ${prize.label} numbers first (only called ones count)`, 'error');
      return;
    }
    setBusy(prize.id);
    const res = await submitClaim(target.number, prize.id, [...struck]);
    setBusy(null);
    if (res.ok && res.valid) {
      if (prefs.sound) playWin();
      celebrate();
      pushToast(`🎉 You won ${prize.label}!`, 'prize');
    } else {
      if (prefs.sound) playError();
      pushToast(res.reason || res.error || 'Claim not valid', 'error');
    }
  }

  return (
    <div className="glass p-5">
      <h2 className="mb-3 font-display text-lg font-bold">Claim a prize</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {room.prizes.map((p) => {
          const wonByMe = p.winners.some((w) => myNumbers.has(w.ticketNumber));
          const claimable = !wonByMe && p.open && live && myTickets.some((t) => isComplete(p.id, t.grid, struckSet(t)));
          const disabled = !claimable || busy === p.id;

          let labelText = p.label;
          let style = 'btn-ghost';
          if (wonByMe) {
            labelText = `✓ ${p.label}`;
            style = 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/40';
          } else if (!p.open) {
            labelText = `${p.label} — taken`;
          } else if (claimable) {
            style = 'btn-gold';
          }

          return (
            <motion.button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => claim(p)}
              animate={claimable ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={claimable ? { repeat: Infinity, duration: 1.4 } : {}}
              className={`btn px-3 py-2.5 text-sm ${style}`}
            >
              {busy === p.id ? '…' : labelText}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-white/45">
        A prize lights up only once you’ve struck the numbers it needs. Every claim is double-checked by the server.
      </p>
    </div>
  );
}
