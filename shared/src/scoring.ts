import { classifyDistance } from "./fuzzy.js";
import type { ValidationStatus } from "./types.js";

export const POINTS = {
  exact: 10,
  minor: 8,
  moderate: 5,
  invalid: 0,
  uniqueBonus: 5,
} as const;

export interface MatchOutcome {
  status: ValidationStatus;
  distance: number;
  canonical: string | null;
}

// Base points for a single answer, before the uniqueness bonus.
export function basePoints(distance: number, wordLength: number, matched: boolean): number {
  if (!matched) return POINTS.invalid;
  const klass = classifyDistance(distance, wordLength);
  if (klass === "exact") return POINTS.exact;
  if (klass === "minor") return POINTS.minor;
  if (klass === "moderate") return POINTS.moderate;
  return POINTS.invalid;
}

export function statusFor(distance: number, wordLength: number, matched: boolean, unique: boolean): ValidationStatus {
  if (!matched) return "invalid";
  const klass = classifyDistance(distance, wordLength);
  if (klass === "invalid") return "invalid";
  if (klass === "exact") return unique ? "unique" : "valid";
  return "typo";
}

// Optional early-submit bonus, applied once per round (not per answer)
// so speed never overwhelms correctness.
export function timeBonus(secondsRemaining: number): number {
  if (secondsRemaining > 30) return 3;
  if (secondsRemaining > 15) return 2;
  if (secondsRemaining > 5) return 1;
  return 0;
}
