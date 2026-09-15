// Category-aware validator.
//
// Design goals (from the spec):
//   * O(1) exact match via a normalized HashSet per category.
//   * Fuzzy match without scanning the whole dictionary — we bucket words
//     by (firstLetter -> length) so a typo only compares against a handful
//     of plausible candidates.
//   * Fully deterministic. No network calls during gameplay.

import { levenshtein, permittedDistance } from "@wordsprint/shared";
import type { Category } from "@wordsprint/shared";

export interface MatchResult {
  matched: boolean;
  canonical: string | null;
  distance: number;
}

function normalize(word: string): string {
  return word
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[^a-z ]/g, "");
}

export class CategoryIndex {
  private exact = new Set<string>();
  private canonical = new Map<string, string>(); // normalized -> display
  // firstLetter -> length -> normalized words
  private buckets = new Map<string, Map<number, string[]>>();

  constructor(words: string[]) {
    for (const w of words) this.add(w);
  }

  add(display: string) {
    const norm = normalize(display);
    if (!norm) return;
    this.exact.add(norm);
    if (!this.canonical.has(norm)) this.canonical.set(norm, display);
    const first = norm[0];
    if (!this.buckets.has(first)) this.buckets.set(first, new Map());
    const byLen = this.buckets.get(first)!;
    if (!byLen.has(norm.length)) byLen.set(norm.length, []);
    byLen.get(norm.length)!.push(norm);
  }

  match(raw: string): MatchResult {
    const norm = normalize(raw);
    if (!norm) return { matched: false, canonical: null, distance: Infinity };

    // 1) O(1) exact hit
    if (this.exact.has(norm)) {
      return { matched: true, canonical: this.canonical.get(norm)!, distance: 0 };
    }

    // 2) Bounded fuzzy search over same first letter and nearby lengths only
    const limit = permittedDistance(norm.length);
    if (limit === 0) return { matched: false, canonical: null, distance: Infinity };

    const byLen = this.buckets.get(norm[0]);
    if (!byLen) return { matched: false, canonical: null, distance: Infinity };

    let best = Infinity;
    let bestWord: string | null = null;
    for (let len = norm.length - limit; len <= norm.length + limit; len++) {
      const candidates = byLen.get(len);
      if (!candidates) continue;
      for (const cand of candidates) {
        const d = levenshtein(norm, cand, limit);
        if (d < best) {
          best = d;
          bestWord = cand;
          if (best === 1) break; // good enough, stop early
        }
      }
      if (best === 1) break;
    }

    if (bestWord !== null && best <= limit) {
      return { matched: true, canonical: this.canonical.get(bestWord)!, distance: best };
    }
    return { matched: false, canonical: null, distance: Infinity };
  }

  get size() {
    return this.exact.size;
  }
}

export type RemoteValidator = (category: Category, raw: string) => Promise<MatchResult>;

export class Dictionary {
  private indexes: Record<Category, CategoryIndex>;
  private remote?: RemoteValidator;

  constructor(seed: Record<Category, string[]>, remote?: RemoteValidator) {
    this.indexes = {
      name: new CategoryIndex(seed.name),
      place: new CategoryIndex(seed.place),
      animal: new CategoryIndex(seed.animal),
      thing: new CategoryIndex(seed.thing),
    };
    this.remote = remote;
  }

  // Synchronous, local-only match (keeps existing callers that want sync)
  match(category: Category, raw: string, requiredLetter?: string): MatchResult {
    const res = this.indexes[category].match(raw);
    // Enforce the round letter server-side: an answer must start with it.
    if (res.matched && requiredLetter) {
      const norm = raw.trim().toLowerCase();
      if (!norm.startsWith(requiredLetter.toLowerCase())) {
        return { matched: false, canonical: null, distance: Infinity };
      }
    }
    return res;
  }

  // Async match: tries local first, then optional remote fallback.
  async matchAsync(category: Category, raw: string, requiredLetter?: string): Promise<MatchResult> {
    const local = this.match(category, raw, requiredLetter);
    if (local.matched) return local;
    if (!this.remote) return local;
    try {
      const remote = await this.remote(category, raw);
      // remote validator must also respect requiredLetter if provided
      if (remote.matched && requiredLetter) {
        const norm = raw.trim().toLowerCase();
        if (!norm.startsWith(requiredLetter.toLowerCase())) {
          return { matched: false, canonical: null, distance: Infinity };
        }
      }
      return remote;
    } catch (e) {
      return local;
    }
  }

  counts(): Record<Category, number> {
    return {
      name: this.indexes.name.size,
      place: this.indexes.place.size,
      animal: this.indexes.animal.size,
      thing: this.indexes.thing.size,
    };
  }
}
