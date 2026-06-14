import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { startGame, leaveRoom } from '../socket.js';
import { ScreenHeader } from './controls.jsx';
import PlayersList from './PlayersList.jsx';

function CopyButton({ label, value }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }
  return (
    <button onClick={copy} className="btn-ghost px-3 py-1.5 text-xs">
      {done ? '✓ Copied' : label}
    </button>
  );
}

function ShareButton({ link, code }) {
  const [done, setDone] = useState(false);
  async function share() {
    const data = { title: "Tekkali's Tambola", text: `Join my Tambola room — code ${code}`, url: link };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      /* user cancelled or unsupported — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(link);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* ignore */
    }
  }
  return (
    <button onClick={share} className="btn-gold px-4 py-1.5 text-xs">
      {done ? '✓ Link copied' : '🔗 Share invite link'}
    </button>
  );
}

export default function Lobby() {
  const room = useStore((s) => s.room);
  const setPref = useStore((s) => s.setPref);
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  if (!room) return null;
  const isHost = room.you?.isHost;
  // The host's link carries the password (encoded) so guests join in one tap,
  // without typing it. Non-hosts can only share the plain code link.
  const pw = room.password;
  // Generate invite link with properly encoded password
  const encodedPassword = pw ? btoa(encodeURIComponent(pw)) : '';
  const inviteLink = `${window.location.origin}?room=${room.code}${encodedPassword ? `&k=${encodedPassword}` : ''}`;

  async function start() {
    setPref('sound', true);
    setPref('voice', true);
    setBusy(true);
    const res = await startGame();
    setBusy(false);
    if (!res.ok) pushToast(res.error || 'Could not start', 'error');
  }

  return (
    <div>
      <ScreenHeader />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Left: room info + players */}
        <div className="space-y-5">
          <motion.section
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass overflow-hidden p-5 text-center"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Room code</div>
            <div className="my-1 font-display text-5xl font-extrabold tracking-[0.2em] text-gold-300">{room.code}</div>
            <div className="flex flex-wrap justify-center gap-2">
              <CopyButton label="Copy code" value={room.code} />
              <ShareButton link={inviteLink} code={room.code} />
            </div>
            {isHost && room.password ? (
              <>
                <div className="mt-3 rounded-xl bg-black/25 p-2 text-sm">
                  Password: <span className="font-bold text-gold-200">{room.password}</span>
                </div>
                <div className="mt-1.5 text-xs text-emerald-300/80">✓ The share link lets guests join without typing the password.</div>
              </>
            ) : isHost ? (
              <div className="mt-3 text-xs text-white/45">No password — anyone with the code or link can join</div>
            ) : null}
          </motion.section>

          <section className="glass p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Members joined</h2>
              <span className="chip bg-royal-500/30 text-white/85">{room.players.length} in room</span>
            </div>
            <PlayersList room={room} />
          </section>
        </div>

        {/* Right: prizes, leave + start */}
        <div className="space-y-5">
          <section className="glass p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Prizes in play</h2>
            <div className="flex flex-wrap gap-2">
              {room.prizes.map((p) => (
                <span key={p.id} className="chip border border-gold-400/40 bg-gold-400/10 text-gold-200">
                  🏆 {p.label}
                  {p.qty > 1 && <span className="ml-1 opacity-70">×{p.qty}</span>}
                </span>
              ))}
            </div>
          </section>

          <div className="space-y-2">
            <button className="btn-ghost w-full text-sm text-white/60" onClick={leaveRoom}>
              Leave room
            </button>
            {isHost ? (
              <>
                <motion.button whileTap={{ scale: 0.97 }} className="btn-gold w-full text-lg" disabled={busy} onClick={start}>
                  {busy ? 'Starting…' : '▶ Start the game'}
                </motion.button>
                <p className="text-center text-xs text-white/45">
                  {room.players.length} {room.players.length === 1 ? 'member' : 'members'} in the room — start whenever you’re ready.
                </p>
              </>
            ) : (
              <div className="glass-sm p-4 text-center text-white/70">🎟️ You’re in! Waiting for the host to start…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
