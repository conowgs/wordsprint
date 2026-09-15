import { motion } from "framer-motion";

const scraps = [
  { t: "A", x: "5%", y: "19%", r: -9, c: "#ffd166" },
  { t: "Z", x: "90%", y: "14%", r: 8, c: "#ff7a90" },
  { t: "🐘", x: "88%", y: "72%", r: -7, c: "#a8e6cf" },
  { t: "✦", x: "8%", y: "77%", r: 11, c: "#b9a7ff" },
];

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#171528]">
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-grape/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-rose/15 blur-3xl" />
      {scraps.map((s, i) => (
        <motion.div
          key={s.t}
          className="absolute grid h-14 w-14 place-items-center rounded-[18px_15px_22px_13px] border-2 border-[#fff9ec] text-xl font-black text-ink shadow-[5px_6px_0_#0005]"
          style={{ left: s.x, top: s.y, rotate: s.r, background: s.c }}
          animate={{ y: [0, -10, 0], rotate: [s.r, s.r + 3, s.r] }}
          transition={{ duration: 5 + i, repeat: Infinity }}
        >
          {s.t}
        </motion.div>
      ))}
    </div>
  );
}
