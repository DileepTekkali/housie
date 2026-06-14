import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store.js';
import { joinRoom } from '../socket.js';
import { ScreenHeader } from './controls.jsx';

export default function JoinRoom() {
  const setView = useStore((s) => s.setView);
  const pushToast = useStore((s) => s.pushToast);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [viaLink, setViaLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('room');
    if (fromUrl) setCode(fromUrl.toUpperCase().slice(0, 6));
    const k = params.get('k');
    if (k) {
      try {
        // Correct order: first decode base64, then decode URL encoding
        const password = decodeURIComponent(atob(k));
        setPassword(password);
        setViaLink(true);
      } catch (e) {
        // If decoding fails, clear any partial data and fallback to manual join
        setPassword('');
        setCode('');
        setViaLink(false);
      }
    } else if (fromUrl) {
      // If we have a room code from URL but no password, still set viaLink to true
      // The user will just need to enter their name (no password needed)
      setViaLink(true);
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return pushToast('Enter the room code', 'error');
    if (!name.trim()) return pushToast('Enter your name', 'error');
    setBusy(true);
    const res = await joinRoom(code.trim().toUpperCase(), password, name.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Could not join room');
      pushToast(res.error || 'Could not join room', 'error');
    }
  }

  const ErrorBanner = () =>
    error ? <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-center text-sm font-medium text-rose-200">{error}</div> : null;

  if (viaLink) {
    return (
      <div>
        <ScreenHeader onBack={() => setView('landing', true)} />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h1 className="mb-1 text-center font-display text-3xl font-extrabold">Join room</h1>
          <p className="mb-6 text-center text-white/60">You’ve been invited — just enter your name to play.</p>

          <ErrorBanner />

          {/* Show the room code that was extracted from the URL */}
          {code && (
            <div className="mb-4 rounded-xl bg-black/25 p-3 text-center">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">Room code</div>
              <div className="font-display text-2xl font-bold tracking-widest text-gold-300">{code}</div>
            </div>
          )}

          {/* Show password if it was extracted from the URL */}
          {password && (
            <div className="mb-4 rounded-xl bg-black/25 p-3 text-center">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">Password</div>
              <div className="font-semibold text-gold-200">••••••••</div>
            </div>
          )}

          <form onSubmit={submit} className="glass space-y-4 p-6">
            <div>
              <label className="label">Your name</label>
              <input className="field" value={name} maxLength={24} placeholder="e.g. Shawnak" autoFocus onChange={(e) => setName(e.target.value)} />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} className="btn-gold w-full text-lg" disabled={busy}>
              {busy ? 'Joining…' : 'Join room'}
            </motion.button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader onBack={() => setView('landing', true)} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <h1 className="mb-1 text-center font-display text-3xl font-extrabold">Join a room</h1>
        <p className="mb-6 text-center text-white/60">Ask the host for the room code and password.</p>

        <ErrorBanner />

        <form onSubmit={submit} className="glass space-y-4 p-6">
          <div>
            <label className="label">Room code</label>
            <input
              className="field text-center font-display text-2xl font-bold uppercase tracking-[0.3em]"
              value={code}
              maxLength={6}
              placeholder="ABCDE"
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
          </div>
          <div>
            <label className="label">Your name</label>
            <input className="field" value={name} maxLength={24} placeholder="e.g. Shawnak" autoFocus onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="field" value={password} maxLength={32} placeholder="If the room has one" onChange={(e) => setPassword(e.target.value)} />
          </div>
          <motion.button whileTap={{ scale: 0.97 }} className="btn-gold w-full text-lg" disabled={busy}>
            {busy ? 'Joining…' : 'Join room'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
