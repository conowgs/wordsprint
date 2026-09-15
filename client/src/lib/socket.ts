// Thin typed wrapper around a single Socket.IO connection.
// The client ONLY sends commands and reacts to server events — it never
// computes scores or trusts its own timer for round deadlines.

import { io, type Socket } from "socket.io-client";
import type { ClientCommand, ServerEvent } from "@wordsprint/shared";

const URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

export function createSocket(): Socket {
  return io(URL, { transports: ["websocket"], reconnection: true, reconnectionDelay: 500 });
}

let counter = 0;
export function commandId(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export function send(socket: Socket, cmd: Omit<ClientCommand, "commandId"> & { commandId?: string }) {
  socket.emit("command", { commandId: commandId(), ...cmd });
}

export type { ServerEvent };
