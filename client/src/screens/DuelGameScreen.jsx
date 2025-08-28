import React from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import PlayerCard from "../components/PlayerCard.jsx";

function DuelGameScreen({
  me,
  opponent,
  currentGuess,
  shakeKey,
  showActiveError,
  letterStates,
  onKeyPress,
}) {
  return (
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
          <Keyboard onKeyPress={onKeyPress} letterStates={letterStates} />
        </div>
      </footer>
    </div>
  );
}

export default DuelGameScreen;
