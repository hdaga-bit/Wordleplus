import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import { DuelPlayerCard } from "../components/DuelPlayerCard.jsx";
import MobileBoardSwitcher from "../components/MobileBoardSwitcher.jsx";
import ParticleEffect from "../components/ParticleEffect.jsx";
import ConfettiEffect from "../components/ConfettiEffect.jsx";
import { useSwipeGestures } from "../hooks/useSwipeGestures.js";
import { Button } from "@/components/ui/button";
import { getRandomWord } from "../api";
import { useRef } from "react";
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
  const [showCorrectParticles, setShowCorrectParticles] = useState(false);
  const [showStreakParticles, setShowStreakParticles] = useState(false);
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
  const [showSecretReveal, setShowSecretReveal] = useState(false);
  const [guessFlipKey, setGuessFlipKey] = useState(0);
  const [lastStreak, setLastStreak] = useState(0);

  // Mobile UX
  const [mobileView, setMobileView] = useState("me");
  const [isMobile, setIsMobile] = useState(false);

  // Generate random word
  const [genBusy, setGenBusy] = useState(false);
  const [boardMetrics, setBoardMetrics] = useState(null);

  // Dynamic tile cap calculation
  const ROWS = 7; // 1 secret row + 6 guess rows
  const PAD = 12; // matches Board padding you pass
  const GAP = 10; // matches Board gap you pass
  const [tileCap, setTileCap] = useState(140); // start generous

  // Derived flags
  const isGameStarted = !!room?.started;
  const isGameEnded = !!(room?.winner || room?.duelReveal);
  const hasRequestedRematch = !!me?.rematchRequested;
  const opponentRequestedRematch = !!opponent?.rematchRequested;
  const bothRequestedRematch = hasRequestedRematch && opponentRequestedRematch;
  const canGuess = isGameStarted && !isGameEnded;
  const myGuesses = me?.guesses || [];
  const latestGuessWord = myGuesses.length
    ? (myGuesses[myGuesses.length - 1]?.guess || "").toUpperCase()
    : "";
  const normalizedCurrentGuess = (currentGuess || "").toUpperCase();
  const activeGuessForMe =
    normalizedCurrentGuess && normalizedCurrentGuess !== latestGuessWord
      ? currentGuess
      : "";

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

  // Trigger secret word reveal animation when game ends
  useEffect(() => {
    if (isGameEnded && revealNow) {
      // Small delay to let the game end state settle
      const timer = setTimeout(() => {
        setShowSecretReveal(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowSecretReveal(false);
    }
  }, [isGameEnded, revealNow]);

  // Trigger guess flip animation when a new guess is added
  useEffect(() => {
    if (me?.guesses && me.guesses.length > 0) {
      // Small delay to let the guess state update
      const timer = setTimeout(() => {
        setGuessFlipKey((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [me?.guesses?.length]);

  // Trigger particles for correct guesses
  useEffect(() => {
    if (me?.guesses && me.guesses.length > 0) {
      const lastGuess = me.guesses[me.guesses.length - 1];
      if (lastGuess && lastGuess.pattern) {
        const hasCorrect = lastGuess.pattern.some((state) => state === "green");
        if (hasCorrect) {
          // Position particles at the center of my board
          setParticlePosition({
            x: window.innerWidth / 4, // Left side for my board
            y: window.innerHeight / 2 - 100,
          });
          setShowCorrectParticles(true);
          const timer = setTimeout(() => setShowCorrectParticles(false), 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [me?.guesses?.length]);

  // Trigger streak celebration particles
  useEffect(() => {
    if (me?.streak && me.streak > lastStreak && me.streak > 0) {
      setLastStreak(me.streak);

      // Celebrate significant streak milestones
      const shouldCelebrate =
        me.streak === 3 || // First milestone
        me.streak === 5 || // Second milestone
        me.streak === 10 || // Major milestone
        me.streak === 15 || // Epic milestone
        me.streak === 20 || // Legendary milestone
        (me.streak > 20 && me.streak % 5 === 0); // Every 5 after 20

      if (shouldCelebrate) {
        setParticlePosition({
          x: window.innerWidth / 4, // Left side for my board
          y: window.innerHeight / 2 - 150,
        });
        setShowStreakParticles(true);

        // Longer celebration for higher streaks
        const duration = me.streak >= 10 ? 3000 : 2000;
        const timer = setTimeout(() => setShowStreakParticles(false), duration);
        return () => clearTimeout(timer);
      }
    }
  }, [me?.streak, lastStreak]);

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

  async function handleGenerateSecret() {
    if (!canSetSecret || genBusy) return;
    try {
      setGenBusy(true);
      const w = await getRandomWord();
      if (w && w.length === 5) {
        setSecretWordInput(w); // fill the tiles
        // NOTE: still requires Enter to lock in (per your flow)
      }
    } catch (e) {
      // Error occurred
    } finally {
      setGenBusy(false);
    }
  }

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

  // Dynamic tile cap calculation
  useLayoutEffect(() => {
    function calc() {
      // heights we must leave for non-board UI (rough but safe)
      const statusH = 68; // "Fewest guesses wins" + timer
      const footerH = 60; // rematch button or waiting message
      const keyboardH = canSetSecret || canGuess ? 180 : 0; // compact keyboard height
      const vpad = 16; // reduced page paddings/margins
      const available =
        window.innerHeight - (statusH + footerH + keyboardH + vpad);

      // tile that fits vertically inside 'available'
      const best = Math.floor((available - PAD * 2 - GAP * (ROWS - 1)) / ROWS);

      // clamp to a sensible range; your Board respects maxTile/minTile
      setTileCap(Math.max(50, Math.min(150, best)));
    }

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [canSetSecret, canGuess]);

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
      className="w-full flex flex-col bg-background relative overflow-hidden"
      style={{ minHeight: "calc(100dvh - 64px)" }}
      {...swipeGestures}
    >
      <ParticleEffect
        trigger={showParticles}
        type="wordComplete"
        position={particlePosition}
      />
      <ParticleEffect
        trigger={showCorrectParticles}
        type="correctGuess"
        position={particlePosition}
        intensity={1.2}
      />
      <ParticleEffect
        trigger={showStreakParticles}
        type="streak"
        position={particlePosition}
        intensity={me?.streak >= 10 ? 2.5 : me?.streak >= 5 ? 2.0 : 1.5}
      />
      <ConfettiEffect trigger={showConfetti} />

      {/* Game Status */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base md:text-lg font-semibold text-center text-muted-foreground flex-1">
            {isGameEnded ? (
              bothRequestedRematch ? (
                "Rematch starting..."
              ) : (
                "Game ended - ready for rematch?"
              )
            ) : (
              <>
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

          {/* Room ID Display */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-600 font-medium">Room:</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {room?.id}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(room?.id || "");
              }}
              className="text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Copy room ID"
              title="Copy room ID"
            >
              📋
            </button>
          </div>
        </div>

        {/* Slim progress bar when round is live */}
        {!isGameEnded && deadline && (
          <div className="mx-auto mt-2 w-full max-w-xl h-1.5 rounded bg-slate-200 overflow-hidden">
            <div
              className={[
                "h-full",
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
      </div>

      {/* Main */}
      <main className="flex-1 px-3 md:px-4 pt-2 pb-3 min-h-0">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <MobileBoardSwitcher
              currentView={mobileView}
              onViewChange={setMobileView}
              myBoard={{
                guesses: me?.guesses || [],
                activeGuess: activeGuessForMe,
                errorShakeKey: shakeKey,
                errorActiveRow: showActiveError,
                secretWord: mySecretWord,
                secretWordState: mySecretState,
                onSecretWordSubmit: canSetSecret ? handleSecretSubmit : null, // harmless (Board ignores click)
                isOwnBoard: true,
                maxTile: tileCap,
                minTile: 50,
                player: me,
                secretErrorActive: secretErrorActive,
                secretErrorKey: secretErrorKey,
                secretWordReveal: showSecretReveal,
                guessFlipKey: guessFlipKey,
              }}
              opponentBoard={{
                guesses: opponent?.guesses || [],
                activeGuess: "",
                secretWord: oppSecretWord,
                secretWordState: oppSecretState,
                isOwnBoard: false,
                maxTile: tileCap,
                minTile: 50,
                player: opponent,
                secretWordReveal: showSecretReveal,
                guessFlipKey: guessFlipKey,
              }}
              className="flex-1"
            />

            {/* Mobile generate button */}
            {canSetSecret && mobileView === "me" && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleGenerateSecret}
                  disabled={genBusy}
                  title="Generate a random word"
                  aria-label="Generate a random word"
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 shadow-sm active:scale-95 flex items-center gap-2"
                >
                  {genBusy ? "…" : "🎲"} Generate
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full min-h-0 flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
            {/* YOU */}
            <section className="w-full md:flex-1 flex flex-col gap-3">
              <div className="w-full max-w-[min(92vw,820px)] mx-auto">
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

              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground text-center">
                Secret Word
              </div>
              {canSetSecret && secretWordInput.length === 5 && (
                <div className="text-center text-xs text-muted-foreground">
                  Press <span className="font-semibold">Enter</span> to lock
                  your word
                </div>
              )}

              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div className="relative inline-block">
                  <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{ maxWidth: "min(96vw, 2000px)", maxHeight: "100%" }}
                  >
                    <Board
                      guesses={me?.guesses || []}
                      activeGuess={activeGuessForMe}
                      errorShakeKey={shakeKey}
                      errorActiveRow={showActiveError}
                      secretWord={mySecretWord}
                      secretWordState={mySecretState}
                      onSecretWordSubmit={
                        canSetSecret ? handleSecretSubmit : null
                      }
                      isOwnBoard={true}
                      maxTile={tileCap}
                      minTile={50}
                      secretErrorActive={secretErrorActive}
                      secretErrorKey={secretErrorKey}
                      onMeasure={setBoardMetrics}
                      secretWordReveal={showSecretReveal}
                      guessFlipKey={guessFlipKey}
                    />
                  </div>

                  {/* 🎲 generate button — appears only while you're setting your secret */}
                  {/* 🎲 exactly aligned with the secret row center */}
                  {canSetSecret && boardMetrics && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // keep keyboard focus
                      onClick={handleGenerateSecret}
                      disabled={genBusy}
                      title="Generate a random word"
                      aria-label="Generate a random word"
                      className="absolute left-full ml-3 w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-50 shadow-sm active:scale-95 grid place-items-center"
                      style={{
                        // align to secret row’s vertical center
                        top:
                          (boardMetrics.padding ?? 0) +
                          (boardMetrics.tile ?? 0) / 2 -
                          20,
                      }}
                    >
                      {genBusy ? "…" : "🎲"}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* OPPONENT */}
            <section className="w-full md:flex-1 flex flex-col gap-3">
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

              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground text-center">
                Secret Word
              </div>

              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ maxWidth: "min(96vw, 2000px)", maxHeight: "100%" }}
                >
                  <Board
                    guesses={opponent?.guesses || []}
                    activeGuess=""
                    secretWord={oppSecretWord}
                    secretWordState={oppSecretState}
                    isOwnBoard={false}
                    maxTile={tileCap}
                    minTile={50}
                    secretWordReveal={showSecretReveal}
                    guessFlipKey={guessFlipKey}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-2 sm:px-4 py-1.5">
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
          ) : !canSetSecret && !canGuess ? (
            <div className="text-center py-4">
              <p className="text-lg font-medium text-slate-600">
                {!myReady
                  ? "Set your secret word to continue..."
                  : !oppReady
                  ? "Waiting for opponent to set their secret word..."
                  : "Both players ready! Starting..."}
              </p>
            </div>
          ) : null}
        </div>
      </footer>

      {/* Keyboard - Now in its own grid row */}
      {(canSetSecret || canGuess) && (
        <div className="w-full px-2 sm:px-4 py-1.5">
          <div className="mx-auto w-full max-w-5xl">
            <Keyboard onKeyPress={handleKeyPress} letterStates={letterStates} />
          </div>
        </div>
      )}

      {/* Floating FABs */}
      {/* {isGameEnded && (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-40">
          <Button
            onClick={handleRematch}
            disabled={hasRequestedRematch}
            className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl bg-emerald-600 hover:bg-emerald-700"
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
