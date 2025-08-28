import React from "react";
import PlayerProgressCard from "../PlayerProgressCard.jsx";

function PlayerProgressSection({
  players,
  currentPlayerId,
  hostId,
  isGameActive = true,
}) {
  if (!isGameActive) return null;

  // Filter players to show only other players (not current player or host)
  const otherPlayers = players.filter(
    (player) => player.id !== currentPlayerId && player.id !== hostId
  );

  if (otherPlayers.length === 0) return null;

  return (
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-3 max-h-[80vh] overflow-y-auto">
      {otherPlayers.map((player) => (
        <PlayerProgressCard
          key={player.id}
          player={player}
          isCurrentPlayer={false}
        />
      ))}
    </div>
  );
}

export default PlayerProgressSection;
