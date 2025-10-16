// import React, { useState, useEffect } from "react";

import React, { useState, useEffect, useMemo } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import PlayerProgressCard from "../components/PlayerProgressCard.jsx";
import MobileBattleLayout from "../components/MobileBattleLayout.jsx";
import GameResults from "../components/GameResults.jsx";
import ParticleEffect from "../components/ParticleEffect.jsx";

function BattleGameScreen({
  room,
  players,
  allPlayers,
  otherPlayers,
  me,
  isHost,
  currentGuess,
  shakeKey,
  showActiveError,
  letterStates,
  canGuessBattle,
  onKeyPress,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [guessFlipKey, setGuessFlipKey] = useState(0);

  // Particle effects
  const [showCorrectParticles, setShowCorrectParticles] = useState(false);
  const [showStreakParticles, setShowStreakParticles] = useState(false);
  const [showVictoryParticles, setShowVictoryParticles] = useState(false);
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
  const [lastStreak, setLastStreak] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Debug logging to verify server payload
  useEffect(() => {
    if (room?.battle) {
      // Battle state updated
    }
  }, [room?.battle]);

  const roundActive = !!room?.battle?.started;
  const lastWord = room?.battle?.lastRevealedWord ?? null;
  const roundFinished = !roundActive && !!lastWord;
  const playerGuesses = me?.guesses || [];
  const latestBattleGuess = playerGuesses.length
    ? (playerGuesses[playerGuesses.length - 1]?.guess || "").toUpperCase()
    : "";
  const normalizedBattleGuess = (currentGuess || "").toUpperCase();
  const activeGuessForBattle =
    normalizedBattleGuess && normalizedBattleGuess !== latestBattleGuess
      ? currentGuess
      : "";

  const correctWord = useMemo(
    () => (roundFinished ? lastWord : null),
    [roundFinished, lastWord]
  );

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
          // Position particles at the center of the board
          setParticlePosition({
            x: window.innerWidth / 2,
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
          x: window.innerWidth / 2,
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

  // Trigger victory particles when game ends
  useEffect(() => {
    if (roundFinished && room?.battle?.winner === me?.id) {
      setParticlePosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      setShowVictoryParticles(true);
      const timer = setTimeout(() => setShowVictoryParticles(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [roundFinished, room?.battle?.winner, me?.id]);

  return (
    <div
      className="w-full flex flex-col bg-background relative overflow-hidden"
      style={{ minHeight: "calc(100dvh - 64px)" }}
    >
      {/* Particle Effects */}
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
      <ParticleEffect
        trigger={showVictoryParticles}
        type="victory"
        position={particlePosition}
        intensity={2.0}
      />

      {/* Game Status */}
      <div className="px-3 pt-3 pb-2">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">
            Battle Royale
          </h2>

          {!isHost && (
            <div className="text-center space-y-1">
              {roundActive && !roundFinished && (
                <p className="text-xs text-emerald-600 font-medium">
                  Game in progress… good luck!
                </p>
              )}
              {room?.battle?.winner && (
                <p className="text-xs text-blue-600 font-medium">
                  Winner:&nbsp;
                  {players.find((p) => p.id === room.battle.winner)?.name ||
                    "Unknown"}
                </p>
              )}
              {!roundActive && !roundFinished && (
                <p className="text-xs text-slate-600 font-medium">
                  Waiting for host to start the game…
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 px-3 md:px-4 pt-2 pb-3 flex flex-col min-h-0">
        {isMobile ? (
          roundActive ? (
            <MobileBattleLayout
              me={me}
              otherPlayers={otherPlayers}
              currentGuess={currentGuess}
              shakeKey={shakeKey}
              showActiveError={showActiveError}
              letterStates={letterStates}
              canGuessBattle={canGuessBattle}
              onKeyPress={onKeyPress}
              className="h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <GameResults
                room={room}
                players={allPlayers}
                correctWord={correctWord}
              />
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center min-h-0 relative gap-3">
            {/* Center board */}
            {roundActive ? (
              <div className="flex-1 w-full max-w-[min(1100px,95vw)] max-h-[calc(100dvh-260px)] flex items-center justify-center min-h-0">
                <Board
                  guesses={me?.guesses || []}
                  activeGuess={activeGuessForBattle}
                  errorShakeKey={shakeKey}
                  errorActiveRow={showActiveError}
                  maxTile={112}
                  minTile={56}
                  gap={10}
                  padding={12}
                  guessFlipKey={guessFlipKey}
                />
              </div>
            ) : (
              <div className="flex-1 w-full flex items-center justify-center">
                <GameResults
                  room={room}
                  players={allPlayers}
                  correctWord={correctWord}
                />
              </div>
            )}

            {/* Right rail: other players */}
            {roundActive && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
                {otherPlayers?.map((player) => (
                  <PlayerProgressCard
                    key={player.id}
                    player={player}
                    isCurrentPlayer={false}
                  />
                ))}
                <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-background to-transparent" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer (players only) */}
      <footer className="px-2 sm:px-4 pb-2 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          {canGuessBattle ? (
            <Keyboard onKeyPress={onKeyPress} letterStates={letterStates} />
          ) : (
            <div className="text-center text-sm text-slate-500 py-2">
              {roundFinished
                ? "Game ended — waiting for host to start the next round…"
                : "Waiting for host to start the game…"}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default BattleGameScreen;
