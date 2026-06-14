# 🎟️ Tekkali's Tambola

A real-time, **no-database** Housie / Tambola web app with **live voice chat**.
Create a room, share the code, and play together — number calling, ticket
strikes, prize claims and voice all sync live across every device. Rooms live in
server memory only, so nothing is ever written to disk.

## Features

- **Animated intro** — an opening splash reveals the *Tekkali's Tambola* title,
  then fades to the Create / Join screen.
- **Animated, responsive UI** — works great on phones, tablets and desktops.
- **Create a room** with a shareable code + your name + optional password.
- **One-tap invite link** — share a link that opens the room and lets guests
  join with just their name (no password typing).
- **Live voice chat** — peer-to-peer (WebRTC) group audio with mute and
  who's-speaking indicators (best for small groups; uses public STUN).
- **Unique auto-generated tickets** — no two tickets in a room are ever
  identical. Host chooses *players pick* or *auto-assign*.
- **Number calling** by the host — **manual draw** or **automatic** with an
  adjustable speed, plus an optional spoken caller.
- **Tap to strike** — players mark their own numbers (you can even pre-mark a
  number before it's called); a claim only counts numbers that are struck *and*
  have actually been called.
- **Server-verified claims**: Early Five (Jaldi 5), Top / Middle / Bottom line,
  Four Corners and Full House — and the host sets **how many winners** each
  prize has (e.g. 1st & 2nd Full House, two Top Lines). A claim only counts the
  numbers you've actually **struck** on your ticket, and the server double-checks
  every win.
- **Winners summary** at the end listing everyone who won which prize.
- **Reconnect-safe**: refresh, slow internet or a dropped connection — you keep
  your seat *and* your strikes, and rejoin automatically.

## Tech

- **Client:** React + Vite + Tailwind CSS + Framer Motion; WebRTC for voice
- **Server:** Node + Express + Socket.IO (authoritative, in-memory rooms;
  also relays WebRTC voice signalling)

## Getting started

```bash
npm install        # installs frontend + backend workspaces

# Development (hot reload): frontend on :5173, backend on :3001
npm run dev

# Production (single app): build the client, then serve everything from Node
npm run build
npm start          # serves the app + sockets on http://localhost:3001
```

Open the printed URL, create a room, and share the code with friends.

## Deploying

It's one app. On Render / Railway / Fly, set the build and start commands:

- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- The server respects the `PORT` environment variable.

## How "no database" works

Each room is a plain object held in a `Map` in the Node process
(`server/src/roomStore.js`). The server generates tickets, draws numbers and
validates every claim. A periodic janitor removes abandoned rooms, and a server
restart clears all state. No file or database is ever touched.
