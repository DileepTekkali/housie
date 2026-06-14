import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket.js';
import { voice } from '../lib/voice.js';

// Plays a remote peer's audio stream. `muted` lets the listener silence everyone.
function RemoteAudio({ stream, muted }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play?.().catch(() => {});
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.muted = !!muted;
  }, [muted]);
  return <audio ref={ref} autoPlay playsInline />;
}

export default function VoiceChat({ room }) {
  // Initialise from the voice singleton so an ongoing call survives moving from
  // the lobby into the game (this component remounts, the call keeps running).
  const [active, setActive] = useState(voice.active);
  const [muted, setMuted] = useState(voice.muted);
  const [deafened, setDeafened] = useState(voice.deafened);
  const [streams, setStreams] = useState(() => Object.fromEntries(voice.streams));
  const [speaking, setSpeaking] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const myId = room.you?.playerId;
  const roster = room.voice || [];
  const rosterKey = roster.join(',');

  useEffect(() => {
    voice.on('stream', (pid, stream) => setStreams((s) => ({ ...s, [pid]: stream })));
    voice.on('peerClosed', (pid) =>
      setStreams((s) => {
        const copy = { ...s };
        delete copy[pid];
        return copy;
      }),
    );
    voice.on('speaking', (m) => setSpeaking(m));
    voice.on('state', () => {
      setActive(voice.active);
      setMuted(voice.muted);
    });
    // NOTE: we deliberately do NOT stop voice on unmount — leaving the room
    // (leaveRoom) stops it. This keeps the call alive across lobby → game.
  }, []);

  // keep peer connections matched to the room's voice roster
  useEffect(() => {
    if (voice.active) voice.reconcile(roster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, active]);

  async function join() {
    setError(null);
    setBusy(true);
    try {
      await voice.start(myId);
      socket.emit('voice:join');
      setActive(true);
    } catch {
      setError('Microphone access is needed for voice chat. Please allow it and try again.');
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    voice.stop();
    setActive(false);
    setStreams({});
  }

  const nameOf = (id) => room.players.find((p) => p.id === id)?.name || 'Player';

  return (
    <div className="glass p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">🎙️ Voice chat</h2>
        <span className="chip bg-white/10 text-white/60">{roster.length} in call</span>
      </div>

      {roster.length === 0 && !active ? (
        <p className="mb-3 text-sm text-white/50">No one’s talking yet. Be the first to hop on!</p>
      ) : (
        <div className="mb-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {roster.map((id) => {
              const isMe = id === myId;
              const isSpeaking = speaking[id];
              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 rounded-xl bg-black/20 px-3 py-1.5"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold transition ${
                      isSpeaking ? 'bg-emerald-400 text-ink ring-2 ring-emerald-300' : 'bg-royal-500/40 text-white'
                    }`}
                  >
                    {nameOf(id).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm">
                    {nameOf(id)} {isMe && <span className="text-gold-300">(you)</span>}
                  </span>
                  {isMe && muted ? <span title="Muted">🔇</span> : <span className={isSpeaking ? '' : 'opacity-30'}>🔊</span>}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {error && <p className="mb-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200">{error}</p>}

      {!active ? (
        <button className="btn-violet w-full" disabled={busy} onClick={join}>
          {busy ? 'Connecting…' : '🎧 Join voice'}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className={`btn min-w-[7.5rem] flex-1 ${muted ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setMuted(voice.toggleMute())}>
            {muted ? '🔇 Unmute me' : '🎙️ Mute me'}
          </button>
          <button
            className={`btn min-w-[7.5rem] flex-1 ${deafened ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              voice.deafened = !voice.deafened;
              setDeafened(voice.deafened);
            }}
            title="Silence everyone else"
          >
            {deafened ? '🔔 Unmute all' : '🔕 Mute all'}
          </button>
          <button className="btn-ghost min-w-[7.5rem] flex-1 text-rose-200" onClick={leave}>
            Leave voice
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] text-white/40">Peer-to-peer audio · best for small groups.</p>

      {/* remote audio outputs ("Mute all" silences them) */}
      {Object.entries(streams).map(([pid, stream]) => (
        <RemoteAudio key={pid} stream={stream} muted={deafened} />
      ))}
    </div>
  );
}
