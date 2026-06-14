import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { leaveRoom } from '../socket.js';
import { playDraw, announceNumber } from '../lib/sound.js';
import { bigCelebrate } from '../lib/confetti.js';
import Logo from './Logo.jsx';
import CalledNumber from './CalledNumber.jsx';
import NumberBoard from './NumberBoard.jsx';
import Ticket from './Ticket.jsx';
import HostControls from './HostControls.jsx';
import ClaimBar from './ClaimBar.jsx';
import WinnersFeed from './WinnersFeed.jsx';
import VoiceChat from './VoiceChat.jsx';

export default function Game() {
  const room = useStore((s) => s.room);
  const prefs = useStore((s) => s.prefs);

  const prevNum = useRef(undefined);
  const wasOver = useRef(false);

  // sound + voice when a new number is drawn
  useEffect(() => {
    if (!room) return;
    const n = room.currentNumber ?? null;
    if (prevNum.current === undefined) {
      prevNum.current = n; // skip the initial hydration
      return;
    }
    if (n != null && n !== prevNum.current) {
      if (prefs.sound) playDraw();
      if (prefs.voice) announceNumber(n);
    }
    prevNum.current = n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentNumber]);

  // celebrate when the game ends
  useEffect(() => {
    if (room?.status === 'over' && !wasOver.current) {
      wasOver.current = true;
      bigCelebrate();
    }
  }, [room?.status]);

  if (!room) return null;
  const isHost = room.you?.isHost;
  const myTickets = room.you?.tickets || [];
  const over = room.status === 'over';

  return (
    <div>
      {/* sticky header */}
      <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-white/10 bg-ink/60 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="chip bg-white/10 font-display text-base tracking-widest text-gold-300">{room.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-white/55 sm:inline">
            {room.players.length} {room.players.length === 1 ? 'player' : 'players'}
          </span>
          <button onClick={leaveRoom} className="rounded-xl bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:text-white">
            Leave
          </button>
        </div>
      </header>

      {over && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 rounded-3xl border border-gold-400/40 bg-gradient-to-br from-gold-400/15 to-rose-400/10 p-5 text-center"
        >
          <div className="font-display text-3xl font-extrabold">🏆 Leaderboard</div>
          <div className="mt-1 mb-4 text-white/70">Here’s who won what — well played, everyone!</div>

          <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 text-white/55">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Player</th>
                  <th className="px-3 py-2 font-medium">Prizes won</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const byTicket = {};
                  room.prizes.forEach((p) =>
                    p.winners.forEach((w) => {
                      const key = w.ticketNumber;
                      if (!byTicket[key]) byTicket[key] = { name: w.name, ticketNumber: w.ticketNumber, prizes: [] };
                      byTicket[key].prizes.push(p.qty > 1 ? `${p.label} #${w.rank}` : p.label);
                    }),
                  );
                  const board = Object.values(byTicket).sort((a, b) => b.prizes.length - a.prizes.length);
                  if (board.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-white/45">
                          No prizes were claimed.
                        </td>
                      </tr>
                    );
                  }
                  return board.map((row, i) => (
                    <tr key={row.ticketNumber} className="border-t border-white/10">
                      <td className="px-3 py-2 font-bold text-gold-300">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold">{row.name}</span>
                        <span className="text-white/40"> · 🎟️{row.ticketNumber}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.prizes.map((pl, j) => (
                            <span key={j} className="chip bg-gold-400/15 text-gold-200">
                              {pl}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <button className="btn-gold mt-5" onClick={leaveRoom}>
            Back to home
          </button>
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <CalledNumber room={room} />
          {isHost && <HostControls room={room} />}

          {myTickets.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">Your {myTickets.length > 1 ? 'tickets' : 'ticket'}</h2>
              <div className={`grid gap-4 ${myTickets.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {myTickets.map((t) => (
                  <Ticket key={t.number} ticket={t} room={room} />
                ))}
              </div>
            </section>
          )}

          <ClaimBar room={room} />
        </div>

        <aside className="space-y-5">
          <VoiceChat room={room} />
          <NumberBoard room={room} />
          <WinnersFeed room={room} />
        </aside>
      </div>
    </div>
  );
}
