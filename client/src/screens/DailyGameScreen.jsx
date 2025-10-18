import React from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import { Button } from "@/components/ui/button";

export default function DailyGameScreen({
  challenge,
  guesses,
  currentGuess,
  letterStates,
  onKeyPress,
  onSubmit,
  statusMessage,
  loading = false,
  gameOver = false,
}) {
  const title = challenge?.title || "Daily Challenge";
  const subtitle = challenge?.subtitle || challenge?.date || "";
  const maxGuesses = challenge?.maxGuesses || 6;

  return (
    <div
      className="w-full flex flex-col bg-background relative overflow-hidden"
      style={{ minHeight: "calc(100dvh - 64px)" }}
    >
      <main className="flex-1 px-3 md:px-4 pt-3 pb-3 min-h-0">
        <div className="max-w-3xl mx-auto h-full flex flex-col gap-4">
          <header className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground tracking-wide">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            <p className="text-xs text-muted-foreground tracking-[0.35em] uppercase">
              Guess the word in {maxGuesses} tries
            </p>
          </header>

          <section className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full max-w-[min(96vw,520px)] flex items-center justify-center">
              <Board
                guesses={guesses}
                activeGuess={gameOver ? "" : currentGuess}
                maxTile={120}
                minTile={48}
                gap={10}
                padding={12}
                secretWord={null}
                secretWordState="empty"
              />
            </div>
          </section>

          <footer className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={onSubmit}
                disabled={gameOver || loading}
                className="px-6 py-2 font-semibold"
              >
                {gameOver ? "Completed" : loading ? "Checking..." : "Submit Guess"}
              </Button>
            </div>
            {statusMessage && (
              <p className="text-center text-sm text-muted-foreground">
                {statusMessage}
              </p>
            )}
          </footer>
        </div>
      </main>

      <div className="w-full px-2 sm:px-4 py-2 border-t border-border/40 flex-shrink-0">
        <div className="mx-auto w-full max-w-[min(96vw,520px)]">
          <Keyboard
            onKeyPress={onKeyPress}
            letterStates={letterStates}
            disabled={gameOver || loading}
          />
        </div>
      </div>
    </div>
  );
}
