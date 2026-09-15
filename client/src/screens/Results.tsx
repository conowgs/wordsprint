import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SkipForward, Trophy, MessageCircle, CheckCircle2, Sparkles, AlertTriangle, XCircle, Play } from "lucide-react";
import { Paper, Button, Badge, Progress, initials } from "../components/ui.js";
import type { useGame } from "../hooks/useGame.js";
import type { ValidationStatus } from "@wordsprint/shared";

const face: Record<ValidationStatus, any> = {
  valid: <CheckCircle2 className="h-4 w-4" />, unique: <Sparkles className="h-4 w-4" />,
  typo: <AlertTriangle className="h-4 w-4" />, invalid: <XCircle className="h-4 w-4" />, empty: <XCircle className="h-4 w-4" />,
};
const tone: Record<ValidationStatus, string> = {
  valid: "text-emerald-700 bg-emerald-100", unique: "text-violet-700 bg-violet-100",
  typo: "text-amber-700 bg-amber-100", invalid: "text-rose-700 bg-rose-100", empty: "text-slate-600 bg-slate-100",
};
const RESULT_SECONDS = 12;

export function Results({ game }: { game: ReturnType<typeof useGame> }) {
  const { results, snapshot, youId } = game.state;
  const [left, setLeft] = useState(RESULT_SECONDS);
  const isHost = snapshot?.hostId === youId;

  useEffect(() => {
    const t = setInterval(() => setLeft((x) => (x <= 1 ? (clearInterval(t), 0) : x - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left === 0 && isHost) game.advance(); }, [left, isHost]);

  if (!results) return null;
  const leaderboard = [...(snapshot?.players ?? [])].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="bg-mint text-[#14362d]">Dictionary verdict</Badge>
          <h1 className="mt-2 font-serif text-4xl font-black">Points, puns and mild emotional damage</h1>
          <p className="text-[#d5cfdf]">Next up in {left}s. The roasts target answers, never humans.</p>
        </div>
        {isHost && <Button onClick={game.advance} className="bg-sun text-ink"><SkipForward className="mr-2" /> Host: skip</Button>}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((r, i) => (
            <Paper key={r.playerId} className={`p-5 ${i === 0 ? "shadow-[8px_9px_0_#ffcb55]" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl font-black text-white" style={{ background: r.color }}>{initials(r.name)}</div>
                <div className="flex-1">
                  <b className="font-serif text-xl">{r.name}</b>
                  <p className="text-xs text-ink/50">
                    {i === 0 ? "Round MVP · alphabet's favorite child" : i === results.length - 1 ? "Wooden Spoon · revenge arc loading" : "Solid word wrangling"}
                  </p>
                </div>
                <motion.b initial={{ scale: 1.7 }} animate={{ scale: 1 }} className="text-3xl text-grape">+{r.roundScore}</motion.b>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {r.answers.map((a, j) => (
                  <div key={j} className={`rounded-xl p-2 text-center ${tone[a.status]}`}>
                    <div className="truncate text-xs font-black">{a.raw || "—"}</div>
                    <div className="mt-1 flex justify-center">{face[a.status]}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 rounded-[17px_14px_19px_13px] bg-ink p-3 text-[#fff9ec]">
                <MessageCircle className="h-5 w-5 shrink-0 text-sun" />
                <p className="text-sm font-medium">"{r.roast}"</p>
              </div>
            </Paper>
          ))}
        </div>
        <div className="space-y-4">
          <Paper className="p-5">
            <div className="font-serif text-2xl font-black"><Trophy className="mr-2 inline text-[#de9d00]" /> Leaderboard</div>
            <div className="mt-3 space-y-2">
              {leaderboard.map((p, i) => (
                <motion.div layout key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3">
                  <span className="w-8 text-center text-xl">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                  <div className="grid h-9 w-9 place-items-center rounded-lg font-black text-white" style={{ background: p.color }}>{initials(p.name)}</div>
                  <span className="flex-1 font-serif font-black">{p.name}</span>
                  <b className="text-xl text-grape">{p.totalScore}</b>
                </motion.div>
              ))}
            </div>
          </Paper>
          <Paper className="p-5">
            <div className="font-serif text-lg font-black">🧌 Word Goblin says</div>
            <p className="mt-2 font-black">"{leaderboard[0]?.name} stole first place. Authorities have been notified."</p>
          </Paper>
          {isHost && (
            <Button onClick={game.advance} className="h-14 w-full bg-mint text-[#14362d]">
              <Play className="mr-2" /> Next round: revenge edition
            </Button>
          )}
        </div>
      </div>
      <div className="mt-5"><Progress value={(left / RESULT_SECONDS) * 100} /></div>
    </div>
  );
}
