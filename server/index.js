import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { scoreGuess } from "./game.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORDLIST_PATH =
  process.env.WORDLIST_PATH || path.join(__dirname, "words.txt");

let WORDS = [];
let WORDSET = new Set();

function loadWords() {
  const raw = fs.readFileSync(WORDLIST_PATH, "utf8");
  // normalize: trim, uppercase, drop blanks, dedupe, keep only A–Z 5-letter
  const arr = raw
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toUpperCase())
    .filter((w) => /^[A-Z]{5}$/.test(w));

  WORDS = Array.from(new Set(arr)); // dedupe, keep order
  WORDSET = new Set(WORDS);

  console.log(`[words] Loaded ${WORDS.length} entries from ${WORDLIST_PATH}`);
}

// call on boot
loadWords();

const app = express();
// app.use(cors({ origin: "amusing-endurance-production.up.railway.app" }));
const FRONTEND = 'https://wordleplus-gamma.vercel.app';

app.use(cors({ origin: FRONTEND }));

const io = new Server(httpServer, {
  cors: { origin: FRONTEND }
});
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
// app.get("/api/validate", (req, res) =>
//   res.json({ valid: isValidWord((req.query.word || "").toString(), WORDLIST) })
// );

// /api/validate
app.get('/api/validate', (req, res) => {
  const word = (req.query.word || '').toString();
  res.json({ valid: isValidWordLocal(word) });
});

// // In game events:
// if (!isValidWordLocal(secret)) return cb?.({ error: 'Invalid word' });
// if (!isValidWordLocal(guess))  return cb?.({ error: 'Invalid word' });

const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: { origin: "amusing-endurance-production.up.railway.app" },
// });

/**
 * Room schema
 * {
 *   id, mode: 'duel' | 'battle', hostId,
 *   players: { [socketId]: { name, guesses: [], done: false, ready: false, secret: string|null } },
 *   started, winner,
 *   battle: { secret, started, winner, reveal }
 * }
 */
const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name, mode = "duel" }, cb) => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room = {
      id,
      mode,
      hostId: socket.id,
      players: {},
      started: false,
      winner: null,
      battle: { secret: null, started: false, winner: null, reveal: null },
    };
    room.players[socket.id] = {
      name,
      ready: false,
      secret: null,
      guesses: [],
      done: false,
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
    room.players[socket.id] = {
      name,
      ready: false,
      secret: null,
      guesses: [],
      done: false,
    };
    socket.join(roomId);
    cb?.({ ok: true });
    io.to(roomId).emit("roomState", sanitizeRoom(room));
  });

  // DUEL
  socket.on("setSecret", ({ roomId, secret }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.mode !== "duel") return;
    if (!isValidWord(secret, WORDLIST)) return cb?.({ error: "Invalid word" });
    room.players[socket.id].secret = secret.toUpperCase();
    room.players[socket.id].ready = true;
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    maybeStartDuel(roomId);
    cb?.({ ok: true });
  });

  socket.on("makeGuess", ({ roomId, guess }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (!isValidWord(guess, WORDLIST)) return cb?.({ error: "Invalid word" });

    if (room.mode === "duel") {
      if (!room.started) return cb?.({ error: "Game not started" });
      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Not in room" });
      if (player.done) return cb?.({ error: "You already finished" });

      const oppId = getOpponent(room, socket.id);
      if (!oppId) return cb?.({ error: "Waiting for opponent" });
      const oppSecret = room.players[oppId].secret;
      const pattern = scoreGuess(oppSecret, guess);
      player.guesses.push({ guess: guess.toUpperCase(), pattern });
      if (guess.toUpperCase() === oppSecret || player.guesses.length >= 6)
        player.done = true;
      computeDuelWinner(room);
      io.to(roomId).emit("roomState", sanitizeRoom(room));
      return cb?.({ ok: true, pattern });
    }

    if (room.mode === "battle") {
      if (!room.battle.started) return cb?.({ error: "Battle not started" });
      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Not in room" });
      if (player.done) return cb?.({ error: "No guesses left" });
      const pattern = scoreGuess(room.battle.secret, guess);
      player.guesses.push({ guess: guess.toUpperCase(), pattern });
      if (guess.toUpperCase() === room.battle.secret) {
        room.battle.winner = socket.id;
        room.battle.started = false;
        room.battle.reveal = room.battle.secret;
        Object.keys(room.players).forEach((pid) => {
          if (pid !== socket.id) room.players[pid].done = true;
        });
      } else if (player.guesses.length >= 6) {
        player.done = true;
        if (Object.values(room.players).every((p) => p.done)) {
          room.battle.started = false;
          room.battle.reveal = room.battle.secret;
        }
      }
      io.to(roomId).emit("roomState", sanitizeRoom(room));
      return cb?.({ ok: true, pattern });
    }
  });

  // BATTLE HOST CONTROLS
  socket.on("setHostWord", ({ roomId, secret }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "battle") return cb?.({ error: "Wrong mode" });
    if (socket.id !== room.hostId)
      return cb?.({ error: "Only host can set word" });
    if (!isValidWord(secret, WORDLIST)) return cb?.({ error: "Invalid word" });
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
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("playAgain", ({ roomId, keepWord = false }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "battle") return cb?.({ error: "Wrong mode" });
    if (socket.id !== room.hostId)
      return cb?.({ error: "Only host can reset" });
    // reset players & battle state
    Object.values(room.players).forEach((p) => {
      p.guesses = [];
      p.done = false;
    });
    room.battle.started = false;
    room.battle.winner = null;
    room.battle.reveal = null;
    if (!keepWord) {
      room.battle.secret = null;
    }
    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const [id, room] of rooms) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(id).emit("roomState", sanitizeRoom(room));
        if (Object.keys(room.players).length === 0) rooms.delete(id);
      }
    }
  });
});

function getOpponent(room, socketId) {
  return Object.keys(room.players).find((id) => id !== socketId);
}
function computeDuelWinner(room) {
  let winner = null;
  const ids = Object.keys(room.players);
  if (ids.length === 2) {
    const [a, b] = ids;
    const A = room.players[a],
      B = room.players[b];
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
  if (winner) room.winner = winner;
}
function sanitizeRoom(room) {
  const players = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => {
      const { name, ready, guesses, done } = p;
      return [id, { name, ready, guesses, done }];
    })
  );
  return {
    id: room.id,
    mode: room.mode,
    hostId: room.hostId,
    players,
    started: room.started,
    winner: room.winner,
    battle: {
      started: room.battle.started,
      winner: room.battle.winner,
      reveal: room.battle.reveal,
      hasSecret: !!room.battle.secret,
    },
  };
}

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => console.log("Server listening on", PORT));
