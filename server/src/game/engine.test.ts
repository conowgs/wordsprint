import { describe, it, expect, beforeEach } from "vitest";
import { Room } from "./room.js";
import { Dictionary } from "../validation/validator.js";
import { levenshtein, permittedDistance } from "@wordsprint/shared";

const seed = {
  name: ["Sanjay", "Sara", "Steve"],
  place: ["Singapore", "Spain", "Seoul", "Surat"],
  animal: ["Snake", "Swan", "Elephant"],
  thing: ["Spoon", "Stone", "Scissors"],
};

function makeRoom() {
  let clock = 1_000_000;
  const now = () => clock;
  let s = 7;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const room = new Room("TEST1", { rounds: 3, roundSeconds: 60, categories: ["name", "place", "animal", "thing"] }, new Dictionary(seed), now, rng);
  return { room, tick: (ms: number) => { clock += ms; }, setClock: (v: number) => { clock = v; } };
}

describe("fuzzy", () => {
  it("computes edit distance", () => {
    expect(levenshtein("elephant", "elephant")).toBe(0);
    expect(levenshtein("elephent", "elephant")).toBe(1);
  });
  it("scales tolerance with length", () => {
    expect(permittedDistance(3)).toBe(0);
    expect(permittedDistance(6)).toBe(1);
    expect(permittedDistance(9)).toBe(2);
  });
});

describe("validator", () => {
  const dict = new Dictionary(seed);
  it("matches exact", () => expect(dict.match("place", "Spain", "S").matched).toBe(true));
  it("corrects a typo", () => expect(dict.match("animal", "Elephent", "E").canonical).toBe("Elephant"));
  it("rejects nonsense", () => expect(dict.match("animal", "Spaceship", "S").matched).toBe(false));
  it("enforces the round letter", () => expect(dict.match("place", "Spain", "T").matched).toBe(false));
  it("rejects empty", () => expect(dict.match("thing", "", "S").matched).toBe(false));
});

describe("room lifecycle", () => {
  let ctx: ReturnType<typeof makeRoom>;
  beforeEach(() => { ctx = makeRoom(); });

  it("adds players and assigns host", () => {
    const a = ctx.room.addPlayer("You", "t1");
    ctx.room.addPlayer("Meera", "t2");
    expect(ctx.room.players.length).toBe(2);
    expect(ctx.room.hostId).toBe(a.id);
  });

  it("blocks duplicate names", () => {
    ctx.room.addPlayer("You", "t1");
    expect(() => ctx.room.addPlayer("you", "t2")).toThrow();
  });

  it("caps at 10 players", () => {
    for (let i = 0; i < 10; i++) ctx.room.addPlayer("P" + i, "t" + i);
    expect(() => ctx.room.addPlayer("P10", "t10")).toThrow();
  });

  it("only host can start and needs 2 players", () => {
    const a = ctx.room.addPlayer("You", "t1");
    expect(() => ctx.room.startGame(a.id)).toThrow(); // 1 player
    const b = ctx.room.addPlayer("Meera", "t2");
    expect(() => ctx.room.startGame(b.id)).toThrow(); // not host
    ctx.room.startGame(a.id);
    expect(ctx.room.phase).toBe("PLAYING");
  });

  it("rejects late submissions using the server clock", () => {
    const a = ctx.room.addPlayer("You", "t1");
    ctx.room.addPlayer("Meera", "t2");
    ctx.room.startGame(a.id);
    ctx.setClock(ctx.room.round!.endsAt + 1);
    expect(() => ctx.room.submit(a.id, ctx.room.round!.roundNumber, { name: "Sara", place: "Spain", animal: "Snake", thing: "Spoon" })).toThrow();
  });

  it("scores exact, fuzzy, invalid and unique bonus", () => {
    const a = ctx.room.addPlayer("You", "t1");
    const b = ctx.room.addPlayer("Meera", "t2");
    ctx.room.startGame(a.id);
    ctx.room.round!.letter = "S";
    ctx.room.submit(a.id, 1, { name: "Sanjay", place: "Singapoor", animal: "Snake", thing: "Scissors" });
    ctx.room.submit(b.id, 1, { name: "Sanjay", place: "Spain", animal: "Snake", thing: "Spoon" });
    const results = ctx.room.scoreRound();
    const you = results.find((r) => r.name === "You")!;
    const place = you.answers.find((x) => x.category === "place")!;
    expect(place.status).toBe("typo"); // Singapoor -> Singapore
    expect(place.points).toBe(8);
    const scissors = you.answers.find((x) => x.category === "thing")!;
    expect(scissors.unique).toBe(true); // only You said Scissors
    expect(scissors.points).toBe(15);
  });

  it("transfers host on disconnect", () => {
    const a = ctx.room.addPlayer("You", "t1");
    ctx.room.addPlayer("Meera", "t2");
    ctx.room.setConnected(a.id, false);
    expect(ctx.room.hostId).not.toBe(a.id);
  });

  it("runs to GAME_OVER after the final round", () => {
    const a = ctx.room.addPlayer("You", "t1");
    ctx.room.addPlayer("Meera", "t2");
    ctx.room.startGame(a.id);
    for (let r = 1; r <= 3; r++) {
      ctx.setClock(ctx.room.round!.endsAt + 1);
      ctx.room.scoreRound();
      const outcome = ctx.room.advance(ctx.room.hostId);
      if (r < 3) expect(outcome).toBe("NEXT"); else expect(outcome).toBe("OVER");
    }
    expect(ctx.room.phase).toBe("GAME_OVER");
  });
});
