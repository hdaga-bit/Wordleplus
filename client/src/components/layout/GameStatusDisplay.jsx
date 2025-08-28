import React from "react";

function GameStatusDisplay({ room, players, isHost, variant = "default" }) {
  const getStatusMessage = () => {
    if (!room?.battle) return null;

    if (room.battle.started && !room.battle.winner && !room.battle.reveal) {
      return {
        text: isHost ? "Game in progress..." : "Game in progress... Good luck!",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
      };
    }

    if (room.battle.winner) {
      const winnerName =
        players.find((p) => p.id === room.battle.winner)?.name || "Unknown";
      return {
        text: `Winner: ${winnerName}`,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    }

    if (room.battle.reveal && !room.battle.winner) {
      return {
        text: "No winner - word revealed",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      };
    }

    if (!room.battle.started && !room.battle.winner && !room.battle.reveal) {
      return {
        text: isHost
          ? "Enter a word to start the game"
          : "Waiting for host to start the game...",
        color: "text-slate-600",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
      };
    }

    return null;
  };

  const status = getStatusMessage();
  if (!status) return null;

  const getContainerClass = () => {
    switch (variant) {
      case "header":
        return "text-center space-y-1";
      case "inline":
        return "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border";
      case "banner":
        return "w-full p-3 rounded-lg border text-center";
      default:
        return "text-center space-y-1";
    }
  };

  const getTextClass = () => {
    const baseClass = "text-xs font-medium";
    return `${baseClass} ${status.color}`;
  };

  if (variant === "inline") {
    return (
      <div
        className={`${getContainerClass()} ${status.bgColor} ${
          status.borderColor
        }`}
      >
        <span className={getTextClass()}>{status.text}</span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`${getContainerClass()} ${status.bgColor} ${
          status.borderColor
        }`}
      >
        <p className={getTextClass()}>{status.text}</p>
      </div>
    );
  }

  // Default header variant
  return (
    <div className={getContainerClass()}>
      <p className={getTextClass()}>{status.text}</p>
    </div>
  );
}

export default GameStatusDisplay;
