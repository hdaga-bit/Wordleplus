// server/index.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scoreGuess } from "./game.js";

// ---------- Word list loader (.txt) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORDLIST_PATH =
  process.env.WORDLIST_PATH || path.join(__dirname, "words.txt");

let WORDS = [];
let WORDSET = new Set();
const ROUND_MS = Number(process.env.DUEL_ROUND_MS || 360000); // 2 minutes

function loadWords() {
  const raw = fs.readFileSync(WORDLIST_PATH, "utf8");
  const arr = raw
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toUpperCase())
    .filter((w) => /^[A-Z]{5}$/.test(w)); // only A–Z 5-letter words

  WORDS = Array.from(new Set(arr)); // dedupe
  WORDSET = new Set(WORDS);
  console.log(`[words] Loaded ${WORDS.length} entries from ${WORDLIST_PATH}`);
}
loadWords();

function isValidWordLocal(word) {
  if (!word) return false;
  const w = word.toUpperCase();
  return /^[A-Z]{5}$/.test(w) && WORDSET.has(w);
}

// ---------- Express app ----------
const app = express();

// CORS: allow localhost (dev) and your Vercel site (prod). Allow no-origin (curl/WS upgrades).
// const corsOptions = {
//   origin: (origin, cb) => {
//     const allowed = [
//       "http://localhost:5173",
//       "http://localhost:8081",

//       process.env.NODE_ENV === "production"
//         ? "https://wordleplus-gamma.vercel.app"
//         : null,
//     ].filter(Boolean);
//     if (!origin || allowed.includes(origin)) cb(null, true);
//     else cb(new Error(`CORS blocked: ${origin}`), false);
//   },
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type"],
// };
const corsOptions = {
  origin: (origin, cb) => {
    // In dev, allow all (React Native often sends no Origin)
    cb(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health + validate
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/validate", (req, res) => {
  const word = (req.query.word || "").toString();
  res.json({ valid: isValidWordLocal(word) });
});

// GET /api/random?letters=5 -> { word: "FLARE" }
app.get("/api/random", (_req, res) => {
  // we only have 5-letter words in WORDS, but keep the param for future use
  const pool = WORDS; // or filter by length if you add other lists later
  const word = pool[Math.floor(Math.random() * pool.length)] || null;
  res.json({ word });
});

// GET /api/random-word -> { word: "FLARE" }
app.get("/api/random-word", (_req, res) => {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  res.json({ word: w });
});

// Optional: hot-reload words (disable/protect in prod)
app.post("/api/reload-words", (_req, res) => {
  try {
    loadWords();
    res.json({ ok: true, count: WORDS.length });
  } catch (e) {
    console.error("reload-words failed:", e);
    res.status(500).json({ ok: false });
  }
});

// ---------- Rooms ----------
/**
 * Room schema:
 * {
 *   id, mode: 'duel' | 'battle', hostId,
 *   players: { [socketId]: { name, guesses: [], done: false, ready: false, secret: string|null } },
 *   started, winner,
 *   duelReveal?: { [socketId]: secret }, // populated at end of duel
 *   battle: { secret, started, winner, reveal }
 * }
 */
const rooms = new Map();

function maybeStartDuel(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.mode !== "duel") return;

  const ids = Object.keys(room.players);
  if (ids.length !== 2) return;

  const allReady = ids.every(
    (id) => room.players[id].ready && room.players[id].secret
  );
  if (allReady && !room.started) {
    room.started = true;
    room.duelDeadline = Date.now() + ROUND_MS; // ⬅️ set deadline

    // fresh state at start
    ids.forEach((id) => {
      room.players[id].guesses = [];
      room.players[id].done = false;
    });
    // clear any previous reveal from last round
    room.duelReveal = undefined;
    // start authoritative round timer
    room.duelDeadline = Date.now() + ROUND_MS;
    if (room._duelTimer) {
      clearTimeout(room._duelTimer);
      room._duelTimer = null;
    }
    room._duelTimer = setTimeout(() => endDuelByTimeout(roomId), ROUND_MS);
    rooms.set(roomId, room);
    io.to(roomId).emit("roomState", sanitizeRoom(room));
  }
}

