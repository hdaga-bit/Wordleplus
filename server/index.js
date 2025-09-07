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
const ROUND_MS = Number(process.env.DUEL_ROUND_MS || 120000); // 2 minutes

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
// ---------- Duel timer ----------
// Configure via env DUEL_ROUND_SECONDS (defaults to 180s = 3 minutes)
const DUEL_ROUND_MS = Number(process.env.DUEL_ROUND_SECONDS || 180) * 1000;

// ---------- Express app ----------
const app = express();

// CORS: allow localhost (dev) and your Vercel site (prod). Allow no-origin (curl/WS upgrades).
const corsOptions = {
  origin: (origin, cb) => {
    const allowed = [
      "http://localhost:5173",
      process.env.NODE_ENV === "production"
        ? "https://wordleplus-gamma.vercel.app"
        : null,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health + validate
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/validate", (req, res) => {
  const word = (req.query.word || "").toString();
  res.json({ valid: isValidWordLocal(word) });
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
    room.duelDeadline = Date.now() + DUEL_ROUND_MS;
    if (room._duelTimer) {
      clearTimeout(room._duelTimer);
      room._duelTimer = null;
    }
    room._duelTimer = setTimeout(() => endDuelByTimeout(roomId), DUEL_ROUND_MS);
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

  room.started = false;
  room.roundClosed = true;
  room.duelDeadline = null;
  if (room._duelTimer) {
    clearTimeout(room._duelTimer);
    room._duelTimer = null;
  }

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
const io = new Server(httpServer, { cors: corsOptions });

// ---------- Socket handlers ----------
io.on("connection", (socket) => {
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
    if (room.battle?.winner === oldId) room.battle.winner = socket.id;
    if (room.winner === oldId) room.winner = socket.id;

    delete room.players[oldId];

    socket.join(roomId);
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const [id, room] of rooms) {
      if (room.players[socket.id]) {
        // mark as disconnected; keep their state for resume
        room.players[socket.id].disconnected = true;

        // If absolutely nobody remains connected you can optionally keep the room;
        io.to(id).emit("roomState", sanitizeRoom(room));

        // DO NOT delete player; DO NOT delete room.
      }
    }
  });

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

      battle: { secret: null, started: false, winner: null, reveal: null },
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

  socket.on("joinRoom", ({ name, roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode === "duel" && Object.keys(room.players).length >= 2)
      return cb?.({ error: "Room is full" });
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
    socket.join(roomId);
    cb?.({ ok: true });
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
    if (!isValidWordLocal(guess)) return cb?.({ error: "Invalid word" });

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

      const g = (guess || "").toUpperCase();
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
      if (socket.id === room.hostId) {
        return cb?.({ error: "Host is spectating this round" });
      }
      if (!room.battle.started) return cb?.({ error: "Battle not started" });

      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Not in room" });
      if (player.done) return cb?.({ error: "No guesses left" });

      const g = (guess || "").toUpperCase();
      const pattern = scoreGuess(room.battle.secret, g);
      player.guesses.push({ guess: g, pattern });

      let endNow = false;

      if (g === room.battle.secret) {
        room.battle.winner = socket.id;
        room.battle.started = false;
        // Keep the secret available for display, don't clear it
        endNow = true;

        // mark others done
        Object.keys(room.players).forEach((pid) => {
          if (pid !== socket.id) room.players[pid].done = true;
        });

        if (!room.roundClosed) {
          updateStatsOnWin(room, socket.id);
          room.roundClosed = true;
        }
      } else if (player.guesses.length >= 6) {
        player.done = true;

        // if all non-host players are done and no winner, end and reveal
        const nonHostIds = Object.keys(room.players).filter(
          (pid) => pid !== room.hostId
        );
        const allDone = nonHostIds.every((pid) => room.players[pid].done);

        if (allDone && !room.battle.winner) {
          room.battle.started = false;
          // Keep the secret available for display, don't clear it
          endNow = true;
          // No winner -> no stats update
          room.roundClosed = true;
        }
      }

      if (endNow) {
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

    // Store the old secret as the revealed word before setting the new one
    if (room.battle.secret && !room.battle.revealedWord) {
      room.battle.revealedWord = room.battle.secret;
    }

    room.battle.secret = secret.toUpperCase();
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
    room.battle.winner = null;
    room.battle.reveal = null;
    room.roundClosed = false;

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
    room.battle.reveal = null;
    room.battle.revealedWord = null; // Clear the revealed word for new round
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
  // Debug logging

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
      reveal: room.battle.reveal,
      hasSecret: !!room.battle.secret,
      secret: room.battle.started ? null : room.battle.secret, // hide during round
      revealedWord: room.battle.revealedWord ?? null,
    },
  };
}
// ---------- Start server ----------
const PORT = process.env.PORT || 8080; // Railway injects PORT in prod
httpServer.listen(PORT, () => console.log("Server listening on", PORT));
