// HTTP + Socket.IO server. Serves the built React client (in production) and
// hosts the real-time game. State is in-memory only — no database.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import { Server } from 'socket.io';

import { registerHandlers } from './socketHandlers.js';
import { startJanitor, roomCount } from './roomStore.js';
import { PRIZE_CATALOG, LIMITS } from './gameConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../frontend/dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

registerHandlers(io);
startJanitor();

// Lightweight config + health endpoints.
app.get('/api/config', (_req, res) => {
  res.json({ prizes: PRIZE_CATALOG, limits: LIMITS });
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: roomCount(), uptime: process.uptime() });
});

// Serve the built client if it exists (production / single-app deploy).
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('Housie Live API is running. Start the client with `npm run dev`.');
  });
}

server.listen(PORT, () => {
  console.log(`Housie Live server listening on http://localhost:${PORT}`);
  if (!fs.existsSync(CLIENT_DIST)) {
    console.log('Client build not found — run `npm run build` to serve the UI from this server.');
  }
});
