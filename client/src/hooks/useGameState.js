import { useMemo } from "react";
import { socket } from "../socket";

export function useGameState(room) {
  // ---- Who am I? (include id so Duel UI can use me?.id) ----
  const me = useMemo(() => {
    if (!room?.players) return null;
    const p = room.players[socket.id];
    return p ? { id: socket.id, ...p } : null;
  }, [room]);

  // ---- Players lists ----
  // For battle mode, exclude the host from "players" (these are guessers)
  const players = useMemo(() => {
    if (!room?.players) return [];
    if (room.mode === "battle") {
      return Object.entries(room.players)
        .filter(([id]) => id !== room.hostId)
        .map(([id, p]) => ({ id, ...p }));
    }
    // Duel: both players
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  // Everyone (host + players) – useful for results/leaderboards
  const allPlayers = useMemo(() => {
    if (!room?.players) return [];
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  // Other players (battle: exclude me and host)
  const otherPlayers = useMemo(() => {
    if (!room?.players || room.mode !== "battle") return [];
    return Object.entries(room.players)
      .filter(([id]) => id !== room.hostId && id !== socket.id)
      .map(([id, p]) => ({ id, ...p }));
  }, [room]);

  // Opponent (duel)
  const opponent = useMemo(() => {
    if (!room?.players) return null;
    const entry = Object.entries(room.players).find(([id]) => id !== socket.id);
    return entry ? { id: entry[0], ...entry[1] } : null;
  }, [room]);

  const isHost = room?.hostId === socket.id;

  // ---- Typing gates ----
  // DUEL: only while started and I'm not done
  const canGuessDuel =
    room?.mode === "duel" && !!room?.started && !!me && !me.done;

  // BATTLE: round started, I’m not host, not done, still have guesses
  const canGuessBattle =
    room?.mode === "battle" &&
    !!room?.battle?.started &&
    !isHost &&
    !!me &&
    !me.done &&
    (me.guesses?.length ?? 0) < 6;

  // ---- Keyboard coloring from my guesses (correct > present > absent) ----
  const letterStates = useMemo(() => {
    const states = {};
    const rank = { correct: 3, present: 2, absent: 1 };
    for (const row of me?.guesses || []) {
      for (let i = 0; i < 5; i++) {
        const ch = (row.guess?.[i] || "").toUpperCase();
        if (!ch) continue;
        const pat = row.pattern?.[i];
        const st =
          pat === "green"
            ? "correct"
            : pat === "yellow"
            ? "present"
            : pat === "gray"
            ? "absent"
            : null;
        if (!st) continue;
        if (!states[ch] || rank[st] > rank[states[ch]]) states[ch] = st;
      }
    }
    return states;
  }, [me?.guesses]);

  // ---- Victory gate (unchanged) ----
  const shouldShowVictory = useMemo(() => {
    if (!room) return false;
    if (room.mode === "duel") {
      return Boolean(room.winner) || Boolean(room.duelReveal);
    }
    if (room.mode === "battle") {
      // Show results when round is over (winner or reveal)
      return Boolean(room.battle?.winner || room.battle?.reveal);
    }
    return false;
  }, [
    room?.mode,
    room?.winner,
    room?.duelReveal,
    room?.battle?.winner,
    room?.battle?.reveal,
  ]);

  // ---- Duel secrets (for end-of-round reveal UI) ----
  const duelSecrets = useMemo(() => {
    if (room?.mode !== "duel") return { leftSecret: null, rightSecret: null };

    const allGreenGuessWord = (guesses = []) =>
      guesses.find((g) => g.pattern?.every((p) => p === "green"))?.guess;

    const leftSecret =
      allGreenGuessWord(opponent?.guesses) || room?.duelReveal?.[me?.id];
    const rightSecret =
      allGreenGuessWord(me?.guesses) || room?.duelReveal?.[opponent?.id];

    return { leftSecret, rightSecret };
  }, [room, me, opponent]);

  return {
    me,
    players,
    allPlayers,
    otherPlayers,
    opponent,
    isHost,
    canGuessDuel,
    canGuessBattle,
    letterStates,
    shouldShowVictory,
    duelSecrets,
  };
}
