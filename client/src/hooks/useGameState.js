import { useMemo } from "react";
import { socket } from "../socket";

export function useGameState(room) {
  // Current player info
  const me = useMemo(() => {
    const currentPlayer = room?.players && room.players[socket.id];
    return currentPlayer;
  }, [room]);

    // All players as array (including host for lobby, excluding host for game)
  const players = useMemo(() => {
    if (!room?.players) return [];

    if (room.mode === "battle") {
      // For battle mode, exclude the host from the players list
      const filteredPlayers = Object.entries(room.players)
        .filter(([id]) => id !== room.hostId)
        .map(([id, p]) => ({ id, ...p }));



      return filteredPlayers;
    }

    // For duel mode, return all players
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  // All players including host (for lobby and leaderboard)
  const allPlayers = useMemo(() => {
    if (!room?.players) return [];
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  // Other players (for battle mode - excludes current player and host)
  const otherPlayers = useMemo(() => {
    if (!room?.players || room.mode !== "battle") return [];

    return Object.entries(room.players)
      .filter(([id]) => id !== room.hostId && id !== socket.id)
      .map(([id, p]) => ({ id, ...p }));
  }, [room, socket.id]);

  // Opponent (for duel mode)
  const opponent = useMemo(() => {
    if (!room?.players) return null;
    const entries = Object.entries(room.players);
    const other = entries.find(([id]) => id !== socket.id);
    return other ? { id: other[0], ...other[1] } : null;
  }, [room]);

  // Game state flags
  const isHost = room?.hostId === socket.id;



  const canGuessDuel =
    room?.mode === "duel" && room?.started && !opponent?.disconnected;
  const canGuessBattle =
    room?.mode === "battle" && room?.battle?.started && !isHost;



  // Letter states for keyboard
  const letterStates = useMemo(() => {
    const states = {};
    (me?.guesses || []).forEach(({ guess, pattern }) => {
      guess.split("").forEach((letter, i) => {
        const state =
          pattern[i] === "green"
            ? "correct"
            : pattern[i] === "yellow"
            ? "present"
            : "absent";
        if (
          !states[letter] ||
          state === "correct" ||
          (state === "present" && states[letter] === "absent")
        ) {
          states[letter] = state;
        }
      });
    });
    return states;
  }, [me?.guesses]);

  // Victory state
  const shouldShowVictory = useMemo(() => {
    if (!room) return false;

    if (room.mode === "duel") {
      // show ONLY if we have a winner or a duelReveal payload
      const shouldShow = Boolean(room.winner) || Boolean(room.duelReveal);
      return shouldShow;
    }

    if (room.mode === "battle") {
      // Only show victory if the game has started AND there's a winner or reveal
      const shouldShow =
        room.battle?.started && (room.battle?.winner || room.battle?.reveal);
      return shouldShow;
    }

    return false;
  }, [
    room?.mode,
    room?.winner,
    room?.duelReveal,
    room?.battle?.started,
    room?.battle?.winner,
    room?.battle?.reveal,
  ]);

  // Duel secrets for display
  const duelSecrets = useMemo(() => {
    if (room?.mode !== "duel") return { leftSecret: null, rightSecret: null };

    function allGreenGuessWord(guesses = []) {
      const g = guesses.find((g) => g.pattern?.every((p) => p === "green"));
      return g?.guess;
    }

    const leftSecret =
      allGreenGuessWord(opponent?.guesses) ||
      room?.duelReveal?.[me?.id || socket.id];
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
