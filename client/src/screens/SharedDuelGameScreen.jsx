import React, { useEffect, useState } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import PlayerCard from "../components/PlayerCard.jsx";
import { useSwipeGestures } from "../hooks/useSwipeGestures.js";
import { Button } from "@/components/ui/button";

export default function SharedDuelGameScreen({ room, me, currentGuess, onKeyPress, letterStates, onStartShared, onRematch }) {
  const opponentEntry = Object.entries(room.players || {}).find(([id]) => id !== me?.id);
  const opponent = opponentEntry ? { id: opponentEntry[0], ...opponentEntry[1] } : null;
  
  const canGuess = room.shared?.started && !room.shared?.winner;
  const myTurn = room.shared?.turn === me?.id;
  const isHost = room?.hostId === me?.id;
  const [starting, setStarting] = useState(false);
  const [guessFlipKey, setGuessFlipKey] = useState(0);

  // bump flip key when a new shared guess is added so Board can animate
  useEffect(() => {
    const len = (room.shared?.guesses || []).length;
    // small debounce to let state settle
    const t = setTimeout(() => setGuessFlipKey((k) => k + 1), 80);
    return () => clearTimeout(t);
  }, [room.shared?.guesses?.length]);
  
  // Check if we have enough players to start
  const playerCount = Object.keys(room?.players || {}).length;
  const canStart = isHost && playerCount >= 2 && !room.shared?.started;

  const handleKey = (k) => {
    if (!canGuess) return;
    if (!myTurn) return;
    onKeyPress(k);
  };

  // Get game status text
  const getGameStatus = () => {
    if (room.shared?.winner) {
      if (room.shared.winner === "draw") return "It's a draw!";
      const winner = room.players?.[room.shared.winner];
      return winner?.id === me?.id ? "You won! 🏆" : `${winner?.name} won! 🏆`;
    }
    if (!room.shared?.started) {
      if (playerCount < 2) {
        return isHost ? "Waiting for opponent to join..." : "Waiting for host to start...";
      }
      return isHost ? "Click 'Start Round' to begin" : "Waiting for host to start...";
    }
    if (myTurn) return "Your turn - make a guess!";
    return `${opponent?.name}'s turn`;
  };

  // Get turn indicator color
  const getTurnIndicatorColor = () => {
    if (room.shared?.winner) return "bg-gray-400";
    if (myTurn) return "bg-green-500";
    return "bg-blue-500";
  };

  return (
    <div className="min-h-dvh w-full overflow-hidden grid grid-rows-[auto_1fr_auto] bg-background relative">
      {/* Header with game status */}
      <header className="px-4 py-3 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-foreground">Shared Wordle</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded">
                {room?.id}
              </span>
            </div>
          </div>
          
          {/* Game status and turn indicator */}
          <div className="flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getTurnIndicatorColor()} transition-colors duration-300`}></div>
            <span className="text-sm font-medium text-center">{getGameStatus()}</span>
            <div className={`w-3 h-3 rounded-full ${getTurnIndicatorColor()} transition-colors duration-300`}></div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 min-h-0">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Player cards */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <PlayerCard 
                name={me?.name || 'You'} 
                wins={me?.wins} 
                streak={me?.streak} 
                avatar={'🧑'} 
                highlight={myTurn ? 'active' : 'none'} 
              />
            </div>
            <div className="flex-1">
              <PlayerCard 
                name={opponent?.name || '—'} 
                wins={opponent?.wins} 
                streak={opponent?.streak} 
                avatar={'🧑‍💻'} 
                highlight={!myTurn && canGuess ? 'active' : 'none'} 
              />
            </div>
          </div>

          {/* Shared board */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full max-w-[min(99.8vw,1200px)] max-h-[calc(100vh-220px)] flex items-center justify-center">
              <Board
                guesses={room.shared?.guesses || []}
                activeGuess={currentGuess}
                isOwnBoard={true}
                // only reveal secret when round has ended
                secretWord={!room.shared?.started && room.shared?.lastRevealedWord ? room.shared.lastRevealedWord : null}
                secretWordState={!room.shared?.started && room.shared?.lastRevealedWord ? 'set' : 'empty'}
                maxTile={140}
                minTile={50}
                players={room?.players || {}}
                currentPlayerId={me?.id}
                guessFlipKey={guessFlipKey}
              />
            </div>
          </div>

          {/* Game controls */}
          <div className="mt-6 flex justify-center">
            {!room.shared?.started ? (
              isHost ? (
                <div className="text-center">
                  <Button
                    onClick={async () => {
                      if (starting || !canStart) return;
                      try {
                        setStarting(true);
                        const result = await onStartShared();
                        if (result?.error) {
                          console.error("Start shared error:", result.error);
                        }
                      } finally {
                        setStarting(false);
                      }
                    }}
                    disabled={starting || !canStart}
                    className="px-6 py-3 text-lg font-semibold"
                  >
                    {starting ? "Starting..." : "Start Shared Round"}
                  </Button>
                  {playerCount < 2 && (
                    <div className="text-sm text-amber-600 mt-2">
                      ⚠️ Waiting for opponent to join...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-lg font-medium text-muted-foreground mb-2">
                    Waiting for host to start...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Both players will compete to solve the same puzzle!
                  </div>
                </div>
              )
            ) : room.shared?.winner ? (
              <div className="text-center">
                <Button
                  onClick={onRematch}
                  className="px-6 py-3 text-lg font-semibold"
                >
                  Play Again
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  {myTurn ? "It's your turn!" : "Waiting for opponent..."}
                </div>
                <div className="text-xs text-muted-foreground">
                  Take turns guessing the same word
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Keyboard */}
      <footer className="w-full px-2 sm:px-4 py-3 border-t border-border fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur md:static">
        <div className="max-w-[min(99.8vw,1200px)] mx-auto">
          <Keyboard
            onKeyPress={handleKey}
            letterStates={letterStates}
            disabled={!myTurn || !canGuess}
          />
        </div>
      </footer>
    </div>
  );
}
