const MAX_SHARED_GUESSES = 6;

function activePlayerIds(room) {
  return Object.entries(room.players || {})
    .filter(([, player]) => !player.disconnected)
    .map(([id]) => id);
}

function ensureQueue(room, pickRandomWords) {
  if (!room.shared.queue) {
    room.shared.queue = [];
  }
  if (room.shared.queue.length === 0) {
    room.shared.queue = pickRandomWords(3);
  }
}

export function initSharedRoom(room, { pickRandomWords }) {
  room.shared = {
    secret: null,
    started: false,
    turn: null,
    guesses: [],
    winner: null,
    lastRevealedWord: null,
    queue: pickRandomWords(10),
    maxGuesses: MAX_SHARED_GUESSES,
  };
}

export function canJoinShared(room, { isRejoin } = {}) {
  if (isRejoin) return { ok: true };
  const active = activePlayerIds(room);
  if (active.length >= 2) {
    return { error: "Shared duel supports exactly two players" };
  }
  return { ok: true };
}

export function startSharedRound({ room, socketId, pickRandomWords }) {
  if (!room.shared) return { error: "Room not configured for shared mode" };
  if (socketId !== room.hostId) {
    return { error: "Only host can start the round" };
  }

  const active = activePlayerIds(room);
  if (active.length !== 2) {
    return { error: "Need exactly two players to start" };
  }

  ensureQueue(room, pickRandomWords);
  const secret = room.shared.queue.shift();
  if (!secret) {
    return { error: "No secret available" };
  }

  room.shared.secret = secret;
  room.shared.started = true;
  room.shared.winner = null;
  room.shared.guesses = [];
  room.shared.lastRevealedWord = null;
  room.shared.maxGuesses = room.shared.maxGuesses || MAX_SHARED_GUESSES;
  room.shared.turn = active.includes(room.hostId) ? room.hostId : active[0];
  room.winner = null;

  try {
    const masked = `${secret[0] || ''}***${secret[secret.length - 1] || ''}`;
    console.log(
      `[shared] startRequested room=${room.id} queueLen=${room.shared.queue.length} picked=${masked}`
    );
  } catch (err) {
    // ignore logging errors
  }

  return { ok: true };
}

export function handleSharedGuess({ room, socketId, guess, scoreGuess, updateStatsOnWin, getOpponent }) {
  if (!room.shared?.started) return { error: "Game not started" };

  const player = room.players[socketId];
  if (!player) return { error: "Not in room" };

  if (room.shared.turn !== socketId) {
    return { error: "Not your turn" };
  }

  if (!room.shared.secret) {
    return { error: "Secret not set for shared duel" };
  }

  const pattern = scoreGuess(room.shared.secret, guess);
  room.shared.guesses.push({ by: socketId, guess, pattern });

  const solved = guess === room.shared.secret;
  const reachedLimit = room.shared.guesses.length >= (room.shared.maxGuesses || MAX_SHARED_GUESSES);

  if (solved) {
    room.shared.winner = socketId;
    room.shared.started = false;
    room.shared.lastRevealedWord = room.shared.secret;
    updateStatsOnWin(room, socketId);
    room.winner = socketId;
    room.shared.turn = null;
    room.shared.secret = null;
  } else if (reachedLimit) {
    room.shared.winner = "draw";
    room.shared.started = false;
    room.shared.lastRevealedWord = room.shared.secret;
    room.winner = "draw";
    room.shared.turn = null;
    room.shared.secret = null;
  } else {
    const oppId = getOpponent(room, socketId);
    room.shared.turn = oppId || null;
  }

  return { ok: true, pattern };
}

export function resetSharedRound(room) {
  if (!room.shared) return;
  room.shared.secret = null;
  room.shared.started = false;
  room.shared.turn = null;
  room.shared.guesses = [];
  room.shared.winner = null;
  room.shared.lastRevealedWord = null;
}

export function handleSharedDisconnect(room, socketId) {
  if (!room.shared) return;
  if (room.shared.turn === socketId) {
    const remaining = activePlayerIds(room).filter((id) => id !== socketId);
    room.shared.turn = remaining[0] || null;
  }
}

export function sanitizeShared(room) {
  if (!room.shared) return undefined;
  return {
    started: room.shared.started,
    turn: room.shared.turn,
    winner: room.shared.winner,
    hasSecret: !!room.shared.secret,
    guesses: room.shared.guesses || [],
    lastRevealedWord: room.shared.lastRevealedWord || null,
    maxGuesses: room.shared.maxGuesses || MAX_SHARED_GUESSES,
  };
}
