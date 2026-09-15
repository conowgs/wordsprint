// Authoritative in-memory room. The server owns EVERYTHING: the letter,
// validation, scoring, uniqueness and host role. Rounds are closed when the
// host ends them or when all players submit.
// Clients only send commands; they can never set their own score.
//
// (Swap this Map-backed store for Redis to scale horizontally — the shape
//  of the state is intentionally serializable.)

import {
  CATEGORIES, DEFAULT_SETTINGS, MAX_PLAYERS,
  type Category, type GamePhase, type GameSettings, type PlayerRoundResult,
  type PublicPlayer, type RoomSnapshot, type RoundState, type AnswerResult, type Award,
} from "@wordsprint/shared";
import { basePoints, statusFor, POINTS } from "@wordsprint/shared";
import { roastForRank, ROASTS, pick } from "@wordsprint/shared";
import type { Dictionary } from "../validation/validator.js";

const AVATARS = ["#7657ff","#16a6bf","#16a66a","#e56c43","#d4498f","#c99a1e","#5b73e8","#3aa89b","#b5544e","#7a57c9"];
const ALPHABET = "ABCDEFGHIJKLMNOPRSTUVW"; // skip Q/X/Y/Z — no fun for a party game

export interface Player {
  id: string;
  sessionToken: string;
  name: string;
  color: string;
  connected: boolean;
  totalScore: number;
  joinOrder: number;
  // per-round working data
  submitted: boolean;
  submittedAt: number | null;
  answers: Record<Category, string> | null;
}

export class Room {
  phase: GamePhase = "LOBBY";
  players: Player[] = [];
  hostId = "";
  round: RoundState | null = null;
  results: PlayerRoundResult[] | null = null;
  private joinCounter = 0;

  constructor(
    public roomCode: string,
    public settings: GameSettings = { ...DEFAULT_SETTINGS },
    private dict: Dictionary,
    private now: () => number = () => Date.now(),
    private rng: () => number = Math.random,
  ) {}

