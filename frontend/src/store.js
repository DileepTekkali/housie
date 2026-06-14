import { create } from 'zustand';

const PREFS_KEY = 'housie:prefs';
const SESSION_KEY = 'housie:session';
const MARKS_KEY = 'housie:marks';

function loadStoredMarks() {
  try {
    return JSON.parse(localStorage.getItem(MARKS_KEY) || 'null');
  } catch {
    return null;
  }
}
function saveStoredMarks(code, marks) {
  try {
    localStorage.setItem(MARKS_KEY, JSON.stringify({ code, marks }));
  } catch { /* ignore */ }
}

function loadPrefs() {
  const defaults = { sound: true, voice: false };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function syncUrl(view, roomCode, push) {
  const url = new URL(window.location);
  switch (view) {
    case 'landing':
      url.search = '';
      break;
    case 'create':
      url.search = '?create';
      break;
    case 'join':
      if (roomCode) {
        url.search = `?join&room=${roomCode}`;
        const k = new URL(window.location).searchParams.get('k');
        if (k) url.searchParams.set('k', k);
      } else {
        url.search = '?join';
      }
      break;
    case 'lobby':
    case 'game':
      if (roomCode) url.search = `?room=${roomCode}`;
      break;
  }
  if (push) window.history.pushState({ view }, '', url.toString());
  else window.history.replaceState({ view }, '', url.toString());
}

let toastSeq = 0;

export const useStore = create((set, get) => ({
  view: 'landing',
  connected: false,
  room: null,
  session: null,
  config: null,
  toasts: [],
  prefs: loadPrefs(),
  marks: {},
  marksCode: null,

  hydrateMarks: (code) => {
    if (!code || get().marksCode === code) return;
    const stored = loadStoredMarks();
    set({ marks: stored && stored.code === code ? stored.marks : {}, marksCode: code });
  },

  setView: (view, push) => {
    const code = get().room?.code;
    syncUrl(view, code, push);
    set({ view });
  },

  setConnected: (connected) => set({ connected }),
  setConfig: (config) => set({ config }),
  setRoom: (room) => set({ room }),
  setSession: (session) => {
    saveSession(session);
    set({ session });
  },

  reset: () => {
    saveSession(null);
    try { localStorage.removeItem(MARKS_KEY); } catch { /* ignore */ }
    set({ room: null, session: null, view: 'landing', marks: {}, marksCode: null });
    syncUrl('landing', null, false);
  },

  setPref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    set({ prefs });
  },

  pushToast: (text, type = 'info') => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, text, type }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4200);
    return id;
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleMark: (ticketNumber, n) => {
    const marks = { ...get().marks };
    const cur = new Set(marks[ticketNumber] || []);
    if (cur.has(n)) cur.delete(n);
    else cur.add(n);
    marks[ticketNumber] = [...cur];
    const code = get().room?.code || get().marksCode;
    set({ marks, marksCode: code });
    if (code) saveStoredMarks(code, marks);
  },
}));
