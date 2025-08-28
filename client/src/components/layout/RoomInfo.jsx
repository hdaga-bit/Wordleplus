import React from "react";

function RoomInfo({ room, onCopy, variant = "default" }) {
  const getContainerClass = () => {
    switch (variant) {
      case "header":
        return "inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg";
      case "player":
        return "inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg shadow-sm";
      default:
        return "inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg";
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(room?.id);
    } else {
      // Fallback to default clipboard behavior
      navigator.clipboard.writeText(room?.id || "");
    }
  };

  return (
    <div className={getContainerClass()}>
      <span className="text-xs text-slate-600 font-medium">Room:</span>
      <span className="font-mono font-bold text-slate-800 text-sm">
        {room?.id}
      </span>
      <button
        onClick={handleCopy}
        className="text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Copy room ID"
      >
        📋
      </button>
    </div>
  );
}

export default RoomInfo;
