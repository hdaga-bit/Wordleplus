// screens/HostSpectateScreen.jsx
import React, { useEffect, useMemo, useState } from "react";
import SpectateCard from "../components/SpectateCard.jsx";
import SecretWordInput from "../components/SecretWordInput.jsx";

function HostSpectateScreen({
  room,
  players = [],
  onWordSubmit,
  onCopyRoomId,
}) {
  // One-shot "Reconnected" badge
  const [showReconnected, setShowReconnected] = useState(() => {
    const fromSession = sessionStorage.getItem("wp.reconnected") === "1";
    const legacyHostFlag =
      localStorage.getItem("wp.lastSocketId.wasHost") === "true";
    return fromSession || legacyHostFlag;
  });

  useEffect(() => {
    if (!showReconnected) return;
    sessionStorage.removeItem("wp.reconnected");
    localStorage.removeItem("wp.lastSocketId.wasHost");
    const t = setTimeout(() => setShowReconnected(false), 4000);
    return () => clearTimeout(t);
  }, [showReconnected]);

  const connectedCount = useMemo(
    () => players.filter((p) => !p.disconnected).length,
    [players]
  );

  const started = !!room?.battle?.started;
  const hasAnyGuesses = useMemo(
    () => players.some((p) => (p.guesses?.length || 0) > 0),
    [players]
  );
  const roundActive = started;
  const roundFinished =
    !started && (Boolean(room?.battle?.winner) || hasAnyGuesses);

  const winnerName = useMemo(() => {
    const winnerId = room?.battle?.winner;
    if (!winnerId) return null;
    return (
      room?.players?.[winnerId]?.name ||
      players.find((p) => p.id === winnerId)?.name ||
      "Unknown player"
    );
  }, [room?.battle?.winner, room?.players, players]);

  // Leaderboard (hidden until round ends)
  const leaderboard = useMemo(() => {
    return [...players]
      .map((p) => ({
        id: p.id,
        name: p.name || "—",
        wins: p.wins ?? 0,
        streak: p.streak ?? 0,
        disconnected: !!p.disconnected,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return a.name.localeCompare(b.name);
      });
  }, [players]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-600">👑</span>
          <span className="text-sm font-medium text-blue-800">
            You are the Host
          </span>
          {showReconnected && (
            <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 animate-pulse">
              Reconnected
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
          <span className="text-xs text-slate-600 font-medium">Room:</span>
          <span className="font-mono font-bold text-slate-800 text-sm">
            {room?.id}
          </span>
          <button
            onClick={onCopyRoomId}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Copy room ID"
          >
            📋
          </button>
          <span className="ml-2 text-xs text-slate-600">
            {connectedCount}/{players.length} online
          </span>
        </div>
      </div>

      {/* Top message + Secret input (only when no round is active) */}
      <div className="text-center mb-4">
        {roundActive ? (
          <>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              Player Progress
            </h3>
            <p className="text-sm text-slate-600">
              Watch players compete in real time.
            </p>
          </>
        ) : (
          <>
            {roundFinished ? (
              <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  {winnerName
                    ? `Round finished — ${winnerName} won!`
                    : "Round finished — no winner."}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Enter a new word below to start the next round.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-3">
                Enter a 5-letter word to start the game.
              </p>
            )}

            <SecretWordInput
              disabled={false}
              onSubmit={onWordSubmit}
              submitHint={
                roundFinished
                  ? "Press Enter to start new round"
                  : "Press Enter to start"
              }
              tile={68}
              className="mt-2"
            />
          </>
        )}
      </div>

      {/* Main layout: big spectate grid; leaderboard only AFTER round ends */}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Spectate Grid (fills available space) */}
        <section
          className={`lg:col-span-${roundFinished ? "8" : "12"} xl:col-span-${
            roundFinished ? "9" : "12"
          } min-h-0`}
        >
          {(roundActive || roundFinished) && (
            <div
              className="
                h-full min-h-[40vh]
                grid gap-4
                [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]
                content-start
                overflow-auto
                pr-1
              "
            >
              {players.map((player) => (
                <div
                  key={player.id}
                  className="rounded-lg border bg-white p-3 h-full"
                >
                  <SpectateCard
                    player={player}
                    room={room}
                    // If your SpectateCard supports these props, great.
                    // If not, it will ignore them harmlessly.
                    maxTile={110}
                    minTile={44}
                    compactHeader
                  />
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-sm text-slate-500 p-6 text-center border rounded-lg bg-white">
                  No players yet. Share the room code above.
                </div>
              )}
            </div>
          )}
          {!roundActive && !roundFinished && (
            <div className="text-sm text-slate-500 p-6 text-center border rounded-lg bg-white">
              Waiting to start…
            </div>
          )}
        </section>

        {/* Leaderboard: only when the round has finished */}
        {roundFinished && (
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-slate-700 mb-2">Leaderboard</h4>
              <div className="space-y-1 max-h-[60vh] overflow-auto">
                {leaderboard.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-slate-500">{idx + 1}.</span>
                      <span
                        className={[
                          "truncate",
                          idx === 0 ? "text-amber-700" : "",
                          idx === 1 ? "text-slate-700" : "",
                          idx === 2 ? "text-orange-700" : "",
                          p.disconnected ? "opacity-60" : "",
                        ].join(" ")}
                        title={p.name}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        W:{p.wins}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Stk:{p.streak}
                      </span>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-6">
                    No players yet.
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default HostSpectateScreen;
