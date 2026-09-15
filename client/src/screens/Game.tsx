import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserRound, Globe2, PawPrint, Package } from "lucide-react";
import { Paper, Button, Input, Label, Progress } from "../components/ui.js";
import { useServerCountdown, type useGame } from "../hooks/useGame.js";
import type { Category } from "@wordsprint/shared";

const cats: { key: Category; label: string; icon: any; color: string }[] = [
  { key: "name", label: "Name", icon: UserRound, color: "#a78bfa" },
  { key: "place", label: "Place", icon: Globe2, color: "#67e8f9" },
  { key: "animal", label: "Animal", icon: PawPrint, color: "#86efac" },
  { key: "thing", label: "Thing", icon: Package, color: "#fbbf24" },
];

export function Game({ game }: { game: ReturnType<typeof useGame> }) {
  const { snapshot } = game.state;
  const round = snapshot?.round ?? null;
  const remaining = useServerCountdown(round?.endsAt ?? null);
  const [a, setA] = useState<Record<Category, string>>({ name: "", place: "", animal: "", thing: "" });
  const [locked, setLocked] = useState(false);

  useEffect(() => { setA({ name: "", place: "", animal: "", thing: "" }); setLocked(false); }, [round?.roundNumber]);

  if (!round) return null;
  const urgent = remaining <= 10;
  const total = snapshot?.settings.roundSeconds ?? 60;

  const lockIn = () => { if (locked) return; setLocked(true); game.submit(round.roundNumber, a); };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="rounded-md bg-[#a8e6cf] px-2.5 py-1 text-xs font-black text-[#14362d]">Round {round.roundNumber} of {round.totalRounds}</span>
            <h1 className="mt-2 font-serif text-3xl font-black">Words beginning with…</h1>
          </div>
          <motion.div animate={urgent ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}
            className={`flex items-center gap-3 rounded-[22px_17px_25px_15px] border-2 border-[#fff9ec] p-3 text-ink shadow-[5px_6px_0_#7657ff] ${urgent ? "bg-[#ffd5dd]" : "bg-cream"}`}>
            <b className="text-5xl">{round.letter}</b>
            <span className={`font-mono text-2xl font-black ${urgent ? "text-rose-600" : ""}`}>00:{String(remaining).padStart(2, "0")}</span>
          </motion.div>
        </div>
        <Progress value={(remaining / total) * 100} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {cats.map((c) => (
            <Paper key={c.key} className="p-5">
              <Label htmlFor={c.key}><c.icon className="mr-2 inline" style={{ color: c.color }} /> {c.label}</Label>
              <Input id={c.key} disabled={locked} value={a[c.key]} placeholder={`${round.letter}…`}
                onChange={(e) => setA({ ...a, [c.key]: e.target.value })} className="mt-3 text-lg font-bold" />
            </Paper>
          ))}
        </div>
        <Button disabled={locked} onClick={lockIn} className="mt-5 h-14 w-full bg-rose text-[#321522]">
          {locked ? "Answers locked. No sneaky erasers." : "Lock in answers"}
        </Button>
      </section>
      <Paper className="h-fit p-5">
        <div className="font-serif text-xl font-black">Live pulse</div>
        <p className="mt-1 text-3xl font-black">
          {snapshot?.players.filter((p) => p.connected).length ?? 0} <span className="text-base text-ink/50">in the room</span>
        </p>
        <div className="mt-6 rounded-xl bg-sun/35 p-3 text-sm">
          Typing stays local. The server judges the final answers using its own clock — not your nervous backspaces.
        </div>
      </Paper>
    </div>
  );
}
