import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function RoomInfo({ roomId, room, isHost, onCopyRoomId }) {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      onCopyRoomId?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Failed to copy room ID
    }
  };

  const getRoomStatus = () => {
    if (room?.mode === "duel") {
      return room?.started ? "Game in Progress" : "Waiting for players";
    }
    if (room?.mode === "battle") {
      if (room?.battle?.started) return "Battle in Progress";
      if (room?.battle?.winner || room?.battle?.reveal) return "Game Ended";
      return "Waiting for host to start";
    }
    return "Ready";
  };

  const getStatusColor = () => {
    const status = getRoomStatus();
    if (status.includes("Progress"))
      return "text-green-600 bg-green-50 border-green-200";
    if (status.includes("Waiting"))
      return "text-blue-600 bg-blue-50 border-blue-200";
    if (status.includes("Ended"))
      return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200 shadow-lg">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Room ID Section */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-800">Room Code</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-white border-2 border-blue-300 rounded-lg px-6 py-3 shadow-inner">
                <span className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
                  {roomId}
                </span>
              </div>
              <Button
                onClick={handleCopyRoomId}
                variant={copied ? "default" : "outline"}
                className={`min-w-[100px] ${
                  copied
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-blue-300 text-blue-600 hover:bg-blue-50"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-slate-600">
              Share this code with friends to join your game
            </p>
          </div>

          {/* Room Status */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                getRoomStatus().includes("Progress")
                  ? "bg-green-500"
                  : getRoomStatus().includes("Waiting")
                  ? "bg-blue-500"
                  : "bg-amber-500"
              }`}
            ></span>
            <span className={getStatusColor()}>{getRoomStatus()}</span>
          </div>

          {/* Game Mode */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            <span className="text-slate-600 text-xs font-medium">
              Mode: {room?.mode === "duel" ? "1v1 Duel" : "Battle Royale"}
            </span>
          </div>

          {/* Host Indicator */}
          {isHost && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
              <span className="text-yellow-600 text-lg">👑</span>
              <span className="text-sm font-medium text-yellow-800">
                You are the Host
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RoomInfo;
