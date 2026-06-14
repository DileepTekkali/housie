import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore, loadSession } from './store.js';
import { fetchConfig } from './socket.js';
import AnimatedBackground from './components/AnimatedBackground.jsx';
import Splash from './components/Splash.jsx';
import Toaster from './components/Toaster.jsx';
import ConnectionBadge from './components/ConnectionBadge.jsx';
import Landing from './components/Landing.jsx';
import CreateRoom from './components/CreateRoom.jsx';
import JoinRoom from './components/JoinRoom.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';

const SCREENS = {
  landing: Landing,
  create: CreateRoom,
  join: JoinRoom,
  lobby: Lobby,
  game: Game,
};

export default function App() {
  const view = useStore((s) => s.view);
  const [showIntro, setShowIntro] = useState(
    () => !loadSession() && !new URLSearchParams(window.location.search).get('room'),
  );

  useEffect(() => {
    fetchConfig();

    const params = new URLSearchParams(window.location.search);
    const store = useStore.getState();
    const session = loadSession();

    if (params.has('create')) {
      store.setView('create');
    } else if (params.has('join') || params.has('room')) {
      // If we have a saved session, the socket 'connect' handler rejoins that
      // room and restores the SAME seat (no duplicate player). Only show the
      // join form when there's nothing to restore.
      if (!session) store.setView('join');
    }

    const onPop = () => {
      const s = useStore.getState();
      const isRoomView = s.view === 'lobby' || s.view === 'game';
      let targetView = window.history.state?.view;

      if (!targetView) {
        const p = new URLSearchParams(window.location.search);
        if (p.has('create')) targetView = 'create';
        else if (p.has('join')) targetView = 'join';
        else if (p.has('room')) {
          if (!s.session) targetView = 'join';
          else return;
        } else {
          targetView = 'landing';
        }
      }

      if (isRoomView && targetView !== 'lobby' && targetView !== 'game') {
        import('./socket.js').then((m) => m.leaveRoom()).catch(() => s.reset());
      } else if (targetView) {
        s.setView(targetView);
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const Screen = SCREENS[view] || Landing;

  return (
    <div className="relative min-h-full">
      <AnimatePresence>{showIntro && <Splash key="splash" onDone={() => setShowIntro(false)} />}</AnimatePresence>
      {view === 'landing' && <AnimatedBackground />}
      <main className="relative z-10 mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-5 sm:py-8">
        <Screen />
      </main>
      <Toaster />
      <ConnectionBadge />
    </div>
  );
}
