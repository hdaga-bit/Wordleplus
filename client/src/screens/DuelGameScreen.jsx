import React, { useState, useEffect, useMemo } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import { DuelPlayerCard } from "../components/DuelPlayerCard.jsx";
import MobileBoardSwitcher from "../components/MobileBoardSwitcher.jsx";
import ParticleEffect from "../components/ParticleEffect.jsx";
import ConfettiEffect from "../components/ConfettiEffect.jsx";
import { useSwipeGestures } from "../hooks/useSwipeGestures.js";
import { Button } from "@/components/ui/button";

function DuelGameScreen({
  room,
  me,
  opponent,
  currentGuess,
  shakeKey,
  showActiveError,
  letterStates,
  onKeyPress,
  onSubmitSecret,
  onRematch,
}) {
  // Local input for MY secret only (we never edit opponent secret locally)
  const [secretWordInput, setSecretWordInput] = useState("");
  const [secretLocked, setSecretLocked] = useState(false); // lock immediately on submit
  const [mySubmittedSecret, setMySubmittedSecret] = useState(""); // for reveal

  // Small delights
  const [showParticles, setShowParticles] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });

  // Mobile UX
  const [mobileView, setMobileView] = useState("me");
  const [isMobile, setIsMobile] = useState(false);

  // Derived flags
  const isGameStarted = !!room?.started;
  const isGameEnded = !!(room?.winner || room?.duelReveal);
  const hasRequestedRematch = !!me?.rematchRequested;
  const opponentRequestedRematch = !!opponent?.rematchRequested;
  const bothRequestedRematch = hasRequestedRematch && opponentRequestedRematch;
  const canGuess = isGameStarted && !isGameEnded;

  const revealNow = isGameEnded || !!room?.duelReveal;
  // Ready should be server-driven
  const myReady = !!me?.ready;
  const oppReady = !!opponent?.ready;
  const bothReady = myReady && oppReady;
  const canSetSecret = !myReady && !isGameEnded;
  const freshRound = !isGameStarted && !isGameEnded && !myReady && !oppReady;

  const [secretErrorActive, setSecretErrorActive] = useState(false);
  const [secretErrorKey, setSecretErrorKey] = useState(0);
  //timer
  const deadline = room?.duelDeadline ?? null;
  const { remaining, label: timerLabel, pct } = useCountdown(deadline);
  const low = remaining <= 10_000; // <= 10s
  const warn = remaining <= 20_000; // <= 20s

  // Clear all local secret-related state at the start of a fresh round
  useEffect(() => {
    if (freshRound) {
      setSecretWordInput("");
      setSecretLocked(false);
      setMySubmittedSecret("");
    }
  }, [freshRound]);
  // normalize to exactly 5 uppercase letters (pad if needed)
  const clamp5 = (w) =>
    (w || "").toString().toUpperCase().slice(0, 5).padEnd(5, " ");

  // What to show for ME
  const myId = me?.id;
  const oppId = opponent?.id;
  const revealMine = clamp5(
    (myId && room?.duelReveal?.[myId]) || mySubmittedSecret
  );
  const revealOpp = clamp5((oppId && room?.duelReveal?.[oppId]) || "");
  // Effects
  useEffect(() => {
    if (bothRequestedRematch) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [bothRequestedRematch]);

  // Fun particle when both secrets are set and game not yet started
  useEffect(() => {
    if (bothReady && !isGameStarted) {
      setParticlePosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      setShowParticles(true);
      const t = setTimeout(() => setShowParticles(false), 2000);
      return () => clearTimeout(t);
    }
  }, [bothReady, isGameStarted]);

  const handleSecretSubmit = async (word) => {
    if (word.length !== 5) return;
    const res = await onSubmitSecret(word); // { ok } or { error }
    if (res?.ok) {
      setSecretLocked(true); // prevent local edits
      setMySubmittedSecret(word.toUpperCase()); // local copy for reveal
    } else {
      bumpSecretError();
      // optional: show a small inline error or shake your "Secret Word" label
      // e.g. set a local error message or bump a "shake" state
    }
  };

  // On-screen keyboard while setting MY secret
  const handleSecretKeyPress = (key) => {
    if (!canSetSecret) return;
    if (key === "ENTER") {
      if (secretWordInput.length === 5) handleSecretSubmit(secretWordInput);
    } else if (key === "BACKSPACE") {
      setSecretWordInput((prev) => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key)) {
      // cap at 5; do NOT auto-submit
      setSecretWordInput((prev) => (prev.length < 5 ? prev + key : prev));
    }
  };

  const handleRematch = () => {
    onRematch();
    setMySubmittedSecret("");
  };

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 🔑 Physical keyboard routing
  useEffect(() => {
    const handler = (event) => {
      // Always stop so App-level listeners don't double-handle
      event.stopPropagation();

      // If I'm setting my secret, edit local input only
      if (canSetSecret) {
        const up = event.key.toUpperCase();
        if (up === "ENTER") {
          if (secretWordInput.length === 5) handleSecretSubmit(secretWordInput);
          event.preventDefault();
          return;
        }
        if (up === "BACKSPACE") {
          setSecretWordInput((p) => p.slice(0, -1));
          event.preventDefault();
          return;
        }
        if (/^[A-Z]$/.test(up)) {
          setSecretWordInput((p) => (p.length < 5 ? p + up : p));
          event.preventDefault();
          return;
        }
        // Ignore other keys while setting secret
        event.preventDefault();
        return;
      }

      // If BOTH secrets are set (mine locally locked or server-provided, AND opponent’s server-provided),
      // route physical keys to game input
      const mySecretReady = secretLocked || !!me?.secret;
      const oppSecretReady = !!opponent?.secret;
      if (canGuess) {
        const up = event.key.toUpperCase();
        if (up === "ENTER") onKeyPress("ENTER");
        else if (up === "BACKSPACE") onKeyPress("BACKSPACE");
        else if (/^[A-Z]$/.test(up)) onKeyPress(up);
        event.preventDefault();
        return;
      }

      // Otherwise block typing
      event.preventDefault();
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [canSetSecret, secretWordInput, isGameEnded, onKeyPress, canGuess]);

  // On-screen keyboard router
  const handleKeyPress = (key) => {
    if (canSetSecret) {
      handleSecretKeyPress(key);
      return;
    }
    if (canGuess) {
      onKeyPress(key);
    }
  };

  // Swipe gestures
  const swipeGestures = useSwipeGestures(
    () => {
      if (isMobile) setMobileView("opponent");
      else if (isGameEnded) window.location.href = "/";
    },
    () => {
      if (isMobile) setMobileView("me");
      else if (isGameEnded && !hasRequestedRematch) handleRematch();
    },
    null,
    null
  );
  //functions
  function bumpSecretError() {
    setSecretErrorActive(true);
    setSecretErrorKey((k) => k + 1);
    setTimeout(() => setSecretErrorActive(false), 300);
  }

  // Simple countdown from a deadline (ms since epoch).
  function useCountdown(deadline) {
    const [remaining, setRemaining] = useState(() =>
      deadline ? Math.max(0, deadline - Date.now()) : 0
    );

    // Capture the initial total so we can draw a progress bar %
    const [initialTotal, setInitialTotal] = useState(null);
    useEffect(() => {
      if (!deadline) {
        setRemaining(0);
        setInitialTotal(null);
        return;
      }
      const first = Math.max(0, deadline - Date.now());
      setRemaining(first);
      // keep the first seen total for this round
      setInitialTotal((t) => (t == null ? first : t));

      const id = setInterval(() => {
        setRemaining(Math.max(0, deadline - Date.now()));
      }, 250);
      return () => clearInterval(id);
    }, [deadline]);

    const secs = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    const label = `${mm}:${ss}`;

    const pct =
      initialTotal && initialTotal > 0
        ? Math.max(0, Math.min(100, (remaining / initialTotal) * 100))
        : null;

    return { remaining, label, pct };
  }

  // What to show in the secret row for ME
  // While setting, show what you're typing; after submit, mask it.
  const mySecretWord = canSetSecret
    ? secretWordInput.padEnd(5, " ")
    : revealNow
    ? revealMine // <- reveal after game ends
    : "?????";
  const mySecretState = canSetSecret
    ? secretWordInput.length
      ? "typing"
      : "empty"
    : "set";
  // Opponent secret row (always masked once present)
  const oppSecretWord = revealNow
    ? revealOpp.trim()
      ? revealOpp
      : "?????"
    : oppReady || isGameStarted
    ? "?????"
    : "";
  const oppSecretState = revealNow
    ? "set"
    : oppReady || isGameStarted
    ? "set"
    : "empty";
  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-background relative"
      {...swipeGestures}
    >
      <ParticleEffect
        trigger={showParticles}
        type="wordComplete"
        position={particlePosition}
      />
      <ConfettiEffect trigger={showConfetti} />

      {/* Header */}
      <header className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              W+
            </div>
            <h1 className="text-lg font-bold text-slate-800">WordlePlus</h1>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-600 font-medium">Room:</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {room?.id}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(room?.id || "")}
              className="text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Copy room ID"
            >
              📋
            </button>
          </div>
        </div>

        <h2 className="text-base md:text-lg font-semibold text-center text-muted-foreground">
          {isGameEnded ? (
            bothRequestedRematch ? (
              "Rematch starting..."
            ) : (
              "Game ended - ready for rematch?"
            )
          ) : (
            <>
              Fewest guesses wins
              {deadline && (
                <span
                  className={[
                    "ml-2 font-mono px-2 py-0.5 rounded border",
                    low
                      ? "bg-red-100 text-red-700 border-red-200"
                      : warn
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200",
                  ].join(" ")}
                >
                  {timerLabel}
                </span>
              )}
            </>
          )}
        </h2>

        {/* Slim progress bar under header when round is live */}
        {!isGameEnded && deadline && (
          <div className="mx-auto mt-2 w-full max-w-xl h-1.5 rounded bg-slate-200 overflow-hidden">
            <div
              className={[
                "h-full transition-[width] duration-250",
                low ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500",
              ].join(" ")}
              style={{ width: `${pct ?? 100}%` }}
            />
          </div>
        )}

        {isGameEnded && (
          <div className="text-center mt-2">
            <div className="text-sm text-slate-600">
              {hasRequestedRematch
                ? "✅ You requested rematch"
                : "⏳ Waiting for your rematch request"}
            </div>
            <div className="text-sm text-slate-600">
              {opponentRequestedRematch
                ? "✅ Opponent requested rematch"
                : "⏳ Waiting for opponent's rematch request"}
            </div>
            {bothRequestedRematch && (
              <div className="text-sm text-green-600 font-medium mt-1">
                🚀 Both players ready! Starting rematch...
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 px-4 pb-2" style={{ minHeight: 0 }}>
        {isMobile ? (
          <MobileBoardSwitcher
            currentView={mobileView}
            onViewChange={setMobileView}
            myBoard={{
              guesses: me?.guesses || [],
              activeGuess: currentGuess,
              errorShakeKey: shakeKey,
              errorActiveRow: showActiveError,
              secretWord: mySecretWord,
              secretWordState: mySecretState,
              onSecretWordSubmit: canSetSecret ? handleSecretSubmit : null, // harmless (Board ignores click)
              isOwnBoard: true,
              maxTile: 200,
              minTile: 60,
              player: me,
              secretErrorActive: secretErrorActive,
              secretErrorKey: secretErrorKey,
            }}
            opponentBoard={{
              guesses: opponent?.guesses || [],
              activeGuess: "",
              secretWord: oppSecretWord,
              secretWordState: oppSecretState,
              isOwnBoard: false,
              maxTile: 200,
              minTile: 60,
              player: opponent,
            }}
            className="h-full"
          />
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 place-items-center">
            {/* YOU */}
            <section className="w-full flex flex-col">
              <div className="w-full max-w-[min(92vw,820px)]">
                <DuelPlayerCard
                  name={me?.name || "You"}
                  wins={me?.wins}
                  streak={me?.streak}
                  avatar="🧑"
                  host={room?.hostId === me?.id}
                  isTyping={canSetSecret && !!secretWordInput}
                  hasSecret={myReady}
                  disconnected={!!me?.disconnected}
                  highlight={
                    isGameEnded && room?.winner === me?.id ? "winner" : "none"
                  }
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  lineHeight: 1,
                  color: "#64748b",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  paddingTop: "6px",
                }}
              >
                Secret Word
              </div>
              {canSetSecret && secretWordInput.length === 5 && (
                <div className="text-center text-xs text-muted-foreground mt-1">
                  Press <span className="font-semibold">Enter</span> to lock
                  your word
                </div>
              )}

              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div className="w-full max-w-[min(99.8vw,2000px)] h-full flex items-center justify-center">
                  <Board
                    guesses={me?.guesses || []}
                    activeGuess={currentGuess}
                    errorShakeKey={shakeKey}
                    errorActiveRow={showActiveError}
                    secretWord={mySecretWord}
                    secretWordState={mySecretState}
                    onSecretWordSubmit={
                      canSetSecret ? handleSecretSubmit : null
                    }
                    isOwnBoard={true}
                    maxTile={150}
                    minTile={50}
                    secretErrorActive={secretErrorActive}
                    secretErrorKey={secretErrorKey}
                  />
                </div>
              </div>
            </section>

            {/* OPPONENT */}
            <section className="w-full flex flex-col">
              <div className="w-full max-w-[min(92vw,820px)] mx-auto">
                <DuelPlayerCard
                  name={opponent?.name || "—"}
                  wins={opponent?.wins}
                  streak={opponent?.streak}
                  avatar="🧑‍💻"
                  host={room?.hostId === opponent?.id}
                  isTyping={false}
                  hasSecret={oppReady || isGameStarted}
                  disconnected={!!opponent?.disconnected}
                  highlight={
                    isGameEnded && room?.winner === opponent?.id
                      ? "winner"
                      : "none"
                  }
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  lineHeight: 1,
                  color: "#64748b",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  paddingTop: "6px",
                }}
              >
                Secret Word
              </div>

              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div className="w-full max-w-[min(99.8vw,2000px)] h-full flex items-center justify-center">
                  <Board
                    guesses={opponent?.guesses || []}
                    activeGuess=""
                    secretWord={oppSecretWord}
                    secretWordState={oppSecretState}
                    isOwnBoard={false}
                    maxTile={150}
                    minTile={50}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 w-full px-2 sm:px-4 pb-4 md:pb-6">
        <div className="mx-auto w-full max-w-5xl">
          {isGameEnded ? (
            <div className="text-center">
              <Button
                onClick={handleRematch}
                disabled={hasRequestedRematch}
                className={`px-8 py-3 font-medium text-lg ${
                  hasRequestedRematch
                    ? "bg-green-600 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {hasRequestedRematch
                  ? "✅ Rematch Requested"
                  : "🚀 Request Rematch"}
              </Button>
              <p className="text-sm text-slate-600 mt-2">
                {hasRequestedRematch
                  ? "Waiting for opponent to request rematch..."
                  : "Click to request a rematch (both players must request)"}
              </p>
            </div>
          ) : canSetSecret || canGuess ? (
            <Keyboard onKeyPress={handleKeyPress} letterStates={letterStates} />
          ) : (
            <div className="text-center py-8">
              <p className="text-lg font-medium text-slate-600">
                {!myReady
                  ? "Set your secret word to continue..."
                  : !oppReady
                  ? "Waiting for opponent to set their secret word..."
                  : "Both players ready! Starting..."}
              </p>
            </div>
          )}
        </div>
      </footer>

      {/* Floating FABs */}
      {/* {isGameEnded && (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-40">
          <Button
            onClick={handleRematch}
            disabled={hasRequestedRematch}
            className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-emerald-600 hover:bg-emerald-700"
            title={
              hasRequestedRematch
                ? "Waiting for opponent..."
                : "Request Rematch"
            }
          >
            {hasRequestedRematch ? "⏳" : "🔄"}
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-red-600 hover:bg-red-700"
            title="Quit Game"
          >
            ✕
          </Button>
        </div>
      )} */}
    </div>
  );
}

export default DuelGameScreen;
