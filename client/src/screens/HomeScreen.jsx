import React from "react";
import { Button } from "@/components/ui/button";

function HomeScreen({
  name,
  setName,
  roomId,
  setRoomId,
  mode,
  setMode,
  onCreate,
  onJoin,
  message,
}) {
  return (
    <div className="grid gap-4 max-w-md mx-auto">
      <input
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex space-x-6">
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "duel"}
            onChange={() => setMode("duel")}
          />
          <span>Duel (1v1)</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "battle"}
            onChange={() => setMode("battle")}
          />
          <span>Battle Royale</span>
        </label>
      </div>

      <Button disabled={!name} onClick={onCreate} className="w-full">
        Create Room
      </Button>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
        />
        <Button disabled={!name || !roomId} onClick={onJoin}>
          Join
        </Button>
      </div>

      {!!message && <p className="text-red-600 font-medium">{message}</p>}
    </div>
  );
}

export default HomeScreen;