function updateStatsOnWin(room, winnerId) {
  if (!winnerId || winnerId === "draw") return;
  const p = room.players[winnerId];
  if (!p) return;
  p.wins = (p.wins || 0) + 1;
  p.streak = (p.streak || 0) + 1;

  // reset others' streaks
  Object.keys(room.players).forEach((id) => {
    if (id !== winnerId) room.players[id].streak = 0;
  });
}
// Ends a duel round when the timer expires
function endDuelByTimeout(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.mode !== "duel" || !room.started) return;
  // Mark everyone as done so computeDuelWinner can resolve outcome
  Object.values(room.players).forEach((p) => (p.done = true));
  // Compute winner (fewest steps; ties → draw)
  computeDuelWinner(room); // this can set winner + duelReveal + started=false

  // Ensure reveal exists even if computeDuelWinner didn't set it yet
  if (!room.duelReveal) {
    const ids = Object.keys(room.players);
    if (ids.length === 2) {
      const [a, b] = ids;
      room.duelReveal = {
        [a]: room.players[a].secret,
        [b]: room.players[b].secret,
      };
    }
  }

  // Don't restart - just emit final state
  io.to(roomId).emit("roomState", sanitizeRoom(room));
}

// Reset round-scoped flags (not stats)
function resetRoundFlags(room) {
  room.winner = null;
  room.duelReveal = undefined;
  room.roundClosed = false; // NEW guard to avoid double stats
}

// ---------- HTTP + Socket.IO (same server) ----------
const httpServer = createServer(app);
// const io = new Server(httpServer, { cors: corsOptions });
const io = new Server(httpServer, {
  cors: {
    origin: true, // or ['https://964d668fba0f.ngrok-free.app ']
    methods: ["GET", "POST"],
  },
  pingInterval: 10000, // send pings every 10s
  pingTimeout: 30000, // allow 30s before declaring dead
  allowEIO3: true, // helps older clients/proxies
  perMessageDeflate: false, // avoid some proxies’ compression issues
});

// ---------- Battle helpers ----------
function endBattleRound(room, winnerId = null) {
  console.log("[DEBUG] endBattleRound called", {
    roomId: room.id,
    winnerId,
    currentSecret: room.battle.secret,
    battleStarted: room.battle.started,
  });

  // stop the round
  room.battle.started = false;
  room.battle.winner = winnerId || null;
  console.log("[DEBUG] Setting battle winner in endBattleRound:", winnerId);

  // reveal the word that was just played
  room.battle.lastRevealedWord = room.battle.secret || null;

  console.log("[DEBUG] after setting lastRevealedWord", {
    lastRevealedWord: room.battle.lastRevealedWord,
    secret: room.battle.secret,
  });

  // mark non-host players done (optional nicety)
  Object.keys(room.players).forEach((pid) => {
    if (pid !== room.hostId) room.players[pid].done = true;
  });

  // stats (only once)
  if (winnerId && !room.roundClosed) {
    updateStatsOnWin(room, winnerId);
  }
  room.roundClosed = true;

  console.log("[battle] round ended", {
    roomId: room.id,
    winner: winnerId || null,
    lastRevealedWord: room.battle.lastRevealedWord,
  });

  // Update the room in the rooms Map
  rooms.set(room.id, room);
  console.log("[DEBUG] Room updated in Map:", {
    roomId: room.id,
    lastRevealedWord: room.battle.lastRevealedWord,
    battleObject: room.battle,
  });
}

