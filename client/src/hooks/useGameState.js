import { useMemo } from "react";
import { socket } from "../socket";
import { MODES } from "../modes/index.js";

export function useGameState(room) {
  const modeKey = room?.mode || "duel";
  const module = MODES[modeKey] || MODES.duel;

  const me = useMemo(() => {
    if (!room?.players) return null;
    const player = room.players[socket.id];
    return player ? { id: socket.id, ...player } : null;
  }, [room]);

  const players = useMemo(() => {
    if (!room?.players) return [];
    if (room.mode === "battle") {
      return Object.entries(room.players)
        .filter(([id]) => id !== room.hostId)
        .map(([id, p]) => ({ id, ...p }));
    }
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  const allPlayers = useMemo(() => {
    if (!room?.players) return [];
    return Object.entries(room.players).map(([id, p]) => ({ id, ...p }));
  }, [room]);

  const otherPlayers = useMemo(() => {
    if (!room?.players || room.mode !== "battle") return [];
    return Object.entries(room.players)
      .filter(([id]) => id !== room.hostId && id !== socket.id)
      .map(([id, p]) => ({ id, ...p }));
  }, [room]);

  const opponent = useMemo(() => {
    if (!room?.players || room.mode !== "duel") return null;
    const entry = Object.entries(room.players).find(([id]) => id !== socket.id);
    return entry ? { id: entry[0], ...entry[1] } : null;
  }, [room]);

  const isHost = room?.hostId === socket.id;

  const modeState = useMemo(() => {
    if (!module?.createSelectors) return {};
    return module.createSelectors({ room, me, players, opponent, isHost });
  }, [module, room, me, players, opponent, isHost]);

  const canGuessDuel = room?.mode === "duel" ? Boolean(modeState.canGuess) : false;
  const canGuessShared = room?.mode === "shared" ? Boolean(modeState.canGuess) : false;
  const canGuessBattle = room?.mode === "battle" ? Boolean(modeState.canGuess) : false;

  const letterStates = modeState.letterStates || {};
  const shouldShowVictory = Boolean(modeState.shouldShowVictory);
  const duelSecrets = modeState.duelSecrets || { leftSecret: null, rightSecret: null };

  return {
    me,
    players,
    allPlayers,
    otherPlayers,
    opponent,
    isHost,
    canGuessDuel,
    canGuessShared,
    canGuessBattle,
    letterStates,
    shouldShowVictory,
    duelSecrets,
  };
}
