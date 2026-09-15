// `npm run seed` — verifies the dictionaries load and prints category counts.
// The game ships with working in-memory dictionaries, so no manual files are
// required before playing. This script is where you'd expand the datasets from
// curated open corpora during an OFFLINE prep step.

import { Dictionary } from "./validation/validator.js";
import { SEED } from "./data/dictionaries.js";

const dict = new Dictionary(SEED);
const counts = dict.counts();

console.log("WordSprint dictionaries loaded:");
for (const [cat, n] of Object.entries(counts)) console.log(`  ${cat.padEnd(7)} ${n} words`);

// Quick smoke checks so a bad edit to the seed is caught immediately.
const checks: [string, boolean][] = [
  ["Spain is a valid place", dict.match("place", "Spain", "S").matched],
  ["Elephent corrects to Elephant", dict.match("animal", "Elephent", "E").canonical === "Elephant"],
  ["Spaceship is not an animal", !dict.match("animal", "Spaceship", "S").matched],
];
let ok = true;
for (const [label, pass] of checks) { console.log(`  ${pass ? "✓" : "✗"} ${label}`); if (!pass) ok = false; }
process.exit(ok ? 0 : 1);
