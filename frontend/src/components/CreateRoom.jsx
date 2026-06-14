import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { createRoom } from '../socket.js';
import { ScreenHeader } from './controls.jsx';
import PrizePicker from './PrizePicker.jsx';

// Used until /api/config resolves; mirrors the server catalogue.
const FALLBACK_CATALOG = [
  { id: 'earlyFive', label: 'Early Five (Jaldi 5)', hint: 'First to mark any 5 numbers', multi: true },
  { id: 'topLine', label: 'Top Line', hint: 'All numbers in the first row', multi: true },
  { id: 'middleLine', label: 'Middle Line', hint: 'All numbers in the middle row', multi: true },
  { id: 'bottomLine', label: 'Bottom Line', hint: 'All numbers in the last row', multi: true },
  { id: 'fullHouse', label: 'Full House', hint: 'Every number on the ticket', multi: true },
];
const DEFAULT_ON = new Set(['earlyFive', 'topLine', 'middleLine', 'bottomLine', 'fullHouse']);

export default function CreateRoom() {
  const setView = useStore((s) => s.setView);
  const pushToast = useStore((s) => s.pushToast);
  const config = useStore((s) => s.config);

  const catalog = config?.prizes || FALLBACK_CATALOG;
  const limits = config?.limits;

  const [hostName, setHostName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [prizes, setPrizes] = useState(() => {
    const init = {};
    FALLBACK_CATALOG.forEach((p) => {
      init[p.id] = { enabled: DEFAULT_ON.has(p.id), qty: 1 };
    });
    return init;
  });

  const enabledCount = useMemo(() => Object.values(prizes).filter((p) => p.enabled).length, [prizes]);

  async function submit(e) {
    e.preventDefault();
    if (!hostName.trim()) return pushToast('Please enter your name', 'error');
    const chosen = catalog.filter((p) => prizes[p.id]?.enabled).map((p) => ({ id: p.id, qty: prizes[p.id].qty || 1 }));
    if (chosen.length === 0) return pushToast('Pick at least one prize', 'error');

    setBusy(true);
    // Tickets are auto-allocated and number-calling is controlled in-game, so
    // we only send the prize selection here.
    const res = await createRoom(hostName.trim(), password, { prizes: chosen });
    setBusy(false);
    if (!res.ok) pushToast(res.error || 'Could not create room', 'error');
    // on success the room:state push routes us to the lobby
  }

  return (
    <div>
      <ScreenHeader onBack={() => setView('landing', true)} />
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-1 font-display text-3xl font-extrabold">Create your room</h1>
        <p className="mb-6 text-white/60">Tickets are handed out automatically — just pick your prizes and go.</p>

        <form onSubmit={submit} className="space-y-5">
          <section className="glass p-5">
            <h2 className="mb-3 font-display text-lg font-bold">The basics</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Your name (host)</label>
                <input className="field" value={hostName} maxLength={24} placeholder="e.g. Priya" onChange={(e) => setHostName(e.target.value)} />
              </div>
              <div>
                <label className="label">Room password (optional)</label>
                <input className="field" value={password} maxLength={32} placeholder="Leave blank for no password" onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="glass p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Prizes</h2>
              <span className="chip bg-white/10 text-white/70">{enabledCount} selected</span>
            </div>
            <p className="mb-3 text-sm text-white/55">Choose which prizes are in play and how many winners each can have.</p>
            <PrizePicker catalog={catalog} value={prizes} onChange={setPrizes} limits={limits} />
          </section>

          <motion.button whileTap={{ scale: 0.97 }} className="btn-gold w-full text-lg" disabled={busy}>
            {busy ? 'Creating…' : 'Create room & open lobby'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
