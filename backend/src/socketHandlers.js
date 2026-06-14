// Wires Socket.IO events to room logic. All actions use ack callbacks for
// request/response; shared state is pushed to everyone via 'room:state'.
import { createRoom, getRoom, removeRoom } from './roomStore.js';
import { PRIZE_CATALOG, PRIZE_BY_ID, LIMITS, defaultPrizes } from './gameConfig.js';
import { sanitizeName, clamp } from './util.js';

function reply(cb, payload) {
  if (typeof cb === 'function') cb(payload);
}

function normalizePrizes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) raw = defaultPrizes();
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || !PRIZE_BY_ID[item.id] || seen.has(item.id)) continue;
    seen.add(item.id);
    const meta = PRIZE_BY_ID[item.id];
    let qty = Math.round(clamp(item.qty ?? 1, LIMITS.prizeQty.min, LIMITS.prizeQty.max));
    if (!meta.multi) qty = 1;
    out.push({ id: item.id, qty });
  }
  // keep the catalogue order for a tidy display
  out.sort((a, b) => PRIZE_CATALOG.findIndex((p) => p.id === a.id) - PRIZE_CATALOG.findIndex((p) => p.id === b.id));
  return out.length ? out : defaultPrizes();
}

function normalizeSettings(raw = {}) {
  return {
    // Tickets are always auto-allocated (one per player) and number-calling
    // starts manual; the host can switch to automatic in-game. These are no
    // longer chosen on the create screen.
    ticketAssignment: 'auto',
    maxTicketsPerPlayer: 1,
    calling: raw.calling === 'manual' ? 'manual' : 'auto',
    autoIntervalMs: Math.round(
      clamp(raw.autoIntervalMs ?? LIMITS.autoIntervalMs.default, LIMITS.autoIntervalMs.min, LIMITS.autoIntervalMs.max),
    ),
    prizes: normalizePrizes(raw.prizes),
  };
}

