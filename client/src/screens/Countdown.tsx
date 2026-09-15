import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Countdown({ round, letter }: { round: number; letter: string }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x <= 1 ? (clearInterval(t), 0) : x - 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <AnimatePresence mode="wait">
        <motion.div key={n} initial={{ scale: .3, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 1.8, opacity: 0 }} className="text-center">
          <p className="font-mono font-black uppercase tracking-[.4em] text-mint">Round {round} · the letter is</p>
          <div className="font-serif text-[10rem] font-black text-sun">{n ? letter : "GO!"}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
