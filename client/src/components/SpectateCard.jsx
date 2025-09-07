import React from "react";
import Board from "./Board";

function SpectateCard({ player, room }) {
  const initials = getInitials(player?.name);
  const isHost = player?.id === room?.hostId;

  return (
    <div className="rounded-xl border bg-white p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold
            ${isHost ? "bg-blue-100 text-blue-700" : "bg-muted"}`}
          title={isHost ? "Host" : player?.name}
        >
          {isHost ? "👑" : initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            {player?.name || "—"}{" "}
            {isHost && (
              <span className="text-xs text-blue-600 font-medium">(Host)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {isHost
              ? "Spectating"
              : player?.done
              ? "Done"
              : `${player?.guesses?.length ?? 0}/6`}
          </div>
        </div>
      </div>

      {/* Board (fills remaining space) */}
      <div className="mt-2 flex-1 min-h-[260px] grid place-items-center">
        <div className="w-full h-full">
          <Board
            guesses={player?.guesses || []}
            activeGuess=""
            // Let Board size itself using its ResizeObserver
            // (do NOT pass fixed tile; no autoFit={false})
            maxTile={90}
            minTile={38}
            isOwnBoard={false}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export default SpectateCard;
