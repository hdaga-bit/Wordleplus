// FULL FILE — drop in
import React, { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";
import Board from "./components/Board.jsx";
import Keyboard from "./components/Keyboard.jsx";
import { validateWord } from "./api";
import { cn } from "./lib/utils.js";
import VictoryModal from "./components/VictoryModal.jsx";
import PlayerCard from "./components/PlayerCard.jsx";
import SpectateCard from "./components/SpectateCard.jsx";
import WordInputTiles from "./components/WordInputTiles.jsx";
import PlayerProgressCard from "./components/PlayerProgressCard.jsx";
import GameResults from "./components/GameResults.jsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const LS_LAST_ROOM = "wp.lastRoomId";
const LS_LAST_NAME = "wp.lastName";
const LS_LAST_MODE = "wp.lastMode";
const LS_LAST_SOCKET = "wp.lastSocketId";

// Small banner for connection + rejoin
function ConnectionBar({ connected, canRejoin, onRejoin, savedRoomId }) {
  if (!connected) {
    return (
      <div className="w-full bg-yellow-100 text-yellow-900 text-sm py-2 px-3 rounded mb-3">
        Connection lost — trying to reconnect…
      </div>
    );
  }
  if (canRejoin) {
    return (
      <div className="w-full bg-blue-50 text-blue-900 text-sm py-2 px-3 rounded mb-3 flex items-center justify-between">
        <span>
          You were in room <b>{savedRoomId}</b>. Rejoin?
        </span>
        <Button size="sm" onClick={onRejoin}>
          Rejoin
        </Button>
      </div>
    );
  }
  return null;
}

// Simple notice modal for "Round Started"
// function NoticeModal({ open, onClose, title, text }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm">
//       <div className="w-full max-w-md mx-4 rounded-xl bg-white dark:bg-neutral-900 shadow-xl ring-1 ring-black/10 animate-[popIn_200ms_ease-out]">
//         <div className="p-6">
//           <h3 className="text-xl font-bold">{title}</h3>
//           <p className="mt-2 text-sm text-muted-foreground">{text}</p>
//           <div className="mt-4 flex justify-end">
//             <Button onClick={onClose} autoFocus>
//               Close
//             </Button>
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes popIn{0%{opacity:0;transform:translateY(6px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
//     </div>
//   );
// }

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
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState(localStorage.getItem(LS_LAST_NAME) || "");
  const [roomId, setRoomId] = useState(
    localStorage.getItem(LS_LAST_ROOM) || ""
  );
  const [mode, setMode] = useState(
    localStorage.getItem(LS_LAST_MODE) || "duel"
  );

  // Duel
  const [secret, setSecret] = useState("");

  // Battle
  const [hostWord, setHostWord] = useState("");

  const [msg, setMsg] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showActiveError, setShowActiveError] = useState(false);
  const [room] = useRoomState();
  const [currentGuess, setCurrentGuess] = useState("");
  const [showVictory, setShowVictory] = useState(false);

  // Connection + rejoin
  const [connected, setConnected] = useState(socket.connected);
  const [rejoinOffered, setRejoinOffered] = useState(false);

  // helpers
  const me = useMemo(() => room?.players && room.players[socket.id], [room]);
  const players = useMemo(
    () =>
      room?.players
        ? Object.entries(room.players).map(([id, p]) => ({ id, ...p }))
        : [],
    [room]
  );
  const opponent = useMemo(() => {
    if (!room?.players) return null;
    const entries = Object.entries(room.players);
    const other = entries.find(([id]) => id !== socket.id);
    return other ? { id: other[0], ...other[1] } : null;
  }, [room]);

  const isHost = room?.hostId === socket.id;
  const canGuessDuel =
    room?.mode === "duel" && room?.started && !opponent?.disconnected;
  const canGuessBattle =
    room?.mode === "battle" && room?.battle?.started && !isHost;

  function persistSession({ name: n, roomId: r, mode: m }) {
    if (n) localStorage.setItem(LS_LAST_NAME, n);
    if (r) localStorage.setItem(LS_LAST_ROOM, r);
    if (m) localStorage.setItem(LS_LAST_MODE, m);
  }

  function allGreenGuessWord(guesses = []) {
    const g = guesses.find((g) => g.pattern?.every((p) => p === "green"));
    return g?.guess;
  }
  function deriveDuelSecrets(room, me, opp) {
    const leftSecret =
      allGreenGuessWord(opp?.guesses) ||
      room?.duelReveal?.[me?.id || socket.id];
    const rightSecret =
      allGreenGuessWord(me?.guesses) || room?.duelReveal?.[opp?.id];
    return { leftSecret, rightSecret };
  }

  // socket lifecycle
  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      localStorage.setItem(LS_LAST_SOCKET, socket.id);

      // Try RESUME if we have an old id + room
      const savedRoom = localStorage.getItem(LS_LAST_ROOM);
      const oldId = localStorage.getItem(LS_LAST_SOCKET + ".old");
      if (savedRoom && oldId && (!room || !room.id)) {
        socket.emit("resume", { roomId: savedRoom, oldId }, (resp) => {
          if (resp?.error) {
            // fallback: offer manual rejoin
            setRejoinOffered(true);
          } else {
            setScreen("game"); // will be corrected by server state (lobby/game)
            setRejoinOffered(false);
          }
        });
      } else {
        const savedName = localStorage.getItem(LS_LAST_NAME);
        if (savedRoom && savedName && !room?.id) setRejoinOffered(true);
      }
    };
    const onDisconnect = () => {
      // remember the last socket id as "old" for resume
      const last = localStorage.getItem(LS_LAST_SOCKET);
      if (last) localStorage.setItem(LS_LAST_SOCKET + ".old", last);

      // Remember if this user was a host for reconnection
      if (room?.hostId === socket.id) {
        localStorage.setItem(LS_LAST_SOCKET + ".wasHost", "true");
      }

      setConnected(false);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [room?.id]);

  // Rejoin banner
  const savedRoomId = localStorage.getItem(LS_LAST_ROOM) || "";
  const savedName = localStorage.getItem(LS_LAST_NAME) || "";
  const canRejoin =
    connected && !room?.id && savedRoomId && savedName && rejoinOffered;
  const doRejoin = () => {
    const savedRoomId = localStorage.getItem(LS_LAST_ROOM);
    const savedName = localStorage.getItem(LS_LAST_NAME);
    const oldId = localStorage.getItem(LS_LAST_SOCKET + ".old");

    if (!savedRoomId || !savedName) return;

    // Prefer RESUME to keep guesses
    if (oldId) {
      socket.emit("resume", { roomId: savedRoomId, oldId }, (resp) => {
        if (resp?.error) {
          // Fallback to joinRoom only if resume fails
          socket.emit(
            "joinRoom",
            { name: savedName, roomId: savedRoomId },
            (resp2) => {
              if (resp2?.error) setMsg(resp2.error);
              else {
                setScreen("lobby");
                setRejoinOffered(false);
              }
            }
          );
        } else {
          // For battle mode, go directly to game screen (host will see spectate view)
          // For duel mode, server will push correct roomState
          if (localStorage.getItem(LS_LAST_MODE) === "battle") {
            setScreen("game");
          }
          setRejoinOffered(false);

          // Show reconnection success message
          const wasHost =
            localStorage.getItem(LS_LAST_SOCKET + ".wasHost") === "true";
          if (wasHost) {
            setMsg("Successfully reconnected as host! 👑");
            // Clear the wasHost flag after successful reconnection
            localStorage.removeItem(LS_LAST_SOCKET + ".wasHost");
          } else {
            setMsg("Successfully reconnected! ✅");
          }
        }
      });
    } else {
      // No oldId stored: fallback
      socket.emit(
        "joinRoom",
        { name: savedName, roomId: savedRoomId },
        (resp2) => {
          if (resp2?.error) setMsg(resp2.error);
          else {
            setScreen("lobby");
            setRejoinOffered(false);
          }
        }
      );
    }
  };

  // Show victory when there is a real outcome (not just started=false at lobby)
  useEffect(() => {
    if (!room) return;

    if (room.mode === "duel") {
      // show ONLY if we have a winner or a duelReveal payload
      const shouldShow = Boolean(room.winner) || Boolean(room.duelReveal);
      setShowVictory(shouldShow);
      return;
    }

    if (room.mode === "battle") {
      const shouldShow =
        !room.battle?.started && (room.battle?.winner || room.battle?.reveal);
      setShowVictory(shouldShow);
    }
  }, [
    room?.mode,
    room?.winner,
    room?.duelReveal, // <-- add this dep
    room?.battle?.started,
    room?.battle?.winner,
    room?.battle?.reveal,
  ]);

  // small transient toast support
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2000);
    return () => clearTimeout(t);
  }, [msg]);

  // actions
  function create() {
    socket.emit("createRoom", { name, mode }, (resp) => {
      if (resp?.roomId) {
        setRoomId(resp.roomId);
        setCurrentGuess("");
        setShowVictory(false);
        // For battle mode, go directly to game screen (host spectate view)
        // For duel mode, go to lobby
        setScreen(mode === "battle" ? "game" : "lobby");
        persistSession({ name, roomId: resp.roomId, mode });
      }
    });
  }
  function join() {
    socket.emit("joinRoom", { name, roomId }, (resp) => {
      if (resp?.error) setMsg(resp.error);
      else {
        setCurrentGuess("");
        setShowVictory(false);
        // For battle mode, go directly to game screen (player view)
        // For duel mode, go to lobby
        setScreen(mode === "battle" ? "game" : "lobby");
        persistSession({ name, roomId, mode });
      }
    });
  }

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
  function duelPlayAgain() {
    socket.emit("duelPlayAgain", { roomId }, (resp) => {
      if (resp?.error) return setMsg(resp.error);
      setCurrentGuess("");
      setShowVictory(false);
      setScreen("lobby");
    });
  }

  async function setWordAndStart(word = hostWord) {
    // Ensure word is a valid string
    if (!word || typeof word !== "string" || word.length !== 5) {
      setMsg("Invalid word format");
      return;
    }

    const v = await validateWord(word);
    if (!v.valid) return setMsg("Host word must be valid");
    socket.emit("setHostWord", { roomId, secret: word }, (r) => {
      if (r?.error) return setMsg(r.error);
      socket.emit("startBattle", { roomId }, (r2) => {
        if (r2?.error) setMsg(r2.error);
        else setHostWord("");
      });
    });
  }
  async function battleGuess(g) {
    if (!canGuessBattle) return;
    if (g.length !== 5) {
      setShowActiveError(true);
      setShakeKey((k) => k + 1);
      return;
    }
    const v = await validateWord(g);
    if (!v.valid) {
      setShowActiveError(true);
      setShakeKey((k) => k + 1);
      return;
    }
    socket.emit("makeGuess", { roomId, guess: g }, (resp) => {
      if (resp?.error) {
        setShowActiveError(true);
        setShakeKey((k) => k + 1);
      }
    });
  }

  // keyboards
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
        setShakeKey((k) => k + 1);
      }
    } else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < 5 && /^[A-Z]$/.test(key))
      setCurrentGuess((p) => p + key);
  };

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

  // screen transitions
  useEffect(() => {
    if (room?.mode === "duel" && room?.started) {
      setScreen("game");
      setCurrentGuess("");
    } else if (room?.mode === "battle") {
      // For battle mode, always go to game screen (which shows host spectate view or player view)
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

  const goHome = () => {
    // Back to “home” while preserving saved session
    setScreen("home");
    setCurrentGuess("");
  };

  return (
    <>
      {/* Game screens break out of main container - Full viewport */}
      {screen === "game" && (
        <>
          <ConnectionBar
            connected={connected}
            canRejoin={canRejoin}
            onRejoin={doRejoin}
            savedRoomId={savedRoomId}
          />

          {/* DUEL GAME */}
          {room?.mode === "duel" && (
            <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
              <header className="px-4 pt-3 pb-2">
                <h2 className="text-base md:text-lg font-semibold text-center text-muted-foreground">
                  Fewest guesses wins
                </h2>
              </header>

              <main className="flex-1 px-4 pb-2 md:pb-4">
                <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 place-items-center">
                  {/* YOU */}
                  <section className="h-full w-[300px] flex flex-col">
                    <div className="w-[300px] max-w-[min(92vw,820px)]">
                      <PlayerCard
                        name={me?.name || "You"}
                        wins={me?.wins}
                        streak={me?.streak}
                        avatar="🧑"
                        className="mb-2"
                      />
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center">
                      <div className="h-full w-full max-w-[min(99.8vw,2000px)] max-h-[calc(100vh-80px)] flex items-center justify-center">
                        <Board
                          guesses={me?.guesses || []}
                          activeGuess={currentGuess}
                          errorShakeKey={shakeKey}
                          errorActiveRow={showActiveError}
                          maxTile={200}
                          minTile={70}
                        />
                      </div>
                    </div>
                  </section>

                  {/* OPPONENT (hidden on mobile) */}
                  <section className="h-full w-[300px] hidden md:flex flex-col">
                    <div className="w-[300px] max-w-[min(92vw,820px)] mx-auto">
                      <PlayerCard
                        name={opponent?.name || "—"}
                        wins={opponent?.wins}
                        streak={opponent?.streak}
                        avatar="🧑‍💻"
                        className="mb-2"
                      />
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center">
                      <div className="h-full w-full max-w-[min(99.8vw,2000px)] max-h-[calc(100vh-80px)] flex items-center justify-center">
                        <Board
                          guesses={opponent?.guesses || []}
                          activeGuess=""
                          maxTile={200}
                          minTile={70}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </main>

              <footer className="shrink-0 w-full px-2 sm:px-4 pb-4 md:pb-6">
                <div className="mx-auto w-full max-w-5xl">
                  <Keyboard
                    onKeyPress={handleDuelKey}
                    letterStates={letterStates}
                  />
                </div>
              </footer>
            </div>
          )}

          {/* BATTLE GAME - Single Page Layout */}
          {room?.mode === "battle" && (
            <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
              {/* Header */}
              <header className="px-4 pt-4 pb-6">
                <div className="max-w-7xl mx-auto">
                  <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
                    Battle Royale
                  </h2>

                  {/* Room ID Display */}
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">
                        Room:
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {room?.id}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(room?.id || "");
                          setMsg("Room ID copied to clipboard!");
                        }}
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                        aria-label="Copy room ID"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Game Status - Only show to host, not to players */}
                  {isHost && room?.battle?.secret && (
                    <div className="text-center space-y-1">
                      <p className="text-sm text-slate-600">
                        Current Word:{" "}
                        <span className="font-mono font-bold text-slate-800">
                          {room.battle.secret}
                        </span>
                      </p>
                      {room?.battle?.started &&
                        !room?.battle?.winner &&
                        !room?.battle?.reveal && (
                          <p className="text-xs text-emerald-600 font-medium">
                            Game in progress...
                          </p>
                        )}
                      {room?.battle?.winner && (
                        <p className="text-xs text-blue-600 font-medium">
                          Winner:{" "}
                          {players.find((p) => p.id === room.battle.winner)
                            ?.name || "Unknown"}
                        </p>
                      )}
                      {room?.battle?.reveal && !room?.battle?.winner && (
                        <p className="text-xs text-amber-600 font-medium">
                          No winner - word revealed
                        </p>
                      )}
                    </div>
                  )}

                  {/* Game Status for Players - No word spoilers */}
                  {!isHost && (
                    <div className="text-center space-y-1">
                      {room?.battle?.started &&
                        !room?.battle?.winner &&
                        !room?.battle?.reveal && (
                          <p className="text-xs text-emerald-600 font-medium">
                            Game in progress... Good luck!
                          </p>
                        )}
                      {room?.battle?.winner && (
                        <p className="text-xs text-blue-600 font-medium">
                          Winner:{" "}
                          {players.find((p) => p.id === room.battle.winner)
                            ?.name || "Unknown"}
                        </p>
                      )}
                      {room?.battle?.reveal && !room?.battle?.winner && (
                        <p className="text-xs text-amber-600 font-medium">
                          No winner - word revealed
                        </p>
                      )}
                      {!room?.battle?.started &&
                        !room?.battle?.winner &&
                        !room?.battle?.reveal && (
                          <p className="text-xs text-slate-600 font-medium">
                            Waiting for host to start the game...
                          </p>
                        )}
                    </div>
                  )}
                </div>
              </header>

              {/* Main Content */}
              <main className="flex-1 px-4 pb-6">
                {isHost ? (
                  // Host Spectate View - Clean Grid Layout
                  <div className="w-full h-full flex flex-col">
                    {/* Host Status Indicator */}
                    <div className="text-center mb-4 space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-blue-600 text-lg">👑</span>
                        <span className="text-sm font-medium text-blue-800">
                          You are the Host
                        </span>
                        <span className="text-blue-600 text-lg">👑</span>
                      </div>

                      {/* Reconnection Status */}
                      {localStorage.getItem(LS_LAST_SOCKET + ".wasHost") ===
                        "true" && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                          <span className="text-green-600 text-sm">🔄</span>
                          <span className="text-xs text-green-700 font-medium">
                            Reconnected as Host
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dynamic Header - Game Status or New Word Input */}
                    <div className="text-center mb-6">
                      {room?.battle?.started ? (
                        // Game in progress - show status
                        <>
                          <h3 className="text-lg font-semibold text-slate-700 mb-2">
                            Player Progress
                          </h3>
                          <p className="text-sm text-slate-600">
                            Watch players compete in real-time!
                          </p>
                        </>
                      ) : (
                        // Game ended or not started - show new word input for host
                        <>
                          {room?.battle?.winner || room?.battle?.reveal ? (
                            // Game ended - show status message
                            <div className="mb-4">
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-4">
                                <div className="text-center">
                                  <p className="text-sm text-green-800 font-medium">
                                    {room?.battle?.winner
                                      ? `Game ended! ${
                                          players.find(
                                            (p) => p.id === room.battle.winner
                                          )?.name
                                        } won!`
                                      : "Game ended! No one got the word."}
                                  </p>
                                  <p className="text-xs text-green-600 mt-1">
                                    Enter a new word to start another round
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Game not started yet
                            <div className="mb-4">
                              <p className="text-sm text-slate-600">
                                Enter a word to start the game
                              </p>
                            </div>
                          )}

                          <h3 className="text-lg font-semibold text-slate-700 mb-4">
                            Enter New Word
                          </h3>
                          <WordInputTiles
                            onWordSubmit={(word) => {
                              // Set the word in state and start the game immediately
                              setHostWord(word);
                              setWordAndStart(word);
                            }}
                            submitButtonText="Start Game"
                          />
                        </>
                      )}
                    </div>

                    {/* Player Cards Grid - Show during active game and after game ends */}
                    {(room?.battle?.started ||
                      room?.battle?.winner ||
                      room?.battle?.reveal) && (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 place-items-start">
                        {players
                          .filter((player) => player.id !== room?.hostId) // Exclude host from player grid
                          .map((player) => (
                            <SpectateCard
                              key={player.id}
                              player={player}
                              room={room}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Player Game View - Perfect Viewport Fit with Optimized Board Sizing
                  <div className="flex-1 px-4 flex items-center justify-center min-h-0">
                    {/* Room ID Display for Players */}
                    <div className="absolute top-4 left-4 z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg shadow-sm">
                        <span className="text-xs text-slate-600 font-medium">
                          Room:
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {room?.id}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(room?.id || "");
                            setMsg("Room ID copied to clipboard!");
                          }}
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                          aria-label="Copy room ID"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-full flex items-center justify-center relative">
                      {room?.battle?.started ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-full h-full max-w-[min(99.8vw,2000px)] max-h-[calc(100vh-80px)] flex items-center justify-center">
                            <Board
                              guesses={me?.guesses || []}
                              activeGuess={currentGuess}
                              errorShakeKey={shakeKey}
                              errorActiveRow={showActiveError}
                              maxTile={200}
                              minTile={70}
                            />
                          </div>
                        </div>
                      ) : (
                        // Game ended - show results and scoreboard
                        <div className="w-full h-full flex items-center justify-center">
                          <GameResults
                            room={room}
                            players={players}
                            correctWord={room?.battle?.secret}
                          />
                        </div>
                      )}

                      {/* Other Players Progress Cards - Positioned on the right */}
                      {room?.battle?.started && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-3 max-h-[80vh] overflow-y-auto">
                          {players
                            .filter(
                              (player) =>
                                player.id !== socket.id &&
                                player.id !== room?.hostId
                            ) // Exclude current player and host
                            .map((player) => (
                              <PlayerProgressCard
                                key={player.id}
                                player={player}
                                isCurrentPlayer={false}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </main>

              {/* Footer - Keyboard for Players, Info for Host */}
              {isHost ? (
                <footer className="px-4 pb-4 flex-shrink-0">
                  <div className="text-center text-sm text-slate-500">
                    Host view - Use the keyboard above to control the game
                  </div>
                </footer>
              ) : (
                <footer className="px-2 sm:px-4 pb-3 flex-shrink-0">
                  <div className="max-w-5xl mx-auto">
                    {canGuessBattle ? (
                      <Keyboard
                        onKeyPress={handleBattleKey}
                        letterStates={letterStates}
                      />
                    ) : (
                      <div className="text-center text-sm text-slate-500 py-2">
                        {room?.battle?.winner || room?.battle?.reveal
                          ? "Game ended - waiting for host to start next round..."
                          : "Waiting for host to start the game..."}
                      </div>
                    )}
                  </div>
                </footer>
              )}
            </div>
          )}
        </>
      )}

      {/* Main app container for home/lobby screens - Constrained width */}
      {screen !== "game" && (
        <div className="max-w-7xl mx-auto p-4 font-sans">
          <ConnectionBar
            connected={connected}
            canRejoin={canRejoin}
            onRejoin={doRejoin}
            savedRoomId={savedRoomId}
          />

          {/* Title links "home" */}
          <button
            onClick={goHome}
            className="text-3xl font-bold text-red-600 mb-6 hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            Friendle Clone
          </button>

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
                  />
                  <span>Duel (1v1)</span>
                </label>
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "battle"}
                    onChange={() => setMode("battle")}
                  />
                  <span>Battle Royale</span>
                </label>
              </div>

              <Button disabled={!name} onClick={create} className="w-full">
                Create Room
              </Button>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
                <Button disabled={!name || !roomId} onClick={join}>
                  Join
                </Button>
              </div>

              {!!msg && <p className="text-red-600 font-medium">{msg}</p>}
            </div>
          )}

          {screen === "lobby" && (
            <div className="grid gap-6 max-w-md mx-auto">
              <p className="text-lg font-semibold">
                <span className="font-bold">Room:</span> {roomId}{" "}
                <span className="font-bold">Mode :</span> {room?.mode}
              </p>

              {/* Stats surfaced here */}
              <PlayersList
                players={players}
                hostId={room?.hostId}
                showProgress
                showStats
              />

              {room?.mode === "duel" ? (
                <>
                  <p className="text-gray-600">
                    Pick a secret five-letter word for your opponent to guess.
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="border border-gray-300 rounded px-3 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Secret word"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      maxLength={5}
                    />
                    <Button onClick={submitSecret}>Set Secret</Button>
                  </div>
                  <p className="text-sm">
                    {room?.started ? "started!" : "waiting for both players..."}
                  </p>
                </>
              ) : (
                <>
                  {isHost ? (
                    <div className="flex gap-2 items-center">
                      <input
                        placeholder="Host secret word"
                        value={hostWord}
                        onChange={(e) => setHostWord(e.target.value)}
                        maxLength={5}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <Button onClick={setWordAndStart}>Start Battle</Button>
                      <span className="opacity-70">
                        {room?.battle?.hasSecret ? "Word set" : "No word yet"}
                      </span>
                    </div>
                  ) : (
                    <p>Waiting for host to start…</p>
                  )}
                </>
              )}

              {!!msg && <p className="text-red-600">{msg}</p>}
            </div>
          )}

          {/* Victory Modal */}
          {showVictory && (
            <VictoryModal
              winner={winner}
              onClose={() => setShowVictory(false)}
              onPlayAgain={() => {
                setShowVictory(false);
                socket.emit("playAgain", roomId);
              }}
            />
          )}
        </div>
      )}
    </>
  );
} // End of App component

// PlayerCard component just added
// PlayersList component
function PlayersList({
  players,
  hostId,
  showProgress,
  showStats = true,
  className,
}) {
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
          const onStreak = (p.streak ?? 0) > 1; // 2+ looks more “streaky”

          return (
            <Card
              key={p.id}
              className={cn(
                "border bg-card/60 backdrop-blur transition-shadow",
                onStreak &&
                  "ring-1 ring-emerald-300/60 shadow-[0_0_24px_-8px_rgba(16,185,129,.5)]"
              )}
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    {isHost && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wider">
                        Host
                      </span>
                    )}
                  </CardTitle>

                  {/* Right-aligned: progress + compact stats line */}
                  <div className="flex items-center gap-2">
                    {showProgress && (
                      <CardDescription className="text-xs font-medium text-foreground/80">
                        {progress}
                      </CardDescription>
                    )}
                    {showStats && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          W:{p.wins ?? 0}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded ring-1",
                            onStreak
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-300 animate-[glow_1.8s_ease-in-out_infinite]"
                              : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          )}
                        >
                          Stk:{p.streak ?? 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {showStats && p.disconnected && (
                  <div className="mt-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      Reconnecting…
                    </span>
                  </div>
                )}
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

      {/* streak glow keyframes */}
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,.35) }
          50% { box-shadow: 0 0 16px 0 rgba(16,185,129,.55) }
        }
      `}</style>
    </section>
  );
}
