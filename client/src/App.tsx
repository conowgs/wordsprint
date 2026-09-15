// Top-level app: connects to the server via useGame and renders the right
// screen for the authoritative phase. The client is a thin view over the
// server's RoomSnapshot — no game rules live here.

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gamepad2, Volume2, VolumeX, Wifi, WifiOff, RotateCcw } from "lucide-react";
import { Backdrop } from "./components/Backdrop.js";
import { Button, Badge } from "./components/ui.js";
import { useGame } from "./hooks/useGame.js";
import { Home } from "./screens/Home.js";
import { Lobby } from "./screens/Lobby.js";
import { Countdown } from "./screens/Countdown.js";
import { Game } from "./screens/Game.js";
import { Reveal } from "./screens/Reveal.js";
import { Results } from "./screens/Results.js";
import { GameOver } from "./screens/GameOver.js";

export default function App() {
  const game = useGame();
  const [muted, setMuted] = useState(false);
  const reduce = useReducedMotion();
  const { snapshot } = game.state;
  const phase = snapshot?.phase ?? (snapshot ? "LOBBY" : "HOME");

  const screen = useMemo(() => {
    if (!snapshot) return "HOME";
    return snapshot.phase;
  }, [snapshot]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 -rotate-2 place-items-center rounded-[18px_14px_20px_13px] border-2 border-[#fff9ec] bg-sun text-ink shadow-[4px_5px_0_#7657ff]">
              <Gamepad2 />
            </div>
            <div>
              <div className="font-serif text-2xl font-black">WordSprint!</div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-mint">four blanks · one brave brain</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${game.state.connected ? "text-mint" : "text-[#ff9bad]"} border border-white/15 bg-white/5`}>
              {game.state.connected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {game.state.connected ? "Signal behaving" : "Wi-Fight in progress"}
            </Badge>
            <Button variant="ghost" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          </div>
        </header>

        {game.state.error && (
          <div className="mb-4 rounded-xl border border-[#ff7a90]/40 bg-[#ff7a90]/10 p-3 text-sm text-[#ffb3c0]">
            {game.state.error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
          >
            {screen === "HOME" && <Home onCreate={game.createRoom} onJoin={game.joinRoom} />}
            {screen === "LOBBY" && <Lobby game={game} />}
            {screen === "STARTING" && <Countdown round={snapshot?.round?.roundNumber ?? 1} letter={snapshot?.round?.letter ?? "?"} />}
            {screen === "PLAYING" && <Game game={game} />}
            {screen === "REVEAL" && <Reveal game={game} />}
            {(screen === "SCORING" || screen === "RESULTS" || screen === "LEADERBOARD") && <Results game={game} />}
            {screen === "GAME_OVER" && <GameOver game={game} />}
          </motion.div>
        </AnimatePresence>

        {screen !== "HOME" && (
          <Button variant="ghost" onClick={() => { sessionStorage.clear(); location.reload(); }} className="mt-8">
            <RotateCcw className="mr-2 h-4 w-4" /> Leave room
          </Button>
        )}
      </div>
    </main>
  );
}