// ---------- Socket handlers ----------
io.on("connection", (socket) => {
  socket.on("syncRoom", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    socket.join(roomId);
    cb?.({ ok: true, state: sanitizeRoom(room) });
  });
  // DUEL: play again (reset room to pre-start state)
  socket.on("duelPlayAgain", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "duel") return cb?.({ error: "Wrong mode" });

    // Mark this player as requesting rematch
    if (room.players[socket.id]) {
      room.players[socket.id].rematchRequested = true;
    }

    // Check if both players have requested rematch
    const playerIds = Object.keys(room.players);
    const bothRequested = playerIds.every(
      (id) => room.players[id].rematchRequested
    );

    if (bothRequested) {
      // Reset the game for both players
      Object.values(room.players).forEach((p) => {
        p.guesses = [];
        p.done = false;
        p.ready = false;
        p.secret = null;
        p.rematchRequested = false; // Reset rematch flag
        // keep wins/streak
      });

      room.started = false;
      resetRoundFlags(room);
      room.duelDeadline = null;
      if (room._duelTimer) {
        clearTimeout(room._duelTimer);
        room._duelTimer = null;
      }
    }

    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true, bothRequested });
  });

  // RESUME: client sends oldId + roomId after reconnect; we move their state
  socket.on("resume", ({ roomId, oldId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });

    const oldPlayer = room.players[oldId];
    if (!oldPlayer) return cb?.({ error: "Old session not found" });

    // If the new socket id already exists (e.g., auto-joined), remove/merge it
    if (room.players[socket.id] && socket.id !== oldId) {
      delete room.players[socket.id];
    }

    // Move the player state to the new socket id
    room.players[socket.id] = { ...oldPlayer, disconnected: false };

    // CRITICAL: Restore host status if this was the host
    if (room.hostId === oldId) {
      room.hostId = socket.id;
      console.log(`Host reconnected: ${oldId} -> ${socket.id}`);
    }

    // Restore other references
    if (room.battle?.winner === oldId) {
      console.log(
        "[DEBUG] Updating battle winner due to reconnection:",
        oldId,
        "->",
        socket.id
      );
      room.battle.winner = socket.id;
    }
    if (room.winner === oldId) room.winner = socket.id;

    delete room.players[oldId];

    socket.join(roomId);
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const [id, room] of rooms) {
      if (room.players[socket.id]) {
        room.players[socket.id].disconnected = true;
        room.players[socket.id].disconnectedAt = Date.now();
        io.to(id).emit("roomState", sanitizeRoom(room));
      }
    }
  });

  // Optional sweeper (every 5 minutes):
  setInterval(() => {
    const TTL = 30 * 60 * 1000;
    const now = Date.now();
    for (const room of rooms.values()) {
      for (const pid of Object.keys(room.players)) {
        const p = room.players[pid];
        if (
          p.disconnected &&
          p.disconnectedAt &&
          now - p.disconnectedAt > TTL
        ) {
          // If they were host, pass host to first connected player
          if (room.hostId === pid) {
            const next = Object.keys(room.players).find(
              (id) => !room.players[id].disconnected && id !== pid
            );
            if (next) room.hostId = next;
          }
          delete room.players[pid];
        }
      }
    }
  }, 5 * 60 * 1000);

  socket.on("createRoom", ({ name, mode = "duel" }, cb) => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room = {
      id,
      mode,
      hostId: socket.id,
      players: {},
      started: false,
      winner: null,
      duelReveal: undefined,
      duelDeadline: null, // ⬅️ add this

      battle: {
        secret: null, // internal only, never sent to clients
        started: false,
        winner: null,
        lastRevealedWord: null, // <-- new, the one true source for Results
      },
    };

    // when creating the room:
    room.players[socket.id] = {
      name,
      ready: false,
      secret: null,
      guesses: [],
      done: false,
      // NEW
      wins: 0,
      streak: 0,
      disconnected: false,
      rematchRequested: false,
    };
    rooms.set(id, room);
    socket.join(id);
    cb?.({ roomId: id });
    io.to(id).emit("roomState", sanitizeRoom(room));
  });

  // socket.on("joinRoom", ({ name, roomId }, cb) => {
  //   const room = rooms.get(roomId);
  //   if (!room) return cb?.({ error: "Room not found" });
  //   if (room.mode === "duel" && Object.keys(room.players).length >= 2)
  //     return cb?.({ error: "Room is full" });
  //   // when creating the room:
  //   room.players[socket.id] = {
  //     name,
  //     ready: false,
  //     secret: null,
  //     guesses: [],
  //     done: false,
  //     // NEW
  //     wins: 0,
  //     streak: 0,
  //     disconnected: false,
  //     rematchRequested: false,
  //   };
  //   socket.join(roomId);
  //   cb?.({ ok: true });
  //   io.to(roomId).emit("roomState", sanitizeRoom(room));
  // });

  socket.on("joinRoom", ({ name, roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode === "duel" && Object.keys(room.players).length >= 2)
      return cb?.({ error: "Room is full" });

    // 1) Try to find a disconnected entry with same name
    const oldId = Object.keys(room.players).find(
      (id) =>
        (room.players[id].name || "").trim().toLowerCase() ===
          (name || "").trim().toLowerCase() && room.players[id].disconnected
    );

    if (oldId) {
      // 2) Remove any auto-created placeholder for this new socket (defensive)
      if (room.players[socket.id] && socket.id !== oldId) {
        delete room.players[socket.id];
      }

      // 3) Move the old state to the new socket.id
      const old = room.players[oldId];
      room.players[socket.id] = { ...old, disconnected: false };

      // 4) Fix references that pointed at oldId
      if (room.hostId === oldId) room.hostId = socket.id;
      if (room.winner === oldId) room.winner = socket.id;
      if (room.battle?.winner === oldId) room.battle.winner = socket.id;

      // 5) Delete the stale entry
      delete room.players[oldId];

      socket.join(roomId);
      io.to(roomId).emit("roomState", sanitizeRoom(room));
      return cb?.({ ok: true, resumed: true });
    }

    // 6) No prior disconnected state → create fresh
    room.players[socket.id] = {
      name,
      ready: false,
      secret: null,
      guesses: [],
      done: false,
      wins: 0,
      streak: 0,
      disconnected: false,
      rematchRequested: false,
    };

    socket.join(roomId);
    cb?.({ ok: true, resumed: false });
    io.to(roomId).emit("roomState", sanitizeRoom(room));
  });

  // ----- DUEL -----
  socket.on("setSecret", ({ roomId, secret }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.mode !== "duel") return;
    if (!isValidWordLocal(secret)) return cb?.({ error: "Invalid word" });
    room.players[socket.id].secret = secret.toUpperCase();
    room.players[socket.id].ready = true;
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    maybeStartDuel(roomId);
    cb?.({ ok: true });
  });

  // ----- MAKE GUESS (both modes) -----
  socket.on("makeGuess", ({ roomId, guess }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });

    const raw = String(guess || "");
    const up = raw.toUpperCase();

    if (!isValidWordLocal(raw)) {
      console.log("[makeGuess] invalid word", {
        roomId,
        player: socket.id,
        raw,
        up,
      });
      return cb?.({ error: "Invalid word" });
    }

    // DUEL logic
    if (room.mode === "duel") {
      if (!room.started) return cb?.({ error: "Game not started" });

      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Not in room" });
      if (player.done) return cb?.({ error: "You already finished" });

      const oppId = getOpponent(room, socket.id);
      if (!oppId) return cb?.({ error: "Waiting for opponent" });

      const opp = room.players[oppId];
      if (!opp?.secret) return cb?.({ error: "Opponent not ready" });

      const g = up;
      const pattern = scoreGuess(opp.secret, g);
      player.guesses.push({ guess: g, pattern });

      if (g === opp.secret || player.guesses.length >= 6) {
        player.done = true;
      }

      computeDuelWinner(room);

      // If computeDuelWinner already ended the round, clear the timer
      if (!room.started && room._duelTimer) {
        clearTimeout(room._duelTimer);
        room._duelTimer = null;
        room.duelDeadline = null;
      }
      // End-of-round: stop round and reveal both secrets for the victory modal
      const ids = Object.keys(room.players);
      if (ids.length === 2) {
        const [a, b] = ids;
        const A = room.players[a],
          B = room.players[b];
        const bothDone = A.done && B.done;

        if ((room.winner || bothDone) && !room.roundClosed) {
          room.started = false; // mark ended
          room.duelReveal = { [a]: A.secret, [b]: B.secret };

          // Apply stats exactly once
          if (room.winner && room.winner !== "draw") {
            updateStatsOnWin(room, room.winner);
          }
          room.roundClosed = true;
          room.duelDeadline = null;
          if (room._duelTimer) {
            clearTimeout(room._duelTimer);
            room._duelTimer = null;
          }
        }
      }
      io.to(roomId).emit("roomState", sanitizeRoom(room));
      return cb?.({ ok: true, pattern });
    }

    // BATTLE logic
    if (room.mode === "battle") {
      console.log("[DEBUG] makeGuess BATTLE called", {
        roomId,
        playerId: socket.id,
        guess,
        battleStarted: room.battle.started,
        battleWinner: room.battle.winner,
        secret: room.battle.secret,
      });

      if (socket.id === room.hostId) {
        return cb?.({ error: "Host is spectating this round" });
      }
      if (!room.battle.started) return cb?.({ error: "Battle not started" });

      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Not in room" });
      if (player.done) return cb?.({ error: "No guesses left" });

      const g = up;
      const pattern = scoreGuess(room.battle.secret, g);
      player.guesses.push({ guess: g, pattern });

      let endNow = false;

      if (g === room.battle.secret) {
        console.log("[DEBUG] Player won, calling endBattleRound", {
          roomId,
          playerId: socket.id,
          secret: room.battle.secret,
          guess: g,
        });
        endBattleRound(room, socket.id);
        endNow = true;
      } else if (player.guesses.length >= 6) {
        player.done = true;

        // if all non-host players are done and no winner, end and reveal
        const nonHostIds = Object.keys(room.players).filter(
          (pid) => pid !== room.hostId
        );
        const allDone = nonHostIds.every((pid) => room.players[pid].done);

        if (allDone && !room.battle.winner) {
          console.log("[DEBUG] All players done, calling endBattleRound", {
            roomId,
            secret: room.battle.secret,
            allDone,
          });
          endBattleRound(room, null); // reveal on draw
          endNow = true;
        }
      }

      if (endNow) {
        console.log("[emit] battle:", {
          started: room.battle.started,
          winner: room.battle.winner,
          lastRevealedWord: room.battle.lastRevealedWord,
        });
        const sanitizedRoom = sanitizeRoom(room);
        console.log(
          "[DEBUG] sanitized room battle data:",
          sanitizedRoom.battle
        );
        io.to(roomId).emit("roomState", sanitizedRoom);
        return cb?.({ ok: true, pattern });
      }

      // If we reach here, the game didn't end through endBattleRound
      // Let's check if there's a winner but no lastRevealedWord
      if (room.battle.winner && !room.battle.lastRevealedWord) {
        console.log(
          "[DEBUG] WARNING: Game has winner but no lastRevealedWord! Calling endBattleRound now..."
        );
        endBattleRound(room, room.battle.winner);
        io.to(roomId).emit("roomState", sanitizeRoom(room));
        return cb?.({ ok: true, pattern });
      }

      io.to(roomId).emit("roomState", sanitizeRoom(room));
      return cb?.({ ok: true, pattern });
    }
  });

  // ----- BATTLE HOST CONTROLS -----
  socket.on("setHostWord", ({ roomId, secret }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "battle") return cb?.({ error: "Wrong mode" });
    if (socket.id !== room.hostId)
      return cb?.({ error: "Only host can set word" });
    if (!isValidWordLocal(secret)) return cb?.({ error: "Invalid word" });

    room.battle.secret = secret.toUpperCase();
    console.log("[battle] host set secret:", {
      roomId,
      secret: room.battle.secret,
    });

    Object.values(room.players).forEach((p) => {
      p.guesses = [];
      p.done = false;
    });
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("startBattle", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "battle") return cb?.({ error: "Wrong mode" });
    if (socket.id !== room.hostId)
      return cb?.({ error: "Only host can start" });
    if (!room.battle.secret) return cb?.({ error: "Set a word first" });
    if (Object.keys(room.players).length < 2)
      return cb?.({ error: "Need at least 2 players" });

    room.battle.started = true;
    console.log("[DEBUG] Clearing battle winner in startBattle");
    room.battle.winner = null;
    room.roundClosed = false;

    console.log("[emit] battle start:", {
      started: room.battle.started,
      winner: room.battle.winner,
      lastRevealedWord: room.battle.lastRevealedWord,
    });
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("playAgain", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "battle") return cb?.({ error: "Wrong mode" });
    if (socket.id !== room.hostId)
      return cb?.({ error: "Only host can reset" });

    Object.values(room.players).forEach((p) => {
      p.guesses = [];
      p.done = false;
    });
    room.battle.started = false;
    room.battle.winner = null;
    // Don't clear lastRevealedWord on resets - leave it intact
    // Don't clear the secret immediately - keep it for display until new word is set
    // room.battle.secret = null; // require new word
    room.roundClosed = false;

    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });
});

