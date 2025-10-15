function nonHostPlayerIds(room) {
  return Object.keys(room.players || {}).filter((pid) => pid !== room.hostId);
}

export function initBattleRoom(room) {
  room.battle = {
    secret: null,
    started: false,
    winner: null,
    lastRevealedWord: null,
  };
}

export function setHostWord({ room, secret, validateWord }) {
  if (!validateWord(secret)) {
    return { error: "Invalid word" };
  }
  room.battle.secret = secret.toUpperCase();
  Object.values(room.players).forEach((p) => {
    p.guesses = [];
    p.done = false;
  });
  return { ok: true };
}

export function startBattleRound({ room }) {
  if (!room.battle.secret) {
    return { error: "Set a word first" };
  }
  if (nonHostPlayerIds(room).length < 1) {
    return { error: "Need at least 2 players" };
  }
  room.battle.started = true;
  room.battle.winner = null;
  room.roundClosed = false;
  return { ok: true };
}

export function endBattleRound(room, winnerId, { updateStatsOnWin }) {
  room.battle.started = false;
  room.battle.winner = winnerId || null;
  room.battle.lastRevealedWord = room.battle.secret || null;
  nonHostPlayerIds(room).forEach((pid) => {
    room.players[pid].done = true;
  });
  if (winnerId && !room.roundClosed) {
    updateStatsOnWin(room, winnerId);
  }
  room.roundClosed = true;
}

export function handleBattleGuess({ room, socketId, guess, scoreGuess, updateStatsOnWin }) {
  if (socketId === room.hostId) {
    return { error: "Host is spectating this round" };
  }
  if (!room.battle.started) return { error: "Battle not started" };

  const player = room.players[socketId];
  if (!player) return { error: "Not in room" };
  if (player.done) return { error: "No guesses left" };

  const pattern = scoreGuess(room.battle.secret, guess);
  player.guesses.push({ guess, pattern });

  let ended = false;
  if (guess === room.battle.secret) {
    endBattleRound(room, socketId, { updateStatsOnWin });
    ended = true;
  } else if (player.guesses.length >= 6) {
    player.done = true;
    const allDone = nonHostPlayerIds(room).every((pid) => room.players[pid].done);
    if (allDone && !room.battle.winner) {
      endBattleRound(room, null, { updateStatsOnWin });
      ended = true;
    }
  }

  if (!ended && room.battle.winner && !room.battle.lastRevealedWord) {
    endBattleRound(room, room.battle.winner, { updateStatsOnWin });
    ended = true;
  }

  return { ok: true, pattern, ended };
}

export function resetBattleRound(room) {
  Object.values(room.players).forEach((p) => {
    p.guesses = [];
    p.done = false;
  });
  room.battle.started = false;
  room.battle.winner = null;
  room.roundClosed = false;
}

export function sanitizeBattle(room) {
  if (!room.battle) return undefined;
  return {
    started: room.battle.started,
    winner: room.battle.winner,
    hasSecret: !!room.battle.secret,
    secret: null,
    lastRevealedWord: room.battle.lastRevealedWord || null,
  };
}
