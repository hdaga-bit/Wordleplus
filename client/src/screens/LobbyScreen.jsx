import React from "react";
import { Button } from "@/components/ui/button";
import PlayersList from "../components/PlayersList.jsx";

function LobbyScreen({
  roomId,
  room,
  players,
  isHost,
  secret,
  setSecret,
  hostWord,
  setHostWord,
  onSubmitSecret,
  onSetWordAndStart,
  message,
}) {
  return (
    <div className="grid gap-6 max-w-md mx-auto">
      <p className="text-lg font-semibold">
        <span className="font-bold">Room:</span> {roomId}{" "}
        <span className="font-bold">Mode:</span> {room?.mode}
      </p>

      {/* Stats surfaced here */}
      <PlayersList
        players={players}
        hostId={room?.hostId}
        showProgress
        showStats
      />

      {room?.mode === "duel" ? (
        <>
          <p className="text-gray-600">
            Pick a secret five-letter word for your opponent to guess.
          </p>
          <div className="flex gap-2">
            <input
              className="border border-gray-300 rounded px-3 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Secret word"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              maxLength={5}
            />
            <Button onClick={onSubmitSecret}>Set Secret</Button>
          </div>
          <p className="text-sm">
            {room?.started ? "started!" : "waiting for both players..."}
          </p>
        </>
      ) : (
        <>
          {isHost ? (
            <div className="flex gap-2 items-center">
              <input
                placeholder="Host secret word"
                value={hostWord}
                onChange={(e) => setHostWord(e.target.value)}
                maxLength={5}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <Button onClick={onSetWordAndStart}>Start Battle</Button>
              <span className="opacity-70">
                {room?.battle?.hasSecret ? "Word set" : "No word yet"}
              </span>
            </div>
          ) : (
            <p>Waiting for host to start…</p>
          )}
        </>
      )}

      {!!message && <p className="text-red-600">{message}</p>}
    </div>
  );
}

export default LobbyScreen;
