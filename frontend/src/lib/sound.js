// Lightweight sound + speech helpers. All calls are safe no-ops where the
// browser lacks support or audio is disabled.
import { callPhrase } from './format.js';

let ctx = null;
function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, gain = 0.18, type = 'sine') {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ac.destination);
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playDraw() {
  tone(660, 0, 0.18, 0.16, 'triangle');
  tone(990, 0.08, 0.2, 0.12, 'triangle');
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, i * 0.12, 0.4, 0.2, 'triangle'));
}

export function playError() {
  tone(220, 0, 0.25, 0.16, 'sawtooth');
}

let voices = [];
function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  voices = speechSynthesis.getVoices();
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoicechanged = loadVoices;
}

export function announceNumber(n) {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(callPhrase(n));
    u.rate = 0.95;
    u.pitch = 1;
    const en = voices.find((v) => /en[-_]/i.test(v.lang));
    if (en) u.voice = en;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