// ---------- Helpers ----------
function getOpponent(room, socketId) {
  return Object.keys(room.players).find((id) => id !== socketId);
}

function computeDuelWinner(room) {
  let winner = null;
  const ids = Object.keys(room.players);
  if (ids.length === 2) {
    const [a, b] = ids;
    const A = room.players[a];
    const B = room.players[b];
    const aSolved = A.guesses.some((g) => g.guess === room.players[b].secret);
    const bSolved = B.guesses.some((g) => g.guess === room.players[a].secret);

    if (aSolved && !bSolved) winner = a;
    else if (!aSolved && bSolved) winner = b;
    else if ((A.done && B.done) || (aSolved && bSolved)) {
      const aSteps =
        A.guesses.findIndex((g) => g.guess === room.players[b].secret) + 1 ||
        999;
      const bSteps =
        B.guesses.findIndex((g) => g.guess === room.players[a].secret) + 1 ||
        999;
      if (aSteps < bSteps) winner = a;
      else if (bSteps < aSteps) winner = b;
      else winner = "draw";
    }
  }

  if (winner) {
    room.winner = winner;
    const ids = Object.keys(room.players);
    if (ids.length === 2) {
      const [a, b] = ids;
      const A = room.players[a],
        B = room.players[b];
      if (winner !== "draw") {
        const loser = winner === a ? b : a;
        room.players[winner].wins = (room.players[winner].wins || 0) + 1;
        room.players[winner].streak = (room.players[winner].streak || 0) + 1;
        room.players[loser].streak = 0;
      } else {
        // draw: reset both streaks? choose your rule; here we reset both
        A.streak = 0;
        B.streak = 0;
      }
      room.duelReveal = { [a]: A.secret, [b]: B.secret };
      room.started = false;
      room.duelDeadline = null;

      if (room._duelTimer) {
        clearTimeout(room._duelTimer);
        room._duelTimer = null;
      }
    }
  }
}

