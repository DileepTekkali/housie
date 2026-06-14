// The authoritative game engine for a single room. Holds all state in memory:
// players, their auto-generated tickets, called numbers and prize winners.
// Nothing is persisted to disk.
import { generateTicket, ticketSignature } from './ticket.js';
import { isPatternComplete } from './claims.js';
import { PRIZE_BY_ID } from './gameConfig.js';
import { genId, genToken } from './util.js';

const MAX_EVENTS = 40;
const TOTAL_NUMBERS = 90;

export class Room {
  constructor({ code, password, settings, hostName }) {
    this.code = code;
    this.password = password || '';
    this.settings = settings; // { ticketAssignment, calling, autoIntervalMs, ticketCount, maxTicketsPerPlayer, prizes:[{id,qty}] }

    this.status = 'lobby'; // lobby | running | paused | over
    // Tickets are generated on demand (one per player), so there's no fixed
    // pool size and nothing to "pick".
    this.tickets = {}; // ticketNumber -> grid
    this.ticketOwners = {}; // ticketNumber -> playerId
    this._ticketSeq = 0; // last assigned ticket number
    this._ticketSigs = new Set(); // ensures no two tickets are identical
    this.players = new Map(); // playerId -> player

    this.called = []; // ordered list of called numbers
    this.calledSet = new Set();
    this.currentNumber = null;

    // prize tracking, preserving the host's chosen order
    this.prizes = settings.prizes.map((p) => ({ id: p.id, qty: p.qty, winners: [] }));

    this.voice = new Set(); // playerIds currently in the voice call

    this.events = [];
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    this._timer = null;
    this.broadcast = null; // injected by the socket layer

    // host is the first player, and gets a ticket automatically like everyone else
    this.host = this.addPlayer({ name: hostName, isHost: true });
    this.autoAssignTicket(this.host.id);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  addEvent(type, text) {
    this.events.push({ type, text, ts: Date.now() });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  addPlayer({ name, isHost = false }) {
    const player = {
      id: genId(),
      token: genToken(),
      name,
      isHost,
      connected: true,
      tickets: [],
      joinedAt: Date.now(),
    };
    this.players.set(player.id, player);
    this.touch();
    return player;
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  // --- ticket assignment ---

  // Generate a fresh, unique ticket and hand it to the player. Every player
  // gets exactly one this way — there is no picking.
  autoAssignTicket(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (this.status === 'over') return { ok: false, error: 'Game is over' };
    if (player.tickets.length >= this.settings.maxTicketsPerPlayer) {
      return { ok: true, ticketNumber: player.tickets[0] }; // already has one
    }

    let grid;
    let tries = 0;
    do {
      grid = generateTicket();
      tries += 1;
    } while (this._ticketSigs.has(ticketSignature(grid)) && tries < 50);
    this._ticketSigs.add(ticketSignature(grid));

    const num = ++this._ticketSeq;
    this.tickets[num] = grid;
    this.ticketOwners[num] = playerId;
    player.tickets.push(num);
    this.touch();
    return { ok: true, ticketNumber: num };
  }

  // --- game flow ---

  start() {
    if (this.status !== 'lobby') return { ok: false, error: 'Game already started' };
    // The host may start whenever they like, regardless of how many tickets
    // have been picked.
    this.status = 'running';
    this.startAuto();
    this.touch();
    return { ok: true };
  }

  drawNumber() {
    if (this.status !== 'running') return null;
    const remaining = [];
    for (let n = 1; n <= TOTAL_NUMBERS; n++) {
      if (!this.calledSet.has(n)) remaining.push(n);
    }
    if (remaining.length === 0) {
      // Every number is out — keep the game open so players can still claim;
      // it ends when all prizes are won or the host ends it.
      return null;
    }
    const n = remaining[Math.floor(Math.random() * remaining.length)];
    this.calledSet.add(n);
    this.called.push(n);
    this.currentNumber = n;
    this.touch();
    // Note: we do NOT end the game just because all 90 are called — players may
    // still need to claim a prize that completes on the final number. The game
    // ends only when every prize is awarded or the host ends it.
    return n;
  }

  startAuto() {
    this.stopAuto();
    if (this.status !== 'running' || this.settings.calling !== 'auto') return;
    this._timer = setInterval(() => {
      const n = this.drawNumber();
      if (n == null || this.status !== 'running') this.stopAuto();
      if (this.broadcast) this.broadcast();
    }, this.settings.autoIntervalMs);
  }

  stopAuto() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  setCalling(mode, intervalMs) {
    if (mode === 'auto' || mode === 'manual') this.settings.calling = mode;
    if (intervalMs) this.settings.autoIntervalMs = intervalMs;
    if (this.status === 'running') this.startAuto(); // restart with new mode/interval
    this.touch();
    return { ok: true };
  }

  pause() {
    if (this.status !== 'running') return { ok: false, error: 'Game is not running' };
    this.status = 'paused';
    this.stopAuto();
    this.addEvent('game', 'Game paused by the host');
    this.touch();
    return { ok: true };
  }

  resume() {
    if (this.status !== 'paused') return { ok: false, error: 'Game is not paused' };
    this.status = 'running';
    this.addEvent('game', 'Game resumed');
    this.startAuto();
    this.touch();
    return { ok: true };
  }

  endGame(reason = 'Game ended by the host') {
    if (this.status === 'over') return { ok: true };
    this.status = 'over';
    this.stopAuto();
    this.currentNumber = this.currentNumber; // keep last
    this.addEvent('game', reason);
    this.touch();
    return { ok: true };
  }

  allPrizesAwarded() {
    return this.prizes.every((p) => p.winners.length >= p.qty);
  }

  // --- claims ---

  submitClaim(playerId, ticketNumber, prizeId, marked = []) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (this.status !== 'running' && this.status !== 'paused') {
      return { ok: false, error: 'No game in progress' };
    }
    const num = Number(ticketNumber);
    if (this.ticketOwners[num] !== playerId) {
      return { ok: false, error: 'That ticket is not yours' };
    }
    const prize = this.prizes.find((p) => p.id === prizeId);
    if (!prize) return { ok: false, error: 'That prize is not part of this game' };

    const meta = PRIZE_BY_ID[prizeId];
    const label = meta ? meta.label : prizeId;

    if (prize.winners.length >= prize.qty) {
      return { ok: true, valid: false, reason: `${label} has already been fully claimed`, prizeId };
    }
    if (prize.winners.some((w) => w.playerId === playerId)) {
      return { ok: true, valid: false, reason: `You have already won ${label}`, prizeId };
    }

    // A claim is judged ONLY on the numbers the player actually struck — and a
    // struck number only counts if it has genuinely been called. So forgetting
    // to strike a called number (in manual mode) means the claim isn't ready.
    const struck = new Set(
      (Array.isArray(marked) ? marked : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && this.calledSet.has(n)),
    );

    const grid = this.tickets[num];
    const complete = isPatternComplete(prizeId, grid, struck);
    if (!complete) {
      this.addEvent('bogey', `${player.name} made an early ${label} claim`);
      this.touch();
      return {
        ok: true,
        valid: false,
        reason: `Not ready — make sure every ${label} number is called and struck on your ticket`,
        prizeId,
      };
    }

    const rank = prize.winners.length + 1;
    prize.winners.push({ playerId, name: player.name, ticketNumber: num, rank, at: this.called.length });
    const rankLabel = prize.qty > 1 ? ` (#${rank})` : '';
    this.addEvent('prize', `${player.name} won ${label}${rankLabel} on ticket #${num}!`);

    if (this.allPrizesAwarded()) {
      this.endGame('All prizes have been won — game over!');
    }
    this.touch();
    return { ok: true, valid: true, prizeId, label, rank };
  }

  // --- connection bookkeeping ---

  setConnected(playerId, connected) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.connected = connected;
      if (!connected) this.voice.delete(playerId); // drop from voice when offline
      this.touch();
    }
  }