export function registerHandlers(io) {
  // playerId -> socket, so we can relay WebRTC voice signals to one peer.
  const playerSocket = new Map();

  async function broadcastRoom(room) {
    if (!room) return;
    const sockets = await io.in(room.code).fetchSockets();
    for (const s of sockets) {
      s.emit('room:state', room.publicState(s.data.playerId));
    }
  }

  function ctx(socket) {
    const code = socket.data.roomCode;
    if (!code) return {};
    const room = getRoom(code);
    if (!room) return {};
    const player = room.getPlayer(socket.data.playerId);
    return { room, player };
  }

  function requireHost(socket) {
    const { room, player } = ctx(socket);
    if (!room || !player) return { error: 'You are not in a room' };
    if (!player.isHost) return { error: 'Only the host can do that' };
    return { room, player };
  }

  io.on('connection', (socket) => {
    socket.data = { roomCode: null, playerId: null };

    socket.on('room:create', (payload = {}, cb) => {
      const hostName = sanitizeName(payload.hostName, 'Host');
      const password = String(payload.password ?? '').slice(0, LIMITS.passwordMax);
      const settings = normalizeSettings(payload.settings);

      const { room, error } = createRoom({ password, settings, hostName });
      if (error) return reply(cb, { ok: false, error });

      room.broadcast = () => broadcastRoom(room);
      socket.data = { roomCode: room.code, playerId: room.host.id };
      socket.join(room.code);
      playerSocket.set(room.host.id, socket);

      reply(cb, {
        ok: true,
        code: room.code,
        playerId: room.host.id,
        token: room.host.token,
        state: room.publicState(room.host.id),
      });
    });

    socket.on('room:join', (payload = {}, cb) => {
      const room = getRoom(payload.code);
      if (!room) return reply(cb, { ok: false, error: 'Room not found — check the code' });
      // No new players once the game has started — only existing players can
      // reconnect (via room:rejoin).
      if (room.status !== 'lobby') {
        return reply(cb, { ok: false, error: 'This room has already started — you can’t join now' });
      }
      if (room.password && String(payload.password ?? '') !== room.password) {
        return reply(cb, { ok: false, error: 'Incorrect password' });
      }
      const name = sanitizeName(payload.name, 'Player');
      const player = room.addPlayer({ name });
      socket.data = { roomCode: room.code, playerId: player.id };
      socket.join(room.code);
      playerSocket.set(player.id, socket);
      room.addEvent('join', `${name} joined the room`);

      if (room.settings.ticketAssignment === 'auto' && room.status !== 'over') {
        room.autoAssignTicket(player.id);
      }

      reply(cb, {
        ok: true,
        code: room.code,
        playerId: player.id,
        token: player.token,
        state: room.publicState(player.id),
      });
      broadcastRoom(room);
    });

    socket.on('room:rejoin', (payload = {}, cb) => {
      const room = getRoom(payload.code);
      if (!room) return reply(cb, { ok: false, gone: true, error: 'This room no longer exists' });
      const player = room.getPlayer(payload.playerId);
      if (!player || player.token !== payload.token) {
        return reply(cb, { ok: false, gone: true, error: 'Could not restore your seat' });
      }
      socket.data = { roomCode: room.code, playerId: player.id };
      socket.join(room.code);
      playerSocket.set(player.id, socket);
      room.setConnected(player.id, true);

      reply(cb, {
        ok: true,
        code: room.code,
        playerId: player.id,
        token: player.token,
        state: room.publicState(player.id),
      });
      broadcastRoom(room);
    });

    socket.on('host:start', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.start();
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:call', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      if (room.status !== 'running') return reply(cb, { ok: false, error: 'Game is not running' });
      const n = room.drawNumber();
      reply(cb, { ok: true, number: n });
      broadcastRoom(room);
    });

    socket.on('host:setCalling', (payload = {}, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const intervalMs = payload.intervalMs
        ? Math.round(clamp(payload.intervalMs, LIMITS.autoIntervalMs.min, LIMITS.autoIntervalMs.max))
        : undefined;
      const result = room.setCalling(payload.mode, intervalMs);
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:pause', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.pause();
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:resume', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.resume();
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:endGame', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.endGame('Game ended by the host');
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:beginCalling', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.beginCalling();
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('host:restart', (payload, cb) => {
      const { room, error } = requireHost(socket);
      if (error) return reply(cb, { ok: false, error });
      const result = room.restart();
      reply(cb, result);
      broadcastRoom(room);
    });

    socket.on('claim:submit', (payload = {}, cb) => {
      const { room, player } = ctx(socket);
      if (!room || !player) return reply(cb, { ok: false, error: 'You are not in a room' });
      const result = room.submitClaim(player.id, payload.ticketNumber, payload.prizeId, payload.marked);
      reply(cb, result);
      if (result.ok && result.valid) {
        // Tell everyone in the room a prize was won (clients skip the toast for
        // the winner themselves, who gets their own celebration).
        io.to(room.code).emit('prize:won', {
          prizeId: result.prizeId,
          label: result.label,
          name: player.name,
          playerId: player.id,
          ticketNumber: Number(payload.ticketNumber),
          rank: result.rank,
        });
      }
      broadcastRoom(room);
    });

    // --- voice chat (WebRTC signalling relay) ---
    socket.on('voice:join', () => {
      const { room, player } = ctx(socket);
      if (!room || !player) return;
      room.joinVoice(player.id);
      broadcastRoom(room);
    });

    socket.on('voice:leave', () => {
      const { room, player } = ctx(socket);
      if (!room || !player) return;
      room.leaveVoice(player.id);
      broadcastRoom(room);
    });

    // Relay an SDP offer/answer or ICE candidate to a single peer in the room.
    socket.on('voice:signal', (payload = {}) => {
      const { room, player } = ctx(socket);
      if (!room || !player || !payload.to) return;
      const target = playerSocket.get(payload.to);
      if (target && target.data.roomCode === room.code) {
        target.emit('voice:signal', { from: player.id, data: payload.data });
      }
    });

    socket.on('room:leave', (payload, cb) => {
      const { room, player } = ctx(socket);
      if (room && player) {
        // In the lobby a leaver frees their seat & tickets; mid-game they keep
        // their seat (marked offline) so a winning ticket isn't lost.
        room.leaveVoice(player.id);
        if (room.status === 'lobby') {
          for (const num of player.tickets) delete room.ticketOwners[num];
          room.players.delete(player.id);
          room.addEvent('leave', `${player.name} left the room`);
        } else {
          room.setConnected(player.id, false);
        }
        if (playerSocket.get(player.id) === socket) playerSocket.delete(player.id);
        socket.leave(room.code);
        broadcastRoom(room);
        if (!room.hasConnectedPlayers() && room.status === 'lobby') removeRoom(room.code);
      }
      socket.data = { roomCode: null, playerId: null };
      reply(cb, { ok: true });
    });

    socket.on('disconnect', () => {
      const { room, player } = ctx(socket);
      if (room && player) {
        room.setConnected(player.id, false); // also drops them from voice
        if (playerSocket.get(player.id) === socket) playerSocket.delete(player.id);
        broadcastRoom(room);
      }
    });
  });
}

export { normalizeSettings };
