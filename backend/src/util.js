// Small helpers: id / code / token generation and input sanitising.
import { randomBytes, randomInt } from 'node:crypto';

// Room codes use an unambiguous alphabet (no 0/O, 1/I/L) so they are easy
// to read aloud and type on a phone.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genRoomCode(length = 5) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

export function genId() {
  return randomBytes(9).toString('base64url');
}

// Secret per-player token used to reclaim a seat after a refresh/reconnect.
export function genToken() {
  return randomBytes(24).toString('base64url');
}

export function sanitizeName(name, fallback = 'Player') {
  const cleaned = Array.from(String(name ?? ''))
    // keep printable characters only (drop ASCII control chars + DEL)
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .replace(/\s+/g, ' ') // collapse runs of whitespace
    .trim()
    .slice(0, 24);
  return cleaned || fallback;
}

export function clamp(n, min, max) {
  n = Number(n);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
