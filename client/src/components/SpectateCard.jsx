import React from "react";
import Board from "./Board";

function SpectateCard({ player, room }) {
  const initials = getInitials(player.name);
  const isHost = player.id === room?.hostId;

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Player Info */}
      <div className="flex items-center gap-2">
        <div
          className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ${
            isHost ? "bg-blue-100 text-blue-700" : "bg-muted"
          }`}
        >
          {isHost ? "👑" : initials}
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold flex items-center gap-1">
            {player.name}
            {isHost && (
              <span className="text-xs text-blue-600 font-medium">(Host)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {isHost
              ? "Spectating"
              : player.done
              ? "Done"
              : `${player.guesses?.length ?? 0}/6`}
          </div>
        </div>
      </div>

      {/* Player Board */}
      <div className="w-full max-w-[200px] h-[140px]">
        <Board
          guesses={player.guesses || []}
          tile={35}
          gap={4}
          autoFit={false}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export default SpectateCard;
