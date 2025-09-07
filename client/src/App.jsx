import React, { useEffect, useState, useMemo } from "react";
import { socket } from "./socket";
import { cn } from "./lib/utils.js";

// Extracted Components
import HomeScreen from "./screens/HomeScreen.jsx";
import DuelGameScreen from "./screens/DuelGameScreen.jsx";
import BattleGameScreen from "./screens/BattleGameScreen.jsx";
import HostSpectateScreen from "./screens/HostSpectateScreen.jsx";
import ConnectionBar from "./components/ConnectionBar.jsx";
import VictoryModal from "./components/VictoryModal.jsx";

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
      console.info("roomState", {
        started: data.started,
        duelDeadline: data.duelDeadline,
        now: Date.now(),
        in: data.duelDeadline ? data.duelDeadline - Date.now() : null,
      });
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

  const {
    submitSecret,
    submitDuelGuess,
    duelPlayAgain,
    setWordAndStart,
    battleGuess,
  } = useGameActions();

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

    if (room.mode === "battle") {
      // For battle mode, don't show victory modal - let host directly start new rounds
      // The game results are shown in the HostSpectateScreen instead
      setShowVictory(false);
    }
  }, [
    room?.mode,
    room?.winner,
    room?.duelReveal,
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
    if (!canGuessDuel) return;
    if (currentGuess.length !== 5) {
      bumpActiveRowError();

      return;
    }
    const v = await submitDuelGuess(roomId, currentGuess, canGuessDuel);
    if (v?.error) {
      bumpActiveRowError();
      return;
    }
    setCurrentGuess("");
    setShowActiveError(false);
  }

  // Keyboard handlers
  const handleDuelKey = (key) => {
    if (!canGuessDuel) return;
    if (key === "ENTER") handleSubmitDuelGuess();
    else if (key === "BACKSPACE") setCurrentGuess((p) => p.slice(0, -1));
    else if (currentGuess.length < 5 && /^[A-Z]$/.test(key))
      setCurrentGuess((p) => p + key);
  };

  const handleBattleKey = (key) => {
    if (!canGuessBattle) return;
    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        battleGuess(roomId, currentGuess, canGuessBattle);
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
      if (room?.mode === "battle") {
        // Hosts type the secret word; don't capture their keys here.
        if (isHost && !room?.battle?.started) return;
        handleBattleKey(key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [room?.mode, isHost, canGuessDuel, canGuessBattle, currentGuess]); // screen transitions
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
                const result = await submitSecret(roomId, secret); // { ok: true } or { error: "..." }
                if (result?.error) setMsg(result.error);
                return result;
              }}
              onRematch={async () => {
                // Use the action helper that emits the correct payload shape { roomId }
                try {
                  await duelPlayAgain(roomId);
                } catch (e) {
                  // no-op; UI will still update via roomState events
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
                  const resp = await setWordAndStart(room?.id, word);
                  if (resp?.error) setMsg(resp.error);
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
        <div className="max-w-7xl mx-auto p-4 font-sans">
          {" "}
          {!viewingHost && (
            <ConnectionBar
              connected={connected}
              canRejoin={canRejoin}
              onRejoin={doRejoin}
              savedRoomId={savedRoomId}
            />
          )}
          {/* Title links "home" */}
          <button
            onClick={() => {
              goHome();
              setRoom(null);
              setScreen("home");
              setRoomId("");
              setCurrentGuess("");
              setShowVictory(false);
            }}
            className="text-3xl font-bold text-red-600 mb-6 hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            Friendle Clone
          </button>
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
          {/* Victory Modal - Only for battle mode now */}
          {showVictory && room?.mode === "battle" && (
            <VictoryModal
              winner={winner}
              onClose={() => setShowVictory(false)}
              onPlayAgain={() => {
                setShowVictory(false);
                // For battle mode, just close the modal and let host enter new word
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