  // ---- membership ----
  addPlayer(name: string, sessionToken: string): Player {
    if (this.players.length >= MAX_PLAYERS) throw new GameError("ROOM_FULL", "This room is full.");
    if (this.phase !== "LOBBY") throw new GameError("IN_PROGRESS", "Game already started.");
    const clean = name.trim();
    if (!clean) throw new GameError("BAD_NAME", "Name required.");
    if (this.players.some((p) => p.name.toLowerCase() === clean.toLowerCase()))
      throw new GameError("DUP_NAME", "That name is taken in this room.");
    const player: Player = {
      id: cryptoId(), sessionToken, name: clean,
      color: AVATARS[this.players.length % AVATARS.length],
      connected: true, totalScore: 0, joinOrder: this.joinCounter++,
      submitted: false, submittedAt: null, answers: null,
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    return player;
  }

  setConnected(playerId: string, connected: boolean) {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return;
    p.connected = connected;
    if (!connected && p.id === this.hostId) this.transferHost();
  }

  // Deterministic host transfer: earliest-joined connected player.
  private transferHost() {
    const next = [...this.players]
      .filter((p) => p.connected && p.id !== this.hostId)
      .sort((a, b) => a.joinOrder - b.joinOrder)[0];
    if (next) this.hostId = next.id;
  }

  // ---- lifecycle ----
  startGame(byPlayerId: string) {
    if (byPlayerId !== this.hostId) throw new GameError("NOT_HOST", "Only the host can start.");
    if (this.players.length < 2) throw new GameError("NOT_ENOUGH", "Need at least 2 players.");
    if (this.phase !== "LOBBY") throw new GameError("BAD_PHASE", "Game already started.");
    this.beginRound(1);
  }

  private beginRound(roundNumber: number) {
    const letter = ALPHABET[Math.floor(this.rng() * ALPHABET.length)];
    const startedAt = this.now();
    this.round = {
      roundNumber,
      totalRounds: this.settings.rounds,
      letter,
      startedAt,
      endsAt: startedAt + this.settings.roundSeconds * 1000,
    };
    this.results = null;
    for (const p of this.players) { p.submitted = false; p.submittedAt = null; p.answers = null; }
    this.phase = "PLAYING";
  }

  submit(playerId: string, roundNumber: number, answers: Record<Category, string>) {
    if (this.phase !== "PLAYING" || !this.round) throw new GameError("NOT_PLAYING", "No active round.");
    if (roundNumber !== this.round.roundNumber) throw new GameError("STALE_ROUND", "That round has moved on.");
    const p = this.players.find((x) => x.id === playerId);
    if (!p) throw new GameError("NO_PLAYER", "Unknown player.");
    if (p.submitted) return; // idempotent — duplicate submissions are ignored
    p.answers = {
      name: (answers.name ?? "").slice(0, 40),
      place: (answers.place ?? "").slice(0, 40),
      animal: (answers.animal ?? "").slice(0, 40),
      thing: (answers.thing ?? "").slice(0, 40),
    };
    p.submitted = true;
    p.submittedAt = this.now();
  }

  allSubmitted(): boolean {
    const active = this.players.filter((p) => p.connected);
    return active.length > 0 && active.every((p) => p.submitted);
  }

  deadlinePassed(): boolean {
    return !!this.round && this.now() > this.round.endsAt;
  }

  // Score the round: exact/fuzzy per answer, then uniqueness on canonical form.
  async scoreRound(): Promise<PlayerRoundResult[]> {
    if (!this.round) throw new GameError("NO_ROUND", "Nothing to score.");
    const letter = this.round.letter;

    // First pass: validate every answer.
    const perPlayer: { player: Player; answers: AnswerResult[] }[] = [];
    for (const p of this.players) {
      const answers: AnswerResult[] = [];
      for (const cat of CATEGORIES) {
        const raw = (p.answers?.[cat] ?? "").trim();
        if (!raw) {
          answers.push({ category: cat, raw, canonical: null, status: "empty" as const, distance: Infinity, points: 0, unique: false });
          continue;
        }
        const m = await this.dict.matchAsync(cat, raw, letter);
        const wl = raw.length;
        const pts = basePoints(m.distance === Infinity ? 99 : m.distance, wl, m.matched);
        const status = statusFor(m.distance === Infinity ? 99 : m.distance, wl, m.matched, false);
        answers.push({ category: cat, raw, canonical: m.canonical, status, distance: m.matched ? m.distance : Infinity, points: pts, unique: false });
      }
      perPlayer.push({ player: p, answers });
    }

    // Uniqueness: per category, count canonical forms across valid answers.
    for (const cat of CATEGORIES) {
      const counts = new Map<string, number>();
      for (const row of perPlayer) {
        const a = row.answers.find((x) => x.category === cat)!;
        if (a.points > 0 && a.canonical) counts.set(a.canonical, (counts.get(a.canonical) ?? 0) + 1);
      }
      for (const row of perPlayer) {
        const a = row.answers.find((x) => x.category === cat)!;
        if (a.points > 0 && a.canonical && counts.get(a.canonical) === 1) {
          a.unique = true;
          a.points += POINTS.uniqueBonus;
          if (a.status === "valid") a.status = "unique";
        }
      }
    }

    // Round totals + ranking + roasts.
    const scored = perPlayer.map((row) => ({
      player: row.player,
      answers: row.answers,
      roundScore: row.answers.reduce((s, a) => s + a.points, 0),
    }));
    scored.sort((a, b) => b.roundScore - a.roundScore);
    const lastRank = scored.length - 1;

    const results: PlayerRoundResult[] = scored.map((row, rank) => {
      row.player.totalScore += row.roundScore;
      return {
        playerId: row.player.id,
        name: row.player.name,
        color: row.player.color,
        answers: row.answers,
        roundScore: row.roundScore,
        roast: roastForRank(rank, lastRank, this.rng),
      };
    });

    this.results = results;
    this.phase = "REVEAL";
    return results;
  }

  // Host skip / auto-advance moves REVEAL -> next round or GAME_OVER.
  advance(byPlayerId?: string): "NEXT" | "OVER" {
    if (byPlayerId && byPlayerId !== this.hostId) throw new GameError("NOT_HOST", "Only the host can skip.");
    if (!this.round) throw new GameError("NO_ROUND", "Nothing to advance.");
    if (this.round.roundNumber >= this.settings.rounds) {
      this.phase = "GAME_OVER";
      return "OVER";
    }
    this.beginRound(this.round.roundNumber + 1);
    return "NEXT";
  }

  awards(): Award[] {
    // Simple end-of-game fun awards derived from accumulated data.
    const winner = [...this.players].sort((a, b) => b.totalScore - a.totalScore)[0];
    const spoon = [...this.players].sort((a, b) => a.totalScore - b.totalScore)[0];
    const out: Award[] = [];
    if (winner) out.push({ key: "winner", emoji: "🏆", title: "Champion", playerName: winner.name, detail: `${winner.totalScore} points of pure alphabet dominance.` });
    if (spoon && spoon.id !== winner?.id) out.push({ key: "spoon", emoji: "🥄", title: "Wooden Spoon", playerName: spoon.name, detail: "Completed every round. Revenge arc loading." });
    return out;
  }

  toSnapshot(): RoomSnapshot {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      hostId: this.hostId,
      players: this.publicPlayers(),
      settings: this.settings,
      round: this.round,
      results: this.results,
      maxPlayers: MAX_PLAYERS,
    };
  }

  publicPlayers(): PublicPlayer[] {
    return [...this.players]
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map((p) => ({ id: p.id, name: p.name, color: p.color, host: p.id === this.hostId, connected: p.connected, totalScore: p.totalScore }));
  }
}

export class GameError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

function cryptoId(): string {
  // Works in Node 18+/browsers; falls back if crypto is unavailable.
  try { return (globalThis.crypto as any).randomUUID(); }
  catch { return "id-" + Math.random().toString(36).slice(2, 10); }
}

export function makeRoomCode(rng: () => number = Math.random): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(rng() * chars.length)];
  return code;
}
