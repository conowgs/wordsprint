import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Crown, Users, Settings, Play } from "lucide-react";
import { Paper, Button, Badge, initials } from "../components/ui.js";
import type { useGame } from "../hooks/useGame.js";
import { Dialog } from "../components/ui.js";

export function Lobby({ game }: { game: ReturnType<typeof useGame> }) {
  const { snapshot, youId } = game.state;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rounds, setRounds] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  if (!snapshot) return null;
  const isHost = snapshot.hostId === youId;
  const canStart = isHost && snapshot.players.length >= 2;

  const openEditor = () => {
    setRounds(snapshot.settings.rounds);
    setSeconds(snapshot.settings.roundSeconds);
    setEditing(true);
  };
  const saveSettings = () => {
    if (rounds && seconds) game.updateSettings({ rounds, roundSeconds: seconds });
    setEditing(false);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="bg-sun text-ink">Lobby doodle #{snapshot.roomCode}</Badge>
          <h1 className="mt-3 font-serif text-4xl font-black">Gather the word crew</h1>
          <p className="text-[#d5cfdf]">{snapshot.players.length} in the room. One dictionary mildly concerned.</p>
        </div>
        <Button onClick={() => { navigator.clipboard?.writeText(snapshot.roomCode); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="bg-cream text-ink">
          <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied. Tiny triumph!" : "Copy room code"}
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <Paper className="p-5">
          <div className="mb-3 flex items-center justify-between font-serif text-xl font-black">
            <span><Users className="mr-2 inline" /> Players</span>
            <Badge className="bg-white/40 text-ink">{snapshot.players.length} / {snapshot.maxPlayers}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {snapshot.players.map((p, i) => (
                <motion.div layout key={p.id} initial={{ opacity: 0, y: 12, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .8 }} transition={{ delay: i * .05 }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-white/55 p-3">
                  <div className="grid h-11 w-11 place-items-center rounded-[15px_12px_17px_11px] font-black text-white" style={{ background: p.color }}>{initials(p.name)}</div>
                  <div className="min-w-0 flex-1">
                    <b className="truncate">{p.name}</b>
                    {p.host && <Badge className="ml-2 bg-sun text-ink"><Crown className="mr-1 h-3 w-3" /> Host</Badge>}
                    <div className={`text-xs ${p.connected ? "text-emerald-700" : "text-amber-700"}`}>
                      {p.connected ? "Ready to alphabet" : "Reconnecting… probably blaming Wi-Fi"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Paper>
        <div className="space-y-4">
          <Paper className="p-5">
            <div className="font-serif text-xl font-black"><Settings className="mr-2 inline" /> House rules</div>
            <div className="mt-2 space-y-1 text-sm">
              <p>{snapshot.settings.rounds} rounds · {snapshot.settings.roundSeconds} seconds each</p>
              <p>Exact 10 · typo 8/5 · unique +5</p>
            </div>
              {isHost && (
                <div className="mt-3">
                  <Button onClick={openEditor} className="bg-cream text-ink">Edit house rules</Button>
                </div>
              )}
          </Paper>
            <Dialog open={editing} onClose={() => setEditing(false)}>
              <div className="p-6">
                <h3 className="font-serif text-lg font-black mb-3">Edit house rules</h3>
                <div className="mb-3">
                  <label className="block text-sm">Rounds</label>
                  <select value={rounds ?? undefined} onChange={(e) => setRounds(Number(e.target.value))} className="mt-1 w-full">
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm">Seconds per round</label>
                  <select value={seconds ?? undefined} onChange={(e) => setSeconds(Number(e.target.value))} className="mt-1 w-full">
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button onClick={saveSettings} className="bg-mint">Save</Button>
                  <Button onClick={() => setEditing(false)} className="bg-cream">Cancel</Button>
                </div>
              </div>
            </Dialog>
          {isHost ? (
            <Button disabled={!canStart} onClick={game.startGame} className="h-14 w-full bg-mint text-[#14362d]">
              <Play className="mr-2" /> {snapshot.players.length < 2 ? "Need 2+ players" : "Release the letter!"}
            </Button>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-white/20 p-4 text-center text-sm text-[#d5cfdf]">
              Waiting for the host to release the letter…
            </div>
          )}
        </div>
      </div>
    </>
  );
}
