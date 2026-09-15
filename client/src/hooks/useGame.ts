// Central game hook: owns the socket, applies server events to local state,
// and exposes command helpers. Reconnection reuses a sessionToken kept in
// sessionStorage so a browser refresh rejoins the same seat.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket, send } from "../lib/socket.js";
import type {
  RoomSnapshot, RoundState, PlayerRoundResult, ServerEvent, Award, Category, GameSettings,
} from "@wordsprint/shared";

export interface GameState {
  connected: boolean;
  snapshot: RoomSnapshot | null;
  round: RoundState | null;
  results: PlayerRoundResult[] | null;
  awards: Award[] | null;
  youId: string | null;
  error: string | null;
}

export function useGame() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GameState>({
    connected: false, snapshot: null, round: null, results: null, awards: null, youId: null, error: null,
  });

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setState((s) => ({ ...s, connected: true }));
      // Attempt reconnect into an existing seat after a refresh.
      const token = sessionStorage.getItem("ws.token");
      const code = sessionStorage.getItem("ws.room");
      if (token && code) send(socket, { type: "room.reconnect", roomCode: code, sessionToken: token });
    });
    socket.on("disconnect", () => setState((s) => ({ ...s, connected: false })));

    socket.on("event", (evt: ServerEvent) => {
      setState((prev) => {
        switch (evt.type) {
          case "room.joined":
            sessionStorage.setItem("ws.token", evt.sessionToken);
            sessionStorage.setItem("ws.room", evt.snapshot.roomCode);
            return { ...prev, snapshot: evt.snapshot, youId: evt.you.id, error: null };
          case "room.updated":
            return { ...prev, snapshot: evt.snapshot };
          case "round.started":
            return { ...prev, round: evt.round, results: null };
          case "round.reveal":
            return { ...prev, results: evt.results };
          case "round.results":
            return { ...prev, results: evt.results, snapshot: evt.snapshot };
          case "game.over":
            return { ...prev, snapshot: evt.snapshot, awards: evt.awards };
          case "command.rejected":
            return { ...prev, error: evt.message };
          default:
            return prev;
        }
      });
    });

    return () => { socket.close(); };
  }, []);

  const createRoom = useCallback((displayName: string, settings?: Partial<GameSettings>) => {
    if (socketRef.current) send(socketRef.current, { type: "room.create", displayName, settings });
  }, []);
  const joinRoom = useCallback((displayName: string, roomCode: string) => {
    if (socketRef.current) send(socketRef.current, { type: "room.join", displayName, roomCode });
  }, []);
  const startGame = useCallback(() => {
    if (socketRef.current) send(socketRef.current, { type: "game.start" });
  }, []);
  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    if (socketRef.current) send(socketRef.current, { type: "room.update", settings });
  }, []);
  const submit = useCallback((roundNumber: number, answers: Record<Category, string>) => {
    if (socketRef.current) send(socketRef.current, { type: "round.submit", roundNumber, answers });
  }, []);
  const advance = useCallback(() => {
    if (socketRef.current) send(socketRef.current, { type: "round.advance" });
  }, []);

  return { state, createRoom, joinRoom, startGame, updateSettings, submit, advance };
}

// Countdown driven by the SERVER deadline (endsAt), not a local decrement.
export function useServerCountdown(endsAt: number | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}
