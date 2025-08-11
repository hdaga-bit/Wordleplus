import React, { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";
import Board from "./components/Board.jsx";
import Keyboard from "./components/Keyboard.jsx";
import { validateWord } from "./api";
import { cn } from "./lib/utils.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
function useRoomState() {
  const [room, setRoom] = useState(null);
  useEffect(() => {
    const onState = (data) => setRoom(data);
    socket.on("roomState", onState);
    return () => socket.off("roomState", onState);
  }, []);
  return [room, setRoom];
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home | lobby | game
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState("duel"); // 'duel' | 'battle'

  // Duel
  const [secret, setSecret] = useState("");
  const [guess, setGuess] = useState("");

  // Battle
  const [hostWord, setHostWord] = useState("");

  const [msg, setMsg] = useState("");
  const [room, setRoom] = useRoomState();

  const [currentGuess, setCurrentGuess] = useState(""); // For keyboard input

  const me = useMemo(() => room?.players && room.players[socket.id], [room]);
  const players = useMemo(() => {
    const p = room?.players
      ? Object.entries(room.players).map(([id, p]) => ({ id, ...p }))
      : [];
    console.log(
      "[players] Computed:",
      p.map((p) => p.name)
    );
    return p;
  }, [room]);

  const opponent = useMemo(() => {
    const list = room?.players ? Object.entries(room.players) : [];
    const other = list.find(([id]) => id !== socket.id);
    return other ? { id: other[0], ...other[1] } : null;
  }, [room]);
  // const opponent =
  //   players.length > 1 ? players.find((p) => p.id !== socket.id) : null;

  const isHost = room?.hostId === socket.id;

  // Helper to get revealed secret
  const getRevealedSecret = (playerGuesses, isMe) => {
    // If guessed correctly, last guess is the secret (all 'green')
    const winningGuess = playerGuesses.find(({ pattern }) =>
      pattern.every((p) => p === "green")
    );
    if (winningGuess) return winningGuess.guess;
    // For your own secret (left side), always show it if set
    if (isMe && me?.secret) {
      return me.secret;
    }
    // For opponent's secret (right side), show if game over or guessed
    if (!isMe && room?.winner && opponent?.secret) {
      return opponent.secret;
    }
    return ""; // Empty if not revealed
  };

  // Keyboard handlers
  const handleKey = (key) => {
    console.log("[handleKey] Key pressed:", key); // Debug log to see if keys are detected
    if (key === "ENTER") {
      submitGuess();
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
      setCurrentGuess((prev) => prev + key);
    }
  };

  // Physical keyboard support
  useEffect(() => {
    const onKeyDown = (e) => {
      console.log("[onKeyDown] Physical key:", e.key); // Debug log to see if physical keyboard is captured
      if (e.key === "Enter") handleKey("ENTER");
      else if (e.key === "Backspace") handleKey("BACKSPACE");
      else if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key))
        handleKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function create() {
    socket.emit("createRoom", { name, mode }, (resp) => {
      if (resp?.roomId) {
        setRoomId(resp.roomId);
       setCurrentGuess("");
        setScreen("lobby");
      }
    });
  }
  function join() {
    socket.emit("joinRoom", { name, roomId }, (resp) => {
      if (resp?.error) setMsg(resp.error);
      else {
       setCurrentGuess("");
        setScreen("lobby");
      }
    });
  }

  // Duel helpers
  async function submitSecret() {
    const v = await validateWord(secret);
    if (!v.valid) {
      setMsg("Secret must be a valid 5-letter word");
      return;
    }
    socket.emit("setSecret", { roomId, secret });
  }
  async function submitGuess() {
    console.log("[submitGuess] Submitting:", currentGuess); // Debug log to see the guess
    if (currentGuess.length !== 5) {
      setMsg("Guess must be exactly 5 letters");
      return;
    }
    const v = await validateWord(currentGuess);
    if (!v.valid) {
      setMsg("Guess must be a valid 5-letter word");
      return;
    }
    socket.emit("makeGuess", { roomId, guess: currentGuess }, (resp) => {
      if (resp?.error) {setMsg(resp.error); return;}
      setCurrentGuess("");
    });
  }

  // Battle helpers
  async function setWordAndStart() {
    const v = await validateWord(hostWord);
    if (!v.valid) {
      setMsg("Host word must be valid");
      return;
    }
    socket.emit("setHostWord", { roomId, secret: hostWord }, (r) => {
      if (r?.error) return setMsg(r.error);
      socket.emit("startBattle", { roomId }, (r2) => {
        if (r2?.error) setMsg(r2.error);
      });
    });
  }
  async function battleGuess(g) {
    if (isHost) { setMsg("Host is spectating this round"); return; }
    const v = await validateWord(g);
    if (!v.valid) {
      setMsg("Guess must be a valid 5-letter word");
      return;
    }
    socket.emit("makeGuess", { roomId, guess: g }, (resp) => {
      if (resp?.error) setMsg(resp.error);
    });
  }
  function playAgain(keepWord) {
    socket.emit("playAgain", { roomId, keepWord }, (r) => {
      if (r?.error) setMsg(r.error);
    });
  }

  useEffect(() => {
    if (room?.mode === "duel" && room?.started) {setScreen("game"); setCurrentGuess("")}
    else if (
      room?.mode === "battle" &&
      (room?.battle?.started || room?.battle?.winner || room?.battle?.reveal)
    )
      setScreen("game");
      setCurrentGuess("")
  }, [
    room?.started,
    room?.battle?.started,
    room?.battle?.winner,
    room?.battle?.reveal,
    room?.mode,
  ]);

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
        // Priority: correct > present > absent
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

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      <h1 className="text-3xl font-bold text-red-600 mb-6">Friendle Clone</h1>

      {screen === "home" && (
        <div className="grid gap-4 max-w-md mx-auto">
          <input
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex space-x-6">
            <label className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "duel"}
                onChange={() => setMode("duel")}
                className="form-radio"
              />
              <span>Duel (1v1)</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "battle"}
                onChange={() => setMode("battle")}
                className="form-radio"
              />
              <span>Battle Royale</span>
            </label>
          </div>

          <button
            disabled={!name}
            onClick={create}
            className={`w-full py-2 rounded text-white font-semibold ${
              name
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Create Room
          </button>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            />
            <button
              disabled={!name || !roomId}
              onClick={join}
              className={`px-4 py-2 rounded text-white font-semibold ${
                name && roomId
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Join
            </button>
          </div>

          {!!msg && <p className="text-red-600 font-medium">{msg}</p>}
        </div>
      )}

      {screen === "lobby" && (
        <div className="grid gap-6 max-w-md mx-auto">
          <p className="text-lg font-semibold">
            <span className="font-bold">Room:</span> {roomId}{" "}
            <span className="font-bold">Mode :</span>
            {room?.mode}
          </p>

          {room?.mode === "duel" ? (
            <>
              <p className="text-gray-600">
                Pick a secret five-letter word for your opponent to guess.
              </p>
              <div className="flex gap-4 items-center">
                <input
                  className="border border-gray-300 rounded px-3 py-2 flex-grow focus:outline none focus:ring-2 focus:ring-red-500"
                  placeholder="Secret word"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  maxLength={5}
                />
                <button
                  onClick={submitSecret}
                  className="bg-red-600 text-white rounded font-semibold hover:bg-red-700 px-4 py-2 "
                >
                  Set Secret
                </button>
              </div>
              <PlayersList players={players} hostId={room?.hostId} />
              <p>
                Game{" "}
                {room?.started ? "started!" : "waiting for both players..."}
              </p>
            </>
          ) : (
            <>
              <p>
                Battle Royale: The host sets a single secret word. Everyone else
                tries to guess it. First correct guess wins. Each player has 6
                guesses.
              </p>
              {isHost ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    placeholder="Host secret word"
                    value={hostWord}
                    onChange={(e) => setHostWord(e.target.value)}
                    maxLength={5}
                  />
                  <button onClick={setWordAndStart}>Start Battle</button>
                  <span style={{ opacity: 0.7 }}>
                    {room?.battle?.hasSecret ? "Word set" : "No word yet"}
                  </span>
                </div>
              ) : (
                <p>Waiting for host to start…</p>
              )}
              <PlayersList players={players} hostId={room?.hostId} />
            </>
          )}

          {!!msg && <p style={{ color: "crimson" }}>{msg}</p>}
        </div>
      )}

{screen === "game" && room?.mode === "duel" && opponent && (
  <div className="max-w-4xl mx-auto p-4">
    <h2 className="text-xl font-bold text-center mb-4 text-gray-700">
      Fewest guesses wins
    </h2>

    <div className="grid grid-cols-2 gap-6">
      {/* LEFT: Your guesses on opponent's secret */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-200 grid place-items-center text-xl">🧑</div>
            <div>
              <CardTitle>{me?.name} (You)</CardTitle>
              <CardDescription>Guessing opponent’s word</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-semibold mb-2">Your Guesses</p>
          <Board guesses={me?.guesses || []} activeGuess={currentGuess} />
        </CardContent>
      </Card>

      {/* RIGHT: Opponent's guesses on your secret */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-200 grid place-items-center text-xl">🧑‍💻</div>
            <div>
              <CardTitle>{opponent?.name}</CardTitle>
              <CardDescription>Guessing your word</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-semibold mb-2">Opponent’s Guesses</p>
          <Board guesses={opponent?.guesses || []} activeGuess="" />
        </CardContent>
      </Card>
    </div>

    <Keyboard onKeyPress={handleKey} letterStates={letterStates} />

    {room?.winner && (
      <p className="text-center font-bold text-lg mt-4">
        Winner: {room.winner === "draw" ? "Draw" : room.winner === socket.id ? "You" : "Opponent"}
      </p>
    )}
    {!!msg && <p className="text-red-600 text-center mt-2">{msg}</p>}
  </div>
)}

{screen === "game" && room?.mode === "battle" && (
  <div className="max-w-5xl mx-auto p-4 space-y-6">{/* wider than 4xl */}
    <h2 className="text-xl font-bold text-center text-slate-700">Battle Royale</h2>

    {/* On md+, use equal columns; on lg+, nudge board wider */}
    <div className="grid gap-6 md:grid-cols-2 lg:[grid-template-columns:1.3fr_1fr]">
      {/* LEFT: your board (or empty if host) */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">
            {isHost ? "Spectating" : "Your Board"}
          </CardTitle>
          <CardDescription>
            {room?.battle?.started ? "Round in progress" : "Waiting to start"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Give the board comfortable tiles */}
          <Board
            guesses={me?.guesses || []}
            activeGuess={isHost ? "" : currentGuess}
            tile={56}             // <-- see Board tweak below
            gap={8}
          />
          {!isHost && room?.battle?.started && (
            <div className="mt-4">
              <Keyboard onKeyPress={handleKey} letterStates={letterStates} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* RIGHT: host controls / status */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Round Controls</CardTitle>
          <CardDescription>Host manages the round</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PlayersList
            players={players}
            hostId={room?.hostId}
            showProgress
            className="max-h-64 overflow-auto pr-1" // prevent tall list from stretching card
          />

          {!room?.battle?.started && isHost && (
            <>
              {!room?.battle?.hasSecret ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new host word"
                    value={hostWord}
                    onChange={(e) => setHostWord(e.target.value)}
                    maxLength={5}
                  />
                  <Button onClick={setWordAndStart}>Start</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Word set. Click Start.
                </p>
              )}

              {(room?.battle?.winner || room?.battle?.reveal) && (
                <Button onClick={() => playAgain(false)}>Play again</Button>
              )}
            </>
          )}

          {room?.battle?.started && isHost && (
            <p className="text-sm text-muted-foreground">
              Spectating… players are guessing.
            </p>
          )}
        </CardContent>
      </Card>
    </div>

    {!!msg && <p className="text-destructive text-center">{msg}</p>}
  </div>
)}
    </div>
  );
}

function PlayersList({ players, hostId, showProgress, className }) {
  return (
    <section
      className={cn("space-y-3", className)}
      aria-labelledby="players-heading"
    >
      <h2
        id="players-heading"
        className="text-base font-semibold tracking-tight"
      >
        Players
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => {
          const progress = p.done ? "Done" : `${p.guesses?.length ?? 0}/6`;
          const isHost = p.id === hostId;
          return (
            <Card key={p.id} className="border bg-card/60 backdrop-blur">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <span className="font-semibold">{p.name}</span>
                    {isHost && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                          Host · Spectating
                        </span>
                    )}
                  </CardTitle>
                  {showProgress && (
                    <CardDescription className="text-xs font-medium text-foreground/80">
                      {progress}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  ID: {p.id.slice(0, 6)}…
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function BattleInput({ onSubmit }) {
  const [g, setG] = useState("");

  const submit = () => {
    const value = g.trim();
    if (!value) return;
    onSubmit(value);
    setG("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Your guess"
        value={g}
        onChange={(e) => setG(e.target.value)}
        maxLength={5}
        aria-label="Your guess"
      />
      <Button onClick={submit}>Guess</Button>
    </div>
  );
}
