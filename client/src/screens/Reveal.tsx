import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SkipForward, CheckCircle2, Sparkles, AlertTriangle, XCircle, UserRound, Globe2, PawPrint, Package } from "lucide-react";
import { Paper, Button, Badge, Progress } from "../components/ui.js";
import type { useGame } from "../hooks/useGame.js";
import type { Category, ValidationStatus } from "@wordsprint/shared";

const cats: { key: Category; label: string; icon: any; color: string }[] = [
  { key: "name", label: "Name", icon: UserRound, color: "#a78bfa" },
  { key: "place", label: "Place", icon: Globe2, color: "#67e8f9" },
  { key: "animal", label: "Animal", icon: PawPrint, color: "#86efac" },
  { key: "thing", label: "Thing", icon: Package, color: "#fbbf24" },
];
const face: Record<ValidationStatus, any> = {
  valid: <CheckCircle2 className="h-4 w-4" />, unique: <Sparkles className="h-4 w-4" />,
  typo: <AlertTriangle className="h-4 w-4" />, invalid: <XCircle className="h-4 w-4" />, empty: <XCircle className="h-4 w-4" />,
};
const tone: Record<ValidationStatus, string> = {
  valid: "text-emerald-700 bg-emerald-100", unique: "text-violet-700 bg-violet-100",
  typo: "text-amber-700 bg-amber-100", invalid: "text-rose-700 bg-rose-100", empty: "text-slate-600 bg-slate-100",
};
const REVEAL_SECONDS = 15;

export function Reveal({ game }: { game: ReturnType<typeof useGame> }) {
  const { results, snapshot, youId } = game.state;
  const [left, setLeft] = useState(REVEAL_SECONDS);
  const isHost = snapshot?.hostId === youId;

  useEffect(() => {
    const t = setInterval(() => setLeft((x) => (x <= 1 ? (clearInterval(t), 0) : x - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left === 0 && isHost) game.advance(); }, [left, isHost]);

  if (!results) return null;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="bg-[#b9a7ff] text-ink">Answer parade</Badge>
          <h1 className="mt-2 font-serif text-4xl font-black">Everybody, show your homework</h1>
          <p className="text-[#d5cfdf]">Scores in {left}s. Read fast, judge kindly, laugh responsibly.</p>
        </div>
        {isHost && <Button onClick={game.advance} className="bg-sun text-ink"><SkipForward className="mr-2" /> Host: skip to scores</Button>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cats.map((c, ci) => (
          <Paper key={c.key} className="p-5">
            <div className="mb-2 flex items-center gap-2 font-serif text-lg font-black"><c.icon style={{ color: c.color }} /> {c.label}</div>
            <div className="space-y-2">
              {results.map((r) => {
                const a = r.answers[ci];
                return (
                  <motion.div key={r.playerId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <b className="w-24 truncate">{r.name}</b>
                    <span className="flex-1 font-serif text-lg font-black">{a.raw || "—"}</span>
                    <Badge className={tone[a.status]}>{face[a.status]}<span className="ml-1">{a.points} pts</span></Badge>
                  </motion.div>
                );
              })}
            </div>
          </Paper>
        ))}
      </div>
      <div className="mt-5"><Progress value={(left / REVEAL_SECONDS) * 100} /></div>
    </div>
  );
}
