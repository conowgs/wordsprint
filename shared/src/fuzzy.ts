// Fast, dependency-free Levenshtein distance with an early-exit band.
// We only ever care about distances up to `max`, so we bail out early
// once the best possible distance on a row exceeds the threshold.

export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  if (Math.abs(al - bl) > max) return max + 1;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1; // whole row already worse than we allow
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

// How many edits we tolerate before calling something "not the same word".
// Short words get zero tolerance so "cat" can't fuzzy-match "bat".
export function permittedDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 7) return 1;
  return 2;
}

// Distance -> classification used by the scoring layer.
export function classifyDistance(distance: number, wordLength: number): "exact" | "minor" | "moderate" | "invalid" {
  if (distance === 0) return "exact";
  const limit = permittedDistance(wordLength);
  if (distance > limit) return "invalid";
  return distance === 1 ? "minor" : "moderate";
}
