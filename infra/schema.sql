-- WordSprint — PostgreSQL schema (durable history only).
-- Redis holds live/transient state; Postgres records finished data.
-- Rooms auto-expire via expires_at + a periodic cleanup job.

CREATE TABLE IF NOT EXISTS room (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code     CHAR(5) NOT NULL UNIQUE,
  host_player_id UUID,
  status        TEXT NOT NULL DEFAULT 'LOBBY',
  settings      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + interval '6 hours'
);

CREATE TABLE IF NOT EXISTS player (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  session_hash TEXT NOT NULL,          -- store a hash of the session token, not the token
  color        TEXT NOT NULL,
  connected    BOOLEAN NOT NULL DEFAULT TRUE,
  total_score  INTEGER NOT NULL DEFAULT 0,
  join_order   INTEGER NOT NULL,
  UNIQUE (room_id, lower(display_name)) -- no duplicate names in a room
);

CREATE TABLE IF NOT EXISTS round (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  letter       CHAR(1) NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL,
  ended_at     TIMESTAMPTZ,
  UNIQUE (room_id, round_number)
);

CREATE TABLE IF NOT EXISTS submission (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID NOT NULL REFERENCES round(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,          -- name | place | animal | thing
  raw          TEXT NOT NULL,
  canonical    TEXT,
  status       TEXT NOT NULL,          -- valid | unique | typo | invalid | empty
  distance     INTEGER,
  points       INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id, category) -- one submission per category per round
);

CREATE INDEX IF NOT EXISTS idx_room_expires ON room(expires_at);
CREATE INDEX IF NOT EXISTS idx_player_room ON player(room_id);
CREATE INDEX IF NOT EXISTS idx_round_room ON round(room_id);
CREATE INDEX IF NOT EXISTS idx_submission_round ON submission(round_id);
