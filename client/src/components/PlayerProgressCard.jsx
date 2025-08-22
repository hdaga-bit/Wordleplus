import React from "react";

function PlayerProgressCard({ player, isCurrentPlayer = false }) {
  const initials = getInitials(player.name);
  const currentGuess = player.guesses?.[player.guesses.length - 1];
  const totalGuesses = player.guesses?.length || 0;
  const isDone = player.done;

  // Get the last few guesses to show progress (max 3 rows)
  const recentGuesses = player.guesses?.slice(-3) || [];

  // Helper function to get tile color based on pattern
  const getTileColor = (result) => {
    // Handle the actual pattern values from the data
    if (result === "green") {
      return "bg-green-500 text-white";
    } else if (result === "yellow") {
      return "bg-yellow-500 text-white";
    } else if (result === "gray" || result === "grey") {
      return "bg-slate-400 text-white";
    } else {
      return "bg-slate-200 text-slate-400";
    }
  };

  return (
    <div
      className={`relative p-3 rounded-lg border transition-all duration-200 ${
        isCurrentPlayer
          ? "bg-blue-50 border-blue-200 shadow-sm"
          : "bg-white border-slate-200 hover:shadow-md"
      }`}
    >
      {/* Player Info Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`h-8 w-8 rounded-full grid place-items-center text-sm font-semibold ${
            isCurrentPlayer
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${
              isCurrentPlayer ? "text-blue-800" : "text-slate-800"
            }`}
          >
            {player.name}
            {isCurrentPlayer && " (You)"}
          </div>
          <div className="text-xs text-slate-500">
            {isDone ? "Done!" : `${totalGuesses}/6`}
          </div>
        </div>
        {isDone && (
          <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            ✓
          </div>
        )}
      </div>

      {/* Progress Tiles */}
      <div className="space-y-2">
        {recentGuesses.map((guess, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {guess.pattern?.map((result, colIndex) => (
              <div
                key={colIndex}
                className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold ${getTileColor(
                  result
                )}`}
              >
                {/* Show colored tiles but not the actual letters */}
                <div className="w-2 h-2 rounded-full bg-current opacity-80"></div>
              </div>
            ))}
          </div>
        ))}

        {/* Show empty rows for remaining guesses */}
        {Array.from({ length: Math.max(0, 3 - recentGuesses.length) }).map(
          (_, rowIndex) => (
            <div key={`empty-${rowIndex}`} className="flex gap-1">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="w-6 h-6 rounded-sm border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Current Status */}
      {!isDone && totalGuesses > 0 && (
        <div className="mt-2 text-xs text-slate-500 text-center">
          {currentGuess ? "Just guessed!" : "Thinking..."}
        </div>
      )}
    </div>
  );
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export default PlayerProgressCard;
