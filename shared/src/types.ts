// Shared contracts between client and server.
// Keeping these in one place guarantees the WebSocket payloads never drift.

export type Category = "name" | "place" | "animal" | "thing";
export const CATEGORIES: Category[] = ["name", "place", "animal", "thing"];

export type GamePhase =
  | "LOBBY"
  | "STARTING"
  | "PLAYING"
  | "REVEAL"
  | "SCORING"
  | "RESULTS"
  | "LEADERBOARD"
  | "GAME_OVER";

export type ValidationStatus = "valid" | "unique" | "typo" | "invalid" | "empty";

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  host: boolean;
  connected: boolean;
  totalScore: number;
}

export interface AnswerResult {
  category: Category;
  raw: string;
  canonical: string | null; // corrected/normalized form when validated
  status: ValidationStatus;
  distance: number; // edit distance from the matched dictionary word
  points: number;
  unique: boolean;
}

export interface PlayerRoundResult {
  playerId: string;
  name: string;
  color: string;
  answers: AnswerResult[];
  roundScore: number;
  roast: string;
}

export interface RoundState {
  roundNumber: number;
  totalRounds: number;
  letter: string;
  startedAt: number; // server epoch ms
  endsAt: number; // server epoch ms — the authoritative deadline
}

export interface GameSettings {
  rounds: number; // 3 | 5 | 10
  roundSeconds: number; // 30 | 60 | 90
  categories: Category[];
}

export interface RoomSnapshot {
  roomCode: string;
  phase: GamePhase;
  hostId: string;
  players: PublicPlayer[];
  settings: GameSettings;
  round: RoundState | null;
  results: PlayerRoundResult[] | null;
  maxPlayers: number;
}

// ---- Client -> Server commands (the client never mutates state directly) ----
export type ClientCommand =
  | { type: "room.create"; commandId: string; displayName: string; settings?: Partial<GameSettings> }
  | { type: "room.update"; commandId: string; settings: Partial<GameSettings> }
  | { type: "room.join"; commandId: string; roomCode: string; displayName: string }
  | { type: "room.reconnect"; commandId: string; roomCode: string; sessionToken: string }
  | { type: "game.start"; commandId: string }
  | { type: "round.submit"; commandId: string; roundNumber: number; answers: Record<Category, string> }
  | { type: "round.advance"; commandId: string }; // host skip

// ---- Server -> Client events ----
export type ServerEvent =
  | { type: "room.joined"; sessionToken: string; you: PublicPlayer; snapshot: RoomSnapshot }
  | { type: "room.updated"; snapshot: RoomSnapshot }
  | { type: "round.started"; round: RoundState }
  | { type: "round.reveal"; results: PlayerRoundResult[] }
  | { type: "round.results"; results: PlayerRoundResult[]; snapshot: RoomSnapshot }
  | { type: "game.over"; snapshot: RoomSnapshot; awards: Award[] }
  | { type: "command.rejected"; commandId: string; code: string; message: string };

export interface Award {
  key: string;
  emoji: string;
  title: string;
  playerName: string;
  detail: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 5,
  roundSeconds: 60,
  categories: CATEGORIES,
};

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
