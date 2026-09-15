# WordSprint! 🎮

A real-time, multiplayer **Name · Place · Animal · Thing** party game for up to **10 players** per room. A letter drops, four blanks appear, and your brain sprints. Answers are validated against curated in-memory dictionaries with fuzzy spell-correction, scored with a unique-answer bonus, and roasted (kindly) by the resident Word Goblin.

> Correctness → Low latency → Reliability → Security → Maintainability → Visual polish

---

## ✨ Features

- **Rooms** with short shareable codes (e.g. `AB7K2`) — no database IDs exposed
- **Up to 10 players**, minimum 2 to start, duplicate names blocked
- **Server-authoritative** game engine: letter, deadline, validation, scoring, host role
- **Real-time** via Socket.IO (WebSocket) — no HTTP polling
- **Answer Parade** reveal after every round + **host skip** and auto-advance timer
- **Category-aware validation** with O(1) exact lookup + bounded fuzzy matching
- **Spelling tolerance**: `Singapoor → Singapore` earns partial credit
- **Scoring**: exact 10 · minor typo 8 · moderate typo 5 · invalid 0 · **unique +5**
- **Playful roasts** that target the *answer*, never the person
- **Host transfer** on disconnect, session-token **reconnection**, refresh-safe
- **Artistic, handcrafted UI** — paper-cut cards, framer-motion, reduced-motion aware
- **Winner screen** with lightweight CSS confetti and fun awards

---

## 🏗 Architecture

```
Azure Front Door + WAF
        │
        ▼
Azure Container Apps
 ├── client  (React + Vite, static)
 └── server  (Fastify + Socket.IO)
        │
        ├── Azure Managed Redis      → live room state, presence, deadlines,
        │                              command idempotency, Socket.IO adapter
        └── Azure DB for PostgreSQL  → games, rounds, submissions, final scores
Supporting: Container Registry · Key Vault · App Insights · Managed Identity · Private Endpoints
```

**Why this stack**

- **Fastify + Socket.IO** — small surface, rooms/acks/reconnect built in, no polling.
- **Redis** — transient, latency-critical state and the cross-instance Socket.IO adapter so you can scale horizontally without sticky sessions.
- **PostgreSQL** — durable history only. Redis accelerates play; Postgres is the record of truth for finished rounds.
- **Local dictionaries** — deterministic, fast, no LLM/API calls during gameplay.

The **server owns the clock.** The round `endsAt` timestamp is authoritative; clients render an estimated countdown but submissions are accepted/rejected by the server's own time.

---

## 📁 Project structure

```
/shared    types, constants, fuzzy matching, scoring, roasts   (shared contracts)
/server    Fastify + Socket.IO, room state machine, validator, dictionaries, tests
/client    React + Vite + Tailwind + framer-motion, screen-per-phase UI
/infra     Bicep for Container Apps + Managed Redis + PostgreSQL + Key Vault
```

Game logic lives in `/server/src/game` and `/shared`, fully separated from UI and testable in isolation.

---

## 🚀 Getting started

### Prerequisites
- Node.js 20+
- npm 10+
- (optional) Docker, for the Postgres/Redis compose

### Install & run

```bash
npm install          # installs all workspaces
npm run seed         # verifies dictionaries load (no manual files needed)
npm run dev          # starts server (:4000) and client (:5173) together
```

Open http://localhost:5173, click **Make a room**, share the code, and open a second browser/incognito window to **Crash a room** as another player.

### Other commands

```bash
npm run test         # run the server-side game-logic test suite (vitest)
npm run build        # typecheck + build shared, server, and client
```

---

## 🔧 Environment variables

Copy `.env.example` to `.env` in `/server` and `/client`.

**server/.env**
```
PORT=4000
CORS_ORIGIN=http://localhost:5173
# Production only — enable the Socket.IO Redis adapter:
# REDIS_URL=rediss://:<key>@<name>.redis.cache.windows.net:6380
# DATABASE_URL=postgresql://user:pass@host:5432/wordsprint?sslmode=require
```

**client/.env**
```
VITE_SERVER_URL=http://localhost:4000
```

---

## 🧠 Validation & scoring internals

- Each category has a **normalized HashSet** for O(1) exact matches.
- Fuzzy lookup is **bounded**: words are bucketed by `firstLetter → length`, so a typo only compares against a handful of candidates, not the whole list.
- Tolerance scales with word length (`≤3` chars: 0 edits, `≤7`: 1, else 2), so short words can't fuzzy-match unrelated words.
- **Uniqueness** is computed on the *canonical* (corrected) form, closing the "misspell-for-a-bonus" loophole.
- The **time bonus** is applied once per round, never per answer, so speed never beats correctness.

---

## 🔐 Security

- Server determines the letter, deadline, valid answers, scores, and winner.
- Clients send **commands** only; scores/timers/letters are never trusted from the client.
- Duplicate submissions are idempotent; late submissions rejected by server clock.
- Basic rate limiting (`@fastify/rate-limit`); CORS locked to the client origin.
- Session tokens for reconnection; production stores secrets in **Key Vault** and uses **private endpoints**.

---

## 📈 Scaling to multiple instances

1. Every server instance connects to the same **Azure Managed Redis**.
2. Enable the Socket.IO Redis adapter (see the commented block in `server/src/index.ts`).
3. Room ownership uses a renewable lease; scoring uses a distributed lock.
4. Reconnecting players can land on any healthy instance and rebuild state from Redis.
5. Finished rounds are committed to PostgreSQL.

---

## 🗺 Roadmap / not yet wired

The in-memory store is production-shaped but ships as a single-node default. To go fully distributed, swap `RoomStore`'s `Map` for Redis and add the Postgres persistence adapter (schemas sketched in `infra/`). Everything else — the state machine, validation, scoring, reconnection contract — is already in place.

Enjoy, and may the Spoon Union treat you kindly. 🥄
