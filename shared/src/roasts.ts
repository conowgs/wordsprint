// Playful, answer-focused roasts. We deliberately roast the *answer* or the
// *round outcome*, never the human — keeps it funny, not toxic.

export const ROASTS = {
  champion: [
    "Please stop. The others are trying their best.",
    "The alphabet has officially chosen a favorite.",
    "Successful use of brain detected.",
    "Certified alphabet warrior.",
  ],
  middle: [
    "Solid word wrangling. Suspiciously responsible behavior.",
    "The Spoon Union appreciates your continued support.",
    "Bold strategy. It somehow paid off.",
    "Reliable. The leaderboard nods respectfully.",
  ],
  woodenSpoon: [
    "This round was character building. Mostly for the dictionary.",
    "Your answers showed courage. The points disagreed.",
    "The comeback starts next round. Preferably.",
    "You collected valuable life experience. And few points.",
  ],
  invalidAnimal: [
    "The zoologists reviewed this. They are still laughing.",
    "That creature exists only in imagination DLC.",
  ],
  invalidPlace: [
    "Great destination. Unfortunately it appears nowhere on Earth.",
    "Google Maps has quietly given up.",
  ],
  invalidThing: [
    "We asked several objects. None accepted responsibility.",
    "This might be a thing in another universe.",
  ],
  typo: [
    "The dictionary understood what you meant. Eventually.",
    "Close enough for partial credit and full sympathy.",
  ],
  goblin: [
    "Three players wrote the same thing. The hive mind grows.",
    "Nobody trusted the letter Q. Honestly, good call.",
    "One answer earned zero points but maximum confidence.",
    "The spoon lobby remains dangerously powerful.",
  ],
};

export function pick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function roastForRank(rank: number, lastRank: number, rng: () => number = Math.random): string {
  if (rank === 0) return pick(ROASTS.champion, rng);
  if (rank >= lastRank) return pick(ROASTS.woodenSpoon, rng);
  return pick(ROASTS.middle, rng);
}
