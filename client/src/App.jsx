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

  // Battle
  const [hostWord, setHostWord] = useState("");

  const [msg, setMsg] = useState("");
  const [shakeKey, setShakeKey] = useState(0);     // NEW
  const [showActiveError, setShowActiveError] = useState(false); // NEW
  const [room] = useRoomState();
  const [currentGuess, setCurrentGuess] = useState("");

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2000);
    return () => clearTimeout(t);
  }, [msg]);

  const me = useMemo(() => room?.players && room.players[socket.id], [room]);
  const players = useMemo(() => {
    const p = room?.players
      ? Object.entries(room.players).map(([id, p]) => ({ id, ...p }))
      : [];
    return p;
  }, [room]);

  const opponent = useMemo(() => {
    const list = room?.players ? Object.entries(room.players) : [];
    const other = list.find(([id]) => id !== socket.id);
    return other ? { id: other[0], ...other[1] } : null;
  }, [room]);

  const isHost = room?.hostId === socket.id;

  const canGuessDuel = room?.mode === "duel" && room?.started;
  const canGuessBattle =
    room?.mode === "battle" && room?.battle?.started && !isHost;

    function duelPlayAgain() {
      socket.emit("duelPlayAgain", { roomId }, (resp) => {
        if (resp?.error) return setMsg(resp.error);
        setCurrentGuess("");
        // After reset, players need to set new secrets again.
        setScreen("lobby"); // or stay on game if you prefer; lobby is clearer
      });
    }


  function getInitials(name = "") {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("");
  }

  // --- Create / Join ---
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

  // --- Duel ---
  async function submitSecret() {
    const v = await validateWord(secret);
    if (!v.valid) return setMsg("Secret must be a valid 5-letter word");
    socket.emit("setSecret", { roomId, secret });
  }
  async function submitDuelGuess() {
    if (!canGuessDuel) return;
    if (currentGuess.length !== 5) {
      setShowActiveError(true);
      setShakeKey((k) => k + 1);
      return;
    }

    const v = await validateWord(currentGuess);
    if (!v.valid) {
      setShowActiveError(true);
      setShakeKey((k) => k + 1);
      return;
    }    
    socket.emit("makeGuess", { roomId, guess: currentGuess }, (resp) => {
      if (resp?.error) {
        setShowActiveError(true);
        setShakeKey((k) => k + 1);
        return;
      }      
      setCurrentGuess("");
      setShowActiveError(false);
    });
  }

  // --- Battle ---
  async function setWordAndStart() {
    const v = await validateWord(hostWord);
    if (!v.valid) return setMsg("Host word must be valid");
    socket.emit("setHostWord", { roomId, secret: hostWord }, (r) => {
      if (r?.error) return setMsg(r.error);
      socket.emit("startBattle", { roomId }, (r2) => {
        if (r2?.error) setMsg(r2.error);
        else setHostWord("");
      });
    });
  }
  async function battleGuess(g) {
    if (!canGuessBattle) return;
    const v = await validateWord(g);
    if (!v.valid) return setMsg("Guess must be a valid 5-letter word");
    socket.emit("makeGuess", { roomId, guess: g }, (resp) => {
      if (resp?.error) setMsg(resp.error);
    });
  }
  function playAgain() {
    socket.emit("playAgain", { roomId, keepWord: false }, (r) => {
      if (r?.error) setMsg(r.error);
    });
  }

  // --- Keyboard handlers ---
  const handleDuelKey = (key) => {
    if (!canGuessDuel) return;
    if (key === "ENTER") submitDuelGuess();
    else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < 5 && /^[A-Z]$/.test(key))
      setCurrentGuess((p) => p + key);
  };
  const handleBattleKey = (key) => {
    if (!canGuessBattle) return;
    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        battleGuess(currentGuess);
        setCurrentGuess("");
        setShowActiveError(false);
      } else {
        setShowActiveError(true);
        setShakeKey((k) => k + 1)
      }
    } else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < 5 && /^[A-Z]$/.test(key))
      setCurrentGuess((p) => p + key);
  };

  // Physical keyboard: route by mode
  useEffect(() => {
    const onKeyDown = (e) => {
      const key =
        e.key === "Enter"
          ? "ENTER"
          : e.key === "Backspace"
          ? "BACKSPACE"
          : /^[a-zA-Z]$/.test(e.key)
          ? e.key.toUpperCase()
          : null;
      if (!key) return;
      if (room?.mode === "duel") handleDuelKey(key);
      if (room?.mode === "battle") handleBattleKey(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [room?.mode, canGuessDuel, canGuessBattle, currentGuess]);

  // Screen transitions
  useEffect(() => {
    if (room?.mode === "duel" && room?.started) {
      setScreen("game");
      setCurrentGuess("");
    } else if (
      room?.mode === "battle" &&
      (room?.battle?.started || room?.battle?.winner || room?.battle?.reveal)
    ) {
      setScreen("game");
      setCurrentGuess("");
    }
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
    <div className="max-w-7xl mx-auto p-4 font-sans">
      <h1 className="text-3xl font-bold text-red-600 mb-6">Friendle Clone</h1>

      {/* HOME */}
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

      {/* LOBBY */}
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
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    placeholder="Host secret word"
                    value={hostWord}
                    onChange={(e) => setHostWord(e.target.value)}
                    maxLength={5}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <button
                    onClick={setWordAndStart}
                    className="bg-red-600 text-white rounded font-semibold hover:bg-red-700 px-4 py-2"
                  >
                    Start Battle
                  </button>
                  <span className="opacity-70">
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

      {/* DUEL GAME */}
      {screen === "game" && room?.mode === "duel" && opponent && (
        <div className="max-w-7xl mx-auto p-4">
          <h2 className="text-xl font-bold text-center mb-4 text-gray-700">
            Fewest guesses wins
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: your guesses */}
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
                <Board guesses={me?.guesses || []} activeGuess={currentGuess} errorShakeKey={shakeKey} errorActiveRow={showActiveError}/>
              </CardContent>
            </Card>

            {/* Right: opponent guesses */}
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
                <Board guesses={opponent?.guesses || []} activeGuess="" errorShakeKey={shakeKey} errorActiveRow={showActiveError}/>
              </CardContent>
            </Card>
          </div>

          <Keyboard onKeyPress={handleDuelKey} letterStates={letterStates} />

          {room?.winner && (
            <p className="text-center font-bold text-lg mt-4">
              Winner: {room.winner === "draw" ? "Draw" : room.winner === socket.id ? "You" : "Opponent"}
            </p>
          )}
          {(room?.winner || !room?.started) && (
  <div className="flex justify-center mt-3">
    <Button onClick={duelPlayAgain}>Play again</Button>
  </div>
)}
          {!!msg && <p className="text-red-600 text-center mt-2">{msg}</p>}
        </div>
      )}

      {/* BATTLE GAME */}
      {screen === "game" && room?.mode === "battle" && (
        isHost ? (
          // HOST SPECTATE WALL
          <div className="max-w-7xl mx-auto p-4 space-y-6">
            <h2 className="text-xl font-bold text-slate-700">Host Spectate View</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(room?.players || {})
                .filter(([id]) => id !== room?.hostId)
                .map(([id, p]) => (
                  <Card key={id} className="bg-card/60 backdrop-blur">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold">
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            {p.done ? "Done" : `${p.guesses?.length ?? 0}/6`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Board guesses={p.guesses || []} tile={50} gap={8} />
                    </CardContent>
                  </Card>
                ))}
            </div>

            {(room?.battle?.winner || room?.battle?.reveal) && isHost && !room?.battle?.started && (
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="Enter new secret word"
                  value={hostWord}
                  onChange={(e) => setHostWord(e.target.value)}
                  maxLength={5}
                  className="w-40"
                />
                <Button
                  onClick={() => {
                    if (hostWord.trim().length !== 5) {
                      setMsg("Secret word must be 5 letters");
                      return;
                    }
                    setWordAndStart();
                  }}
                >
                  Play again
                </Button>
              </div>
            )}
          </div>
        ) : (
          // PLAYER VIEW
          <div className="max-w-7xl mx-auto p-4 space-y-6">
            <h2 className="text-xl font-bold text-center text-slate-700">Battle Royale</h2>
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Board</CardTitle>
                <CardDescription>
                  {room?.battle?.started ? "Round in progress" : "Waiting to start"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Board
                  guesses={me?.guesses || []}
                  activeGuess={currentGuess}
                  tile={56}
                  gap={8}
                  errorShakeKey={shakeKey} errorActiveRow={showActiveError}
                />
                {canGuessBattle && (
                  <div className="mt-4">
                    <Keyboard onKeyPress={handleBattleKey} letterStates={letterStates} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
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