function sanitizeRoom(room) {
  if (room.mode === "battle") {
    console.log("[DEBUG] sanitizeRoom battle data", {
      started: room.battle.started,
      winner: room.battle.winner,
      secret: room.battle.secret,
      lastRevealedWord: room.battle.lastRevealedWord,
      roundClosed: room.roundClosed,
    });
  }

  const players = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => {
      const {
        name,
        ready,
        guesses,
        done,
        wins = 0,
        streak = 0,
        disconnected = false,
        rematchRequested = false,
      } = p;
      return [
        id,
        {
          id,
          name,
          ready,
          guesses,
          done,
          wins,
          streak,
          disconnected,
          rematchRequested,
        },
      ];
    })
  );

  // --- Safe fallback: after a round has ended (roundClosed === true),
  // if lastRevealedWord is missing but we still have the internal secret,
  // expose the secret as the last revealed word.
  let lastWord = room.battle.lastRevealedWord ?? null;
  if (
    !room.battle.started &&
    room.roundClosed &&
    !lastWord &&
    room.battle.secret
  ) {
    lastWord = room.battle.secret;
    console.warn(
      "[GUARD] lastRevealedWord missing after round end, falling back to secret:",
      {
        roomId: room.id,
        lastWord,
      }
    );
  }

  return {
    id: room.id,
    mode: room.mode,
    hostId: room.hostId,
    players,
    started: room.started,
    winner: room.winner,
    duelReveal: room.duelReveal || undefined,
    duelDeadline: room.duelDeadline ?? null,
    battle: {
      started: room.battle.started,
      winner: room.battle.winner,
      hasSecret: !!room.battle.secret,
      secret: null, // never leak current/next secret
      lastRevealedWord: lastWord, // <-- guarded value to clients
    },
  };
}
// ---------- Start server ----------
const PORT = process.env.PORT || 8080; // Railway injects PORT in prod
httpServer.listen(PORT, () => console.log("Server listening on", PORT));
