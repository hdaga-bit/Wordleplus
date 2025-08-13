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

// Allow your Vercel app in production and localhost in dev
// const FRONTEND_ORIGIN = "https://wordleplus-gamma.vercel.app";
// const corsOptions = {
//   origin: (origin, cb) => {
//     // allow no origin (curl, server-to-server), localhost, and your Vercel domain
//     if (
//       !origin ||
//       origin === FRONTEND_ORIGIN ||
//       /^http:\/\/localhost(?::\d+)?$/.test(origin)
//     ) {
//       cb(null, true);
//     } else {
//       cb(null, false);
//     }
//   },
// };
const FRONTEND_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://wordleplus-gamma.vercel.app"
    : "http://localhost:5173";
//NEW FOR LOCAL WITH DEPOOYED BACKEND
// const corsOptions = {
//   origin: (origin, cb) => {
//     // Allow no origin (e.g., curl, server-to-server), localhost, or the frontend origin
//     if (
//       !origin ||
//       origin === FRONTEND_ORIGIN ||
//       /^http:\/\/localhost(?::\d+)?$/.test(origin)
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error(`CORS blocked: ${origin}`), false); // Log the blocked origin for debugging
//     }
//   },
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type"],
// };
const corsOptions = {
  origin: (origin, cb) => {
    // Allow no origin, localhost:5173, and future Vercel URL
    const allowedOrigins = [
      "http://localhost:5173",
      process.env.NODE_ENV === "production"
        ? "https://wordleplus-gamma.vercel.app"
        : null,
    ].filter(Boolean); // Remove null
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`), false);
    }
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

// Optional: hot-reload words (disable or protect in prod)
app.post("/api/reload-words", (_req, res) => {
  try {
    loadWords();
    res.json({ ok: true, count: WORDS.length });
  } catch (e) {
    console.error("reload-words failed:", e);
    res.status(500).json({ ok: false });
  }
});

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
    // fresh state at start
    ids.forEach((id) => {
      room.players[id].guesses = [];
      room.players[id].done = false;
    });
    io.to(roomId).emit("roomState", sanitizeRoom(room));
  }
}
// ---------- HTTP + Socket.IO (same server) ----------
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

/**
 * Room schema:
 * {
 *   id, mode: 'duel' | 'battle', hostId,
 *   players: { [socketId]: { name, guesses: [], done: false, ready: false, secret: string|null } },
 *   started, winner,
 *   battle: { secret, started, winner, reveal }
 * }
 */
const rooms = new Map();

// ---------- Socket handlers ----------
io.on("connection", (socket) => {
  // DUEL: play again (reset room to pre-start state)
  socket.on("duelPlayAgain", ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: "Room not found" });
    if (room.mode !== "duel") return cb?.({ error: "Wrong mode" });

    // reset per‑player state
    Object.values(room.players).forEach((p) => {
      p.guesses = [];
      p.done = false;
      p.ready = false;
      p.secret = null;
    });

    // reset room flags
    room.started = false;
    room.winner = null;

    io.to(roomId).emit("roomState", sanitizeRoom(room));
    cb?.({ ok: true });
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
  // In server/index.js, after setSecret handler

  // Add or update maybeStartDuel

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

      const oppSecret = room.players[oppId].secret;
      const pattern = scoreGuess(oppSecret, guess);
      player.guesses.push({ guess: guess.toUpperCase(), pattern });

      if (guess.toUpperCase() === oppSecret || player.guesses.length >= 6) {
        player.done = true;
      }

      computeDuelWinner(room);
      const ids = Object.keys(room.players);
      if (ids.length === 2) {
        const [a, b] = ids;
        const A = room.players[a],
          B = room.players[b];
        const bothDone = A.done && B.done;
        if (room.winner || bothDone) {
          room.started = false; // round over
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

      const pattern = scoreGuess(room.battle.secret, guess);
      player.guesses.push({ guess: guess.toUpperCase(), pattern });

      if (guess.toUpperCase() === room.battle.secret) {
        room.battle.winner = socket.id;
        room.battle.started = false;
        room.battle.reveal = room.battle.secret;
        // mark others done
        Object.keys(room.players).forEach((pid) => {
          if (pid !== socket.id) room.players[pid].done = true;
        });
      } else if (player.guesses.length >= 6) {
        player.done = true;
        // if all done and no winner, end and reveal
        if (Object.values(room.players).every((p) => p.done)) {
          room.battle.started = false;
          room.battle.reveal = room.battle.secret;
        }
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

    Object.values(room.players).forEach((p) => {
      p.guesses = [];
      p.done = false;
    });
    room.battle.started = false;
    room.battle.winner = null;
    room.battle.reveal = null;
    room.battle.secret = null; // always require a new word

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
  if (winner) room.winner = winner;
}

// function sanitizeRoom(room) {
//   const players = Object.fromEntries(
//     Object.entries(room.players).map(([id, p]) => {
//       const { name, ready, guesses, done } = p;
//       return [id, { name, ready, guesses, done }];
//     })
//   );
//   return {
//     id: room.id,
//     mode: room.mode,
//     hostId: room.hostId,
//     players,
//     started: room.started,
//     winner: room.winner,
//     battle: {
//       started: room.battle.started,
//       winner: room.battle.winner,
//       reveal: room.battle.reveal,
//       hasSecret: !!room.battle.secret,
//     },
//   };
// }
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
      reveal: room.battle.reveal, // use this for Battle Royale reveal
      hasSecret: !!room.battle.secret,
    },
  };
}

// ---------- Start server ----------
const PORT = process.env.PORT || 8080; // Railway injects PORT in prod
httpServer.listen(PORT, () => console.log("Server listening on", PORT));
