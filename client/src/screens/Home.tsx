import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Play, Sparkles, UserRound, Globe2, PawPrint, Package } from "lucide-react";
import { Paper, Button, Input, Label, Badge } from "../components/ui.js";

const cats = [
  { label: "Name", icon: UserRound, color: "#a78bfa" },
  { label: "Place", icon: Globe2, color: "#67e8f9" },
  { label: "Animal", icon: PawPrint, color: "#86efac" },
  { label: "Thing", icon: Package, color: "#fbbf24" },
];

export function Home({ onCreate, onJoin }: { onCreate: (n: string) => void; onJoin: (n: string, c: string) => void }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="grid min-h-[76vh] items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
      <section>
        <Badge className="mb-6 -rotate-2 bg-[#a8e6cf] px-4 py-2 text-[#14362d] shadow-[4px_4px_0_#ffcb55]">
          <Sparkles className="mr-2 h-4 w-4" /> Vocabulary cardio. No trainers required.
        </Badge>
        <h1 className="font-serif text-5xl font-black leading-[.94] sm:text-7xl">
          A letter drops.<br /><span className="text-sun">Your brain sprints.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-[#d5cfdf]">
          Name it, place it, tame it, or claim it. Bring up to nine friends and prove that "Spoon" really is strategic thinking.
        </p>
        <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          {cats.map((c, i) => (
            <motion.div key={c.label} whileHover={{ y: -5, rotate: 0 }} style={{ rotate: i % 2 ? 1 : -1 }}
              className="rounded-[22px_17px_24px_15px] border-2 border-[#fff9ec] bg-cream p-3 text-center text-ink shadow-[5px_6px_0_#0005]">
              <c.icon className="mx-auto mb-2" style={{ color: c.color }} />
              <b className="font-serif">{c.label}</b>
            </motion.div>
          ))}
        </div>
      </section>
      <Paper className="rotate-[.4deg] p-1 shadow-[12px_14px_0_#7657ff]">
        <div className="p-5">
          <div className="grid grid-cols-2 rounded-xl bg-[#ded5c4] p-1">
            <Button onClick={() => setMode("create")} className={mode === "create" ? "bg-grape text-white" : "bg-transparent text-[#655d74]"}>Make a room</Button>
            <Button onClick={() => setMode("join")} className={mode === "join" ? "bg-grape text-white" : "bg-transparent text-[#655d74]"}>Crash a room</Button>
          </div>
          <h2 className="pt-4 font-serif text-3xl font-black">{mode === "create" ? "Host the word circus" : "Got the secret knock?"}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="name">Your legendary name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="What should we call you?" className="mt-2" />
            </div>
            {mode === "join" && (
              <div>
                <Label htmlFor="code">Tiny but mighty room code</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="AB7K2" className="mt-2 text-center font-mono tracking-[.3em]" />
              </div>
            )}
            <Button
              disabled={!name.trim() || (mode === "join" && code.length !== 5)}
              onClick={() => (mode === "create" ? onCreate(name.trim()) : onJoin(name.trim(), code))}
              className="h-14 w-full bg-rose text-[#321522]">
              {mode === "create" ? <><Plus className="mr-1" /> Open the word gates</> : <><Play className="mr-1" /> Let me in, coach</>}
            </Button>
            <p className="text-center text-xs text-[#81798a]">No account. No awkward password. Just confidence.</p>
          </div>
        </div>
      </Paper>
    </div>
  );
}
