// In-memory room registry. Rooms live only in this Map — they are never
// written to disk, so a server restart clears everything ("no database").
import { Room } from './room.js';
import { genRoomCode } from './util.js';

const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // hard cap: 3h since last activity
const EMPTY_GRACE_MS = 10 * 60 * 1000; // drop a room 10m after the last player leaves
const MAX_ROOMS = 2000; // safety backstop

const rooms = new Map();

export function createRoom({ password, settings, hostName }) {
  if (rooms.size >= MAX_ROOMS) {
    return { error: 'Server is at capacity, please try again later' };
  }
  let code;
  do {
    code = genRoomCode();
  } while (rooms.has(code));

  const room = new Room({ code, password, settings, hostName });
  rooms.set(code, room);
  return { room };
}

export function getRoom(code) {
  if (!code) return null;
  return rooms.get(String(code).toUpperCase().trim()) || null;
}

export function removeRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.destroy();
    rooms.delete(code);
  }
}

export function roomCount() {
  return rooms.size;
}

// Periodic cleanup of stale / abandoned rooms.
export function startJanitor() {
  return setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const idle = now - room.lastActivity;
      const empty = !room.hasConnectedPlayers();
      if (idle > ROOM_TTL_MS || (empty && idle > EMPTY_GRACE_MS)) {
        removeRoom(code);
      }
    }
  }, 60 * 1000).unref?.() ?? null;
}