  joinVoice(playerId) {
    if (this.getPlayer(playerId)) this.voice.add(playerId);
    this.touch();
  }

  leaveVoice(playerId) {
    this.voice.delete(playerId);
    this.touch();
  }

  hasConnectedPlayers() {
    for (const p of this.players.values()) {
      if (p.connected) return true;
    }
    return false;
  }

  // --- snapshots sent to clients (personalised per player) ---

  publicState(forPlayerId) {
    const me = forPlayerId ? this.getPlayer(forPlayerId) : null;

    const players = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      connected: p.connected,
      tickets: [...p.tickets].sort((a, b) => a - b),
    }));

    const prizes = this.prizes.map((p) => {
      const meta = PRIZE_BY_ID[p.id];
      return {
        id: p.id,
        label: meta ? meta.label : p.id,
        hint: meta ? meta.hint : '',
        qty: p.qty,
        winners: p.winners.map((w) => ({ name: w.name, ticketNumber: w.ticketNumber, rank: w.rank })),
        open: p.winners.length < p.qty,
      };
    });

    const youTickets = me
      ? me.tickets
          .slice()
          .sort((a, b) => a - b)
          .map((number) => ({ number, grid: this.tickets[number] }))
      : [];

    return {
      code: this.code,
      status: this.status,
      hostId: this.host.id,
      settings: {
        calling: this.settings.calling,
        autoIntervalMs: this.settings.autoIntervalMs,
      },
      players,
      called: this.called,
      currentNumber: this.currentNumber,
      calledCount: this.called.length,
      voice: [...this.voice].filter((id) => this.players.has(id)),
      prizes,
      events: this.events.slice(-MAX_EVENTS),
      you: me
        ? { playerId: me.id, name: me.name, isHost: me.isHost, tickets: youTickets }
        : null,
      // only the host sees the password (so they can share it)
      password: me && me.isHost ? this.password : undefined,
    };
  }

  destroy() {
    this.stopAuto();
    this.players.clear();
  }
}
