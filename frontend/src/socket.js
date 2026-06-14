import { io } from 'socket.io-client';
import { useStore, loadSession } from './store.js';

// Dev connects straight to the Node server; production uses VITE_SERVER_URL
// (set in Vercel dashboard) or falls back to same origin.
export const SERVER_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : (import.meta.env.VITE_SERVER_URL || '');

export const socket = io(import.meta.env.DEV ? SERVER_URL : (SERVER_URL || undefined), {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  // Keep trying forever through slow / dropped connections.
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 4000,
  timeout: 12000,
});

// Promisified emit with ack + timeout.
function request(event, payload) {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: 'Network timeout — please retry' });
      else resolve(res || { ok: false, error: 'No response from server' });
    });
  });
}

// --- view routing from authoritative state ---
function viewForStatus(status) {
  if (status === 'lobby') return 'lobby';
  if (status === 'running' || status === 'paused' || status === 'over') return 'game';
  return 'landing';
}

let seenEventTs = 0;

function applyState(state) {
  const store = useStore.getState();
  store.setRoom(state);
  store.hydrateMarks(state.code); // restore this player's strikes after a refresh
  const desired = viewForStatus(state.status);
  if (store.view !== desired && desired !== 'landing') store.setView(desired);

  // surface notable events as toasts (prizes + game flow)
  const fresh = (state.events || []).filter((e) => e.ts > seenEventTs);
  if (fresh.length) seenEventTs = Math.max(...fresh.map((e) => e.ts));
  // skip the very first hydration to avoid a flood. Prize wins are announced
  // via the dedicated 'prize:won' event (so the winner can be excluded), so
  // here we only surface game-flow events.
  if (seenEventTs && store.room) {
    for (const e of fresh) {
      if (e.type === 'game') store.pushToast(e.text, 'info');
    }
  }
}

// Everyone is told when a prize is claimed — except the winner, who already
// gets their own celebration from the claim response.
socket.on('prize:won', (data) => {
  const store = useStore.getState();
  const myId = store.session?.playerId || store.room?.you?.playerId;
  if (data.playerId === myId) return;
  const rank = data.rank > 1 ? ` (#${data.rank})` : '';
  store.pushToast(`🏆 ${data.name} won ${data.label}${rank}!`, 'prize');
});

socket.on('room:state', (state) => {
  if (!seenEventTs && state.events?.length) {
    seenEventTs = Math.max(...state.events.map((e) => e.ts));
  }
  applyState(state);
});

socket.on('connect', async () => {
  useStore.getState().setConnected(true);
  // auto-rejoin after a refresh or reconnect
  const store = useStore.getState();
  const session = store.session || loadSession();
  if (session && session.code) {
    const res = await request('room:rejoin', session);
    if (res.ok) {
      store.setSession({ code: res.code, playerId: res.playerId, token: res.token });
      applyState(res.state);
    } else if (res.gone) {
      store.reset();
      store.pushToast('That room is no longer available', 'error');
    }
  }
});

socket.on('disconnect', () => {
  useStore.getState().setConnected(false);
});

// --- public API used by components ---

export async function createRoom(hostName, password, settings) {
  const res = await request('room:create', { hostName, password, settings });
  if (res.ok) {
    const store = useStore.getState();
    store.setSession({ code: res.code, playerId: res.playerId, token: res.token });
    applyState(res.state);
  }
  return res;
}

export async function joinRoom(code, password, name) {
  const res = await request('room:join', { code, password, name });
  if (res.ok) {
    const store = useStore.getState();
    store.setSession({ code: res.code, playerId: res.playerId, token: res.token });
    applyState(res.state);
  }
  return res;
}

export const startGame = () => request('host:start', {});
export const callNumber = () => request('host:call', {});
export const setCalling = (mode, intervalMs) => request('host:setCalling', { mode, intervalMs });
export const pauseGame = () => request('host:pause', {});
export const resumeGame = () => request('host:resume', {});
export const endGame = () => request('host:endGame', {});
export const submitClaim = (ticketNumber, prizeId, marked) =>
  request('claim:submit', { ticketNumber, prizeId, marked });

export async function leaveRoom() {
  // End the voice call (mic + peer connections) when actually leaving the room.
  // Dynamic import avoids a static import cycle (voice.js imports this module).
  try {
    const { voice } = await import('./lib/voice.js');
    voice.stop();
  } catch {
    /* ignore */
  }
  await request('room:leave', {});
  useStore.getState().reset();
}

export async function fetchConfig() {
  try {
    const res = await fetch(`${SERVER_URL}/api/config`);
    if (res.ok) useStore.getState().setConfig(await res.json());
  } catch {
    /* config endpoint optional */
  }
}
