import React from "react";
import Keyboard from "../Keyboard.jsx";

function GameFooter({
  mode,
  isHost,
  canGuessBattle,
  letterStates,
  onKeyPress,
  room,
}) {
  const getFooterClass = () => {
    switch (mode) {
      case "duel":
        return "shrink-0 w-full px-2 sm:px-4 pb-4 md:pb-6";
      case "battle":
        return "px-2 sm:px-4 pb-3 flex-shrink-0";
      default:
        return "shrink-0 w-full px-2 sm:px-4 pb-4";
    }
  };

  const getContainerClass = () => {
    switch (mode) {
      case "duel":
        return "mx-auto w-full max-w-5xl";
      case "battle":
        return "max-w-5xl mx-auto";
      default:
        return "mx-auto w-full max-w-5xl";
    }
  };

  if (mode === "battle" && isHost) {
    return (
      <footer className={getFooterClass()}>
        <div className="text-center text-sm text-slate-500">
          Host view - Use the keyboard above to control the game
        </div>
      </footer>
    );
  }

  return (
    <footer className={getFooterClass()}>
      <div className={getContainerClass()}>
        {mode === "battle" && !canGuessBattle ? (
          <div className="text-center text-sm text-slate-500 py-2">
            {room?.battle?.winner || room?.battle?.reveal
              ? "Game ended - waiting for host to start next round..."
              : "Waiting for host to start the game..."}
          </div>
        ) : (
          <Keyboard onKeyPress={onKeyPress} letterStates={letterStates} />
        )}
      </div>
    </footer>
  );
}

export default GameFooter;
