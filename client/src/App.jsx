import React, { useEffect, useState, useMemo } from "react";
import { socket } from "./socket";
import { cn } from "./lib/utils.js";

// Extracted Components
import HomeScreen from "./screens/HomeScreen.jsx";
import DuelGameScreen from "./screens/DuelGameScreen.jsx";
import SharedDuelGameScreen from "./screens/SharedDuelGameScreen.jsx";
import BattleGameScreen from "./screens/BattleGameScreen.jsx";
import HostSpectateScreen from "./screens/HostSpectateScreen.jsx";
import ConnectionBar from "./components/ConnectionBar.jsx";
import VictoryModal from "./components/VictoryModal.jsx";
import BrandHeader from "./components/BrandHeader.jsx";
import Backdrop from "./components/Backdrop.jsx";

// Extracted Hooks
import { useGameState } from "./hooks/useGameState.js";
import { useSocketConnection } from "./hooks/useSocketConnection.js";
import { useGameActions } from "./hooks/useGameActions.js";
import { useRoomManagement } from "./hooks/useRoomManagement.js";

// UI Components
import { Button } from "@/components/ui/button";

const LS_LAST_ROOM = "wp.lastRoomId";
const LS_LAST_NAME = "wp.lastName";
const LS_LAST_MODE = "wp.lastMode";
const LS_LAST_SOCKET = "wp.lastSocketId";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState(localStorage.getItem(LS_LAST_NAME) || "");
  const [roomId, setRoomId] = useState(
    localStorage.getItem(LS_LAST_ROOM) || ""
  );
  const [mode, setMode] = useState(
    localStorage.getItem(LS_LAST_MODE) || "duel"
  );

  // Battle
  const [hostWord, setHostWord] = useState("");

  const [msg, setMsg] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showActiveError, setShowActiveError] = useState(false);
  const [currentGuess, setCurrentGuess] = useState("");
  const [showVictory, setShowVictory] = useState(false);
  const wasHost =
    (typeof window !== "undefined" &&
      localStorage.getItem("wp.lastSocketId.wasHost") === "true") ||
    false;

  // consider yourself host if server says so OR you were host moments ago
  // Room state management
  const [room, setRoom] = useState(null);

  // Derive winner from room state
  const winner = useMemo(() => {
    if (!room) return null;
    if (room.mode === "duel") return room.winner;
    if (room.mode === "battle") return room.battle?.winner;
    return null;
  }, [room]);
  useEffect(() => {
    const onState = (data) => {
      // Room state updated
      setRoom(data);
    };
    socket.on("roomState", onState);
    return () => socket.off("roomState", onState);
  }, []);

  // Extracted hooks
  const {
    me,
    players,
    allPlayers,
    otherPlayers,
    opponent,
    isHost,
    canGuessDuel,
    canGuessBattle,
    // added in useGameState
    canGuessShared,
    letterStates,
    shouldShowVictory,
    duelSecrets,
  } = useGameState(room);

  const {
    connected,
    canRejoin,
    doRejoin,
    savedRoomId,
    savedName,
    rejoinOffered,
  } = useSocketConnection(room, setScreen);

  const actionsByMode = useGameActions();
  const duelActions = actionsByMode.duel;
  const sharedActions = actionsByMode.shared;
  const battleActions = actionsByMode.battle;

  const {
    createRoom,
    joinRoom,
    persistSession,
    getSavedSession,
    clearSavedSession,
    goHome,
  } = useRoomManagement();

  // Show victory when there is a real outcome (not just started=false at lobby)
  useEffect(() => {
    if (!room) return;

    if (room.mode === "duel") {
      // show ONLY if we have a winner or a duelReveal payload
      const shouldShow = Boolean(room.winner) || Boolean(room.duelReveal);
      setShowVictory(shouldShow);
      return;
    }

    if (room.mode === "shared") {
      // show ONLY if we have a winner or the game ended
      const shouldShow = Boolean(room.shared?.winner) || Boolean(room.shared?.lastRevealedWord);
      setShowVictory(shouldShow);
      return;
    }

    if (room.mode === "battle") {
      // For battle mode, don't show victory modal - let host directly start new rounds
      // The game results are shown in the HostSpectateScreen instead
      setShowVictory(false);
    }
  }, [
    room?.mode,
    room?.winner,
    room?.duelReveal,
    room?.shared?.winner,
    room?.shared?.lastRevealedWord,
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
  async function create() {
    const result = await createRoom(name, mode);
    if (result?.success) {
      setRoomId(result.roomId);
      setCurrentGuess("");
      setShowVictory(false);
      // For both modes, go directly to game screen
      setScreen("game");
    } else {
      setMsg(result?.error || "Failed to create room");
    }
  }

  async function join() {
    const result = await joinRoom(name, roomId);
    if (result?.error) {
      setMsg(result.error);
    } else {
      setCurrentGuess("");
      setShowVictory(false);
      // For both modes, go directly to game screen
      setScreen("game");
    }
  }

  function bumpActiveRowError() {
    setShowActiveError(true);
    setShakeKey((k) => k + 1);
    // turn it back off so the next error can retrigger
    setTimeout(() => setShowActiveError(false), 300);
  }

  async function handleSubmitDuelGuess() {
    if (!(canGuessDuel || canGuessShared)) return;
    if (currentGuess.length !== 5) {
      bumpActiveRowError();
      return;
    }
    
    // Use appropriate function based on mode
    const v = room?.mode === "shared" 
      ? await sharedActions.submitGuess(roomId, currentGuess, canGuessShared)
      : await duelActions.submitGuess(roomId, currentGuess, canGuessDuel);
      
    if (v?.error) {
      bumpActiveRowError();
      return;
    }
    setCurrentGuess("");
    setShowActiveError(false);
  }

  // Keyboard handlers
  const handleDuelKey = (key) => {
    if (!(canGuessDuel || canGuessShared)) return;
    if (key === "ENTER") handleSubmitDuelGuess();
    else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < 5 && /^[A-Z]$/.test(key))
      setCurrentGuess((p) => p + key);
  };

  const handleBattleKey = async (key) => {
    if (!canGuessBattle) return;
    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        const result = await battleActions.submitGuess(roomId, currentGuess, canGuessBattle);
        if (result?.error) {
          bumpActiveRowError();
          return;
        }
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
      // If I'm the host in Battle and the round hasn't started yet,
      // we're on the "type secret" screen — don't handle keys globally.
      const hostTyping =
        room?.mode === "battle" &&
        (isHost || wasHost) &&
        !room?.battle?.started;
      if (hostTyping) return;
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
      if (room?.mode === "shared") handleDuelKey(key); // Shared mode uses same logic as duel
      if (room?.mode === "battle") {
        // Hosts type the secret word; don't capture their keys here.
        if (isHost && !room?.battle?.started) return;
        handleBattleKey(key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    room?.mode,
    room?.battle?.started,
    isHost,
    wasHost,
    canGuessDuel,
    canGuessShared,
    canGuessBattle,
    currentGuess,
  ]);
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

  const viewingHost =
    room?.mode === "battle" && (isHost || (wasHost && me?.id === room?.hostId));
  useEffect(() => {
    if (room?.mode === "battle") {
      localStorage.setItem("wp.lastSocketId.wasHost", String(isHost));
    }
  }, [room?.mode, isHost]);

  return (
    <div className="overflow-x-hidden">
      <Backdrop />

      {/* Game screens break out of main container - Full viewport */}
      {screen === "game" && (
        <>
          <BrandHeader
            onHomeClick={() => {
              goHome();
              setRoom(null);
              setScreen("home");
              setRoomId("");
              setCurrentGuess("");
              setShowVictory(false);
            }}
            right={
              <ConnectionBar
                connected={connected}
                canRejoin={canRejoin}
                onRejoin={doRejoin}
                savedRoomId={savedRoomId}
              />
            }
          />

          {/* Victory Modal shown while in-game as overlay */}
          {showVictory && (
            <VictoryModal
              open={showVictory}
              onOpenChange={setShowVictory}
              mode={room?.mode}
              winnerName={room?.mode === "shared" ?
                (room?.shared?.winner && room?.shared?.winner !== "draw" ?
                  room?.players?.[room.shared.winner]?.name : null) :
                (room?.mode === "duel" ?
                  (room?.winner && room?.winner !== "draw" ?
                    room?.players?.[room.winner]?.name : null) : null)
              }
              leftName={room?.mode === "duel" ?
                Object.values(room?.players || {})[0]?.name : null}
              rightName={room?.mode === "duel" ?
                Object.values(room?.players || {})[1]?.name : null}
              leftSecret={room?.mode === "duel" ?
                room?.duelReveal?.[Object.keys(room?.players || {})[0]] : null}
              rightSecret={room?.mode === "duel" ?
                room?.duelReveal?.[Object.keys(room?.players || {})[1]] : null}
              battleSecret={room?.mode === "shared" ?
                room?.shared?.lastRevealedWord :
                room?.battle?.lastRevealedWord}
              onPlayAgain={room?.mode === "shared" || room?.mode === "duel" ?
                async () => {
                  setShowVictory(false);
                  try { await duelActions.playAgain(roomId); } catch (e) {}
                } : () => setShowVictory(false)}
              showPlayAgain={room?.mode === "shared" || room?.mode === "duel"}
            />
          )}

          {/* DUEL GAME */}
          {room?.mode === "duel" && (
            <DuelGameScreen
              room={room}
              me={me}
              opponent={opponent}
              currentGuess={currentGuess}
              shakeKey={shakeKey}
              showActiveError={showActiveError}
              letterStates={letterStates}
              onKeyPress={handleDuelKey}
              onSubmitSecret={async (secret) => {
                const result = await duelActions.submitSecret(roomId, secret); // { ok: true } or { error: "..." }
                if (result?.error) setMsg(result.error);
                return result;
              }}
              onRematch={async () => {
                // Use the action helper that emits the correct payload shape { roomId }
                try {
                  await duelActions.playAgain(roomId);
                } catch (e) {
                  // no-op; UI will still update via roomState events
                }
              }}
            />
          )}

          {/* SHARED DUEL */}
          {room?.mode === "shared" && (
            <SharedDuelGameScreen
              room={room}
              me={me}
              currentGuess={currentGuess}
              letterStates={letterStates}
              onKeyPress={handleDuelKey}
              onStartShared={async () => {
                const res = await sharedActions.startRound(roomId);
                if (res?.error) {
                  console.error("Start shared error:", res.error);
                  setMsg(res.error || "Failed to start shared duel");
                }
                return res;
              }}
              onRematch={async () => {
                try {
                  await sharedActions.playAgain(roomId);
                } catch (e) {
                  // no-op
                }
              }}
            />
          )}

          {/* BATTLE ROYALE - Host sees spectate view, players see game view */}
          {room?.mode === "battle" &&
            (viewingHost ? (
              <HostSpectateScreen
                key="host"
                room={room}
                players={players}
                onWordSubmit={async (word) => {
                  await battleActions.setWordAndStart(room.id, word); // emits setHostWord then startBattle
                }}
                onCopyRoomId={() =>
                  navigator.clipboard.writeText(room?.id || "")
                }
              />
            ) : (
              <BattleGameScreen
                key="player" // force a full swap
                room={room}
                players={players}
                allPlayers={allPlayers}
                otherPlayers={otherPlayers}
                me={me}
                isHost={isHost}
                currentGuess={currentGuess}
                shakeKey={shakeKey}
                showActiveError={showActiveError}
                letterStates={letterStates}
                canGuessBattle={canGuessBattle}
                onKeyPress={handleBattleKey}
              />
            ))}
        </>
      )}

      {/* Main app container for home/lobby screens - Constrained width */}
      {screen !== "game" && (
        <div className="h-[100dvh] min-h-screen overflow-hidden">
          <BrandHeader
            onHomeClick={() => {
              goHome();
              setRoom(null);
              setScreen("home");
              setRoomId("");
              setCurrentGuess("");
              setShowVictory(false);
            }}
            right={
              !viewingHost && (
                <ConnectionBar
                  connected={connected}
                  canRejoin={canRejoin}
                  onRejoin={doRejoin}
                  savedRoomId={savedRoomId}
                />
              )
            }
          />

          <div className="max-w-7xl mx-auto p-4 font-sans">
            {screen === "home" && (
              <HomeScreen
                name={name}
                setName={setName}
                roomId={roomId}
                setRoomId={setRoomId}
                mode={mode}
                setMode={setMode}
                onCreate={create}
                onJoin={join}
                message={msg}
              />
            )}
            {/* Victory Modal */}
            {showVictory && (
              <VictoryModal
                open={showVictory}
                onOpenChange={setShowVictory}
                mode={room?.mode}
                winnerName={room?.mode === "shared" ? 
                  (room?.shared?.winner && room?.shared?.winner !== "draw" ? 
                    room?.players?.[room.shared.winner]?.name : null) :
                  (room?.mode === "duel" ? 
                    (room?.winner && room?.winner !== "draw" ? 
                      room?.players?.[room.winner]?.name : null) : null)
                }
                leftName={room?.mode === "duel" ? 
                  Object.values(room?.players || {})[0]?.name : null}
                rightName={room?.mode === "duel" ? 
                  Object.values(room?.players || {})[1]?.name : null}
                leftSecret={room?.mode === "duel" ? 
                  room?.duelReveal?.[Object.keys(room?.players || {})[0]] : null}
                rightSecret={room?.mode === "duel" ? 
                  room?.duelReveal?.[Object.keys(room?.players || {})[1]] : null}
                battleSecret={room?.mode === "shared" ? 
                  room?.shared?.lastRevealedWord : 
                  room?.battle?.lastRevealedWord}
              onPlayAgain={room?.mode === "shared" || room?.mode === "duel"
                ? async () => {
                    setShowVictory(false);
                    try {
                      if (room?.mode === "duel") {
                        await duelActions.playAgain(roomId);
                      } else {
                        await sharedActions.playAgain(roomId);
                      }
                    } catch (e) {
                      // noop
                    }
                  }
                : () => setShowVictory(false)}
                showPlayAgain={room?.mode === "shared" || room?.mode === "duel"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
