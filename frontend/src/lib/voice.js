// WebRTC mesh voice chat. Each participant holds a peer connection to every
// other participant; Socket.IO relays the SDP/ICE signalling. No media server
// is involved, which keeps the app database-free and simple. Best for small
// groups (uses public STUN only).
import { socket } from '../socket.js';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class VoiceManager {
  constructor() {
    this.pcs = new Map(); // peerId -> RTCPeerConnection
    this.streams = new Map(); // peerId -> remote MediaStream (persists across screens)
    this.localStream = null;
    this.myId = null;
    this.active = false;
    this.muted = false;
    this.deafened = false; // silence everyone else (persists across screens)
    this.handlers = {};
    this._bound = false;
    this._audioCtx = null;
    this._meters = new Map(); // id -> { analyser, data }
    this._speaking = {};
    this._levelTimer = null;
  }

  on(event, fn) {
    this.handlers[event] = fn;
  }
  _emit(event, ...args) {
    this.handlers[event]?.(...args);
  }

  _bindSocket() {
    if (this._bound) return;
    this._bound = true;
    socket.on('voice:signal', ({ from, data }) => this._onSignal(from, data));
  }

  async start(myId) {
    this.myId = myId;
    this._bindSocket();
    // Always (re)acquire the microphone on each join so the browser checks the
    // permission every time, rather than silently reusing an old stream.
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    // echoCancellation/noiseSuppression stop you from hearing your own voice
    // bounced back through other people's speakers.
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    this.active = true;
    this.muted = false;
    this._startMeters();
    this._meter('me', this.localStream);
    this._emit('state');
  }

  // Open / close peer connections to match the room's voice roster.
  reconcile(roster) {
    if (!this.active) return;
    const set = new Set(roster);
    for (const pid of [...this.pcs.keys()]) {
      if (!set.has(pid)) this._closePeer(pid);
    }
    for (const pid of roster) {
      if (pid === this.myId || this.pcs.has(pid)) continue;
      // Deterministic initiator: the lexicographically smaller id makes the
      // offer. The other side waits for it — creating the peer early would
      // gather ICE before the handshake and lose those candidates.
      if (this.myId < pid) this._offer(pid);
    }
  }

  _createPeer(peerId) {
    if (this.pcs.has(peerId)) return this.pcs.get(peerId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc._pendingCandidates = []; // ICE that arrives before the remote description
    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    pc.onicecandidate = (e) => {
      if (e.candidate) this._signal(peerId, { kind: 'candidate', candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      this.streams.set(peerId, stream);
      this._emit('stream', peerId, stream);
      this._meter(peerId, stream);
    };
    pc.oniceconnectionstatechange = async () => {
      // If a connection drops, the initiator restarts ICE to recover.
      if (pc.iceConnectionState === 'failed' && this.active && this.myId < peerId) {
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          this._signal(peerId, { kind: 'offer', sdp: pc.localDescription });
        } catch {
          /* ignore */
        }
      }
    };
    this.pcs.set(peerId, pc);
    return pc;
  }

  async _offer(peerId) {
    const pc = this._createPeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this._signal(peerId, { kind: 'offer', sdp: pc.localDescription });
  }

  async _flushCandidates(pc) {
    const pending = pc._pendingCandidates || [];
    pc._pendingCandidates = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
  }

  async _onSignal(from, data) {
    if (!this.active) return;
    try {
      if (data.kind === 'offer') {
        const pc = this._createPeer(from);
        await pc.setRemoteDescription(data.sdp);
        await this._flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this._signal(from, { kind: 'answer', sdp: pc.localDescription });
      } else if (data.kind === 'answer') {
        const pc = this.pcs.get(from);
        if (pc) {
          await pc.setRemoteDescription(data.sdp);
          await this._flushCandidates(pc);
        }
      } else if (data.kind === 'candidate') {
        const pc = this.pcs.get(from);
        if (pc) {
          // Only add once a remote description exists; otherwise buffer it.
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(data.candidate);
          } else {
            pc._pendingCandidates.push(data.candidate);
          }
        }
      }
    } catch {
      /* signalling races are non-fatal; reconcile / ICE restart recovers */
    }
  }

  _signal(peerId, data) {
    socket.emit('voice:signal', { to: peerId, data });
  }

  _closePeer(peerId) {
    const pc = this.pcs.get(peerId);
    if (pc) {
      pc.close();
      this.pcs.delete(peerId);
    }
    this.streams.delete(peerId);
    this._meters.delete(peerId);
    this._emit('peerClosed', peerId);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.localStream) this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.muted));
    this._emit('state');
    return this.muted;
  }

  stop() {
    if (!this.active && this.pcs.size === 0 && !this.localStream) return;
    this.active = false;
    this.deafened = false;
    for (const pid of [...this.pcs.keys()]) this._closePeer(pid);
    this.streams.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this._stopMeters();
    socket.emit('voice:leave');
    this._emit('state');
  }

  // --- speaking detection (Web Audio level meters) ---
  _meter(id, stream) {
    try {
      if (!this._audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this._audioCtx = new AC();
      }
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
      const src = this._audioCtx.createMediaStreamSource(stream);
      const analyser = this._audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      this._meters.set(id, { analyser, data: new Uint8Array(analyser.frequencyBinCount) });
    } catch {
      /* metering is best-effort */
    }
  }

  _startMeters() {
    if (this._levelTimer) return;
    this._levelTimer = setInterval(() => {
      const next = {};
      for (const [id, m] of this._meters) {
        m.analyser.getByteTimeDomainData(m.data);
        let sum = 0;
        for (let i = 0; i < m.data.length; i++) {
          const v = (m.data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / m.data.length);
        next[id === 'me' ? this.myId : id] = rms > 0.05 && !(id === 'me' && this.muted);
      }
      this._speaking = next;
      this._emit('speaking', next);
    }, 180);
  }

  _stopMeters() {
    if (this._levelTimer) clearInterval(this._levelTimer);
    this._levelTimer = null;
    this._meters.clear();
    this._speaking = {};
    this._emit('speaking', {});
  }
}

export const voice = new VoiceManager();
