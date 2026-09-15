// Socket.IO command router. The client emits a single "command" event with a
// typed payload; we validate, mutate the authoritative Room, and broadcast the
// minimal set of events. Rounds are closed either when all players submit or
// when the host manually ends the round; there is no automatic timeout.

import type { Server, Socket } from "socket.io";
import type { RoomStore } from "../game/store.js";
import { GameError, type Room } from "../game/room.js";
import { randomUUID } from "node:crypto";
import type { ClientCommand } from "@wordsprint/shared";

// no per-room timers — host controls round end

export function registerHandlers(io: Server, store: RoomStore) {
  io.on("connection", (socket: Socket) => {
    let joined: { room: Room; playerId: string } | null = null;

    const reject = (commandId: string, code: string, message: string) =>
      socket.emit("event", { type: "command.rejected", commandId, code, message });

    const broadcast = (room: Room, event: any) => io.to(room.roomCode).emit("event", event);
    const pushSnapshot = (room: Room) => broadcast(room, { type: "room.updated", snapshot: room.toSnapshot() });

    // scheduleDeadline intentionally removed — host decides when to end rounds

    async function closeRound(room: Room) {
      if (room.phase !== "PLAYING") return;
      const results = await room.scoreRound();
      broadcast(room, { type: "round.reveal", results });
      broadcast(room, { type: "round.results", results, snapshot: room.toSnapshot() });
    }

    socket.on("command", async (cmd: ClientCommand) => {
      try {
        switch (cmd.type) {
          case "room.create": {
            const room = store.create(cmd.settings);
            const token = randomUUID();
            const player = room.addPlayer(cmd.displayName, token);
            joined = { room, playerId: player.id };
            socket.join(room.roomCode);
            socket.data.roomCode = room.roomCode;
            socket.data.playerId = player.id;
            socket.emit("event", {
              type: "room.joined", sessionToken: token,
              you: room.publicPlayers().find((p) => p.id === player.id),
              snapshot: room.toSnapshot(),
            });
            break;
          }
          case "room.join": {
            const room = store.get(cmd.roomCode);
            if (!room) return reject(cmd.commandId, "NO_ROOM", "That room code doesn't exist.");
            const token = randomUUID();
            const player = room.addPlayer(cmd.displayName, token);
            joined = { room, playerId: player.id };
            socket.join(room.roomCode);
            socket.data.roomCode = room.roomCode;
            socket.data.playerId = player.id;
            socket.emit("event", {
              type: "room.joined", sessionToken: token,
              you: room.publicPlayers().find((p) => p.id === player.id),
              snapshot: room.toSnapshot(),
            });
            pushSnapshot(room);
            break;
          }
          case "room.reconnect": {
            const room = store.get(cmd.roomCode);
            if (!room) return reject(cmd.commandId, "NO_ROOM", "Room is gone.");
            const player = (room as any).players.find((p: any) => p.sessionToken === cmd.sessionToken);
            if (!player) return reject(cmd.commandId, "NO_SESSION", "Session expired.");
            room.setConnected(player.id, true);
            joined = { room, playerId: player.id };
            socket.join(room.roomCode);
            socket.data.roomCode = room.roomCode;
            socket.data.playerId = player.id;
            socket.emit("event", {
              type: "room.joined", sessionToken: cmd.sessionToken,
              you: room.publicPlayers().find((p) => p.id === player.id),
              snapshot: room.toSnapshot(),
            });
            pushSnapshot(room);
            break;
          }
          case "game.start": {
            if (!joined) return reject(cmd.commandId, "NO_ROOM", "Join a room first.");
            joined.room.startGame(joined.playerId);
            broadcast(joined.room, { type: "round.started", round: joined.room.round });
            pushSnapshot(joined.room);
            break;
          }
          case "room.update": {
            if (!joined) return reject(cmd.commandId, "NO_ROOM", "Join a room first.");
            const room = joined.room;
            if (joined.playerId !== room.hostId) return reject(cmd.commandId, "NOT_HOST", "Only the host can change house rules.");
            if (room.phase !== "LOBBY") return reject(cmd.commandId, "BAD_PHASE", "Can't change settings after the game starts.");
            // Merge provided settings into room.settings
            const s = (cmd as any).settings ?? {};
            room.settings = { ...room.settings, ...s };
            pushSnapshot(room);
            break;
          }
          case "round.submit": {
            if (!joined) return reject(cmd.commandId, "NO_ROOM", "Join a room first.");
            joined.room.submit(joined.playerId, cmd.roundNumber, cmd.answers);
            pushSnapshot(joined.room);
            if (joined.room.allSubmitted()) await closeRound(joined.room);
            break;
          }
          case "round.advance": {
            if (!joined) return reject(cmd.commandId, "NO_ROOM", "Join a room first.");
            // If the round is still PLAYING, allow the host to manually end it.
            if (joined.room.phase === "PLAYING") {
              if (joined.playerId !== joined.room.hostId) return reject(cmd.commandId, "NOT_HOST", "Only the host can end the round.");
              await closeRound(joined.room);
              break;
            }
            const outcome = joined.room.advance(joined.playerId);
            if (outcome === "OVER") {
              broadcast(joined.room, { type: "game.over", snapshot: joined.room.toSnapshot(), awards: joined.room.awards() });
            } else {
              broadcast(joined.room, { type: "round.started", round: joined.room.round });
              pushSnapshot(joined.room);
            }
            break;
          }
          default:
            reject((cmd as any).commandId ?? "?", "BAD_COMMAND", "Unknown command.");
        }
      } catch (e) {
        if (e instanceof GameError) reject((cmd as any).commandId ?? "?", e.code, e.message);
        else reject((cmd as any).commandId ?? "?", "SERVER_ERROR", "Something went wrong.");
      }
    });

    socket.on("disconnect", () => {
      if (joined) {
        joined.room.setConnected(joined.playerId, false);
        pushSnapshot(joined.room);
      }
    });
  });
}

// no-op: timer support removed
