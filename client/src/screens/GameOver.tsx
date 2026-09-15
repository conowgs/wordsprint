import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw } from "lucide-react";
import { Paper, Button, initials } from "../components/ui.js";
import type { useGame } from "../hooks/useGame.js";

// Lightweight CSS confetti — no canvas, cheap on low-end machines.
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    i, x: Math.random() * 100, delay: Math.random() * 0.6,
    c: ["#ffcb55", "#ff6d9f", "#8de1d1", "#b9a7ff", "#86efac"][i % 5],
  })), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span key={b.i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${b.x}%`, background: b.c }}
          initial={{ y: -20, rotate: 0, opacity: 1 }} animate={{ y: "110vh", rotate: 360, opacity: [1, 1, 0] }}
          transition={{ duration: 2.6 + (b.i % 5) * 0.3, delay: b.delay, repeat: Infinity }} />
      ))}
    </div>
  );
}

export function GameOver({ game }: { game: ReturnType<typeof useGame> }) {
  const { snapshot, awards } = game.state;
  if (!snapshot) return null;
  const ranked = [...snapshot.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = ranked[0];

  return (
    <div className="relative">
      <Confetti />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_360px]">
        <Paper className="overflow-hidden p-8 text-center shadow-[12px_14px_0_#7657ff]">
          <div className="font-mono text-xs font-black uppercase tracking-[.4em] text-grape">Champion</div>
          <motion.div initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="mt-2 text-7xl">🏆</motion.div>
          <div className="mt-3 font-serif text-6xl font-black">{winner?.name}</div>
          <div className="mt-2 text-xl font-black text-grape">{winner?.totalScore} points</div>
          <p className="mt-3 text-sm text-ink/60">The dictionary's favorite child. Please stop — the others have families.</p>
          <Button onClick={() => { sessionStorage.clear(); location.reload(); }} className="mt-6 bg-mint text-[#14362d]">
            <RotateCcw className="mr-2 h-4 w-4" /> Play again
          </Button>
        </Paper>
        <div className="space-y-4">
          <Paper className="p-5">
            <div className="font-serif text-2xl font-black"><Trophy className="mr-2 inline text-[#de9d00]" /> Final rankings</div>
            <div className="mt-3 space-y-2">
              {ranked.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3">
                  <span className="w-8 text-center text-xl">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                  <div className="grid h-9 w-9 place-items-center rounded-lg font-black text-white" style={{ background: p.color }}>{initials(p.name)}</div>
                  <span className="flex-1 font-serif font-black">{p.name}</span>
                  <b className="text-xl text-grape">{p.totalScore}</b>
                </div>
              ))}
            </div>
          </Paper>
          {awards && awards.length > 0 && (
            <Paper className="p-5">
              <div className="font-serif text-lg font-black">Fun awards</div>
              <div className="mt-2 space-y-2">
                {awards.map((a) => (
                  <div key={a.key} className="rounded-xl bg-white/60 p-3 text-sm">
                    <b>{a.emoji} {a.title}</b> — {a.playerName}
                    <div className="text-ink/60">{a.detail}</div>
                  </div>
                ))}
              </div>
            </Paper>
          )}
        </div>
      </div>
    </div>
  );
}
