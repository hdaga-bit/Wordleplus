import React, { useEffect, useMemo, useState, useRef } from "react";
import SpectateCard from "../components/SpectateCard.jsx";
import SecretWordInputRow from "../components/SecretWordInputRow.jsx";

function HostSpectateScreen({
  room,
  players = [],
  onWordSubmit,
  onCopyRoomId,
}) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // one-shot “reconnected” badge
  const [showReconnected, setShowReconnected] = useState(() => {
    const s = sessionStorage.getItem("wp.reconnected") === "1";
    const legacy = localStorage.getItem("wp.lastSocketId.wasHost") === "true";
    return s || legacy;
  });
  useEffect(() => {
    if (!showReconnected) return;
    sessionStorage.removeItem("wp.reconnected");
    localStorage.removeItem("wp.lastSocketId.wasHost");
    const t = setTimeout(() => setShowReconnected(false), 3500);
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
    const id = room?.battle?.winner;
    if (!id) return null;
    return (
      room?.players?.[id]?.name ||
      players.find((p) => p.id === id)?.name ||
      "Unknown player"
    );
  }, [room?.battle?.winner, room?.players, players]);

  // simple leaderboard data
  const leaderboard = useMemo(() => {
    return [...players]
      .map((p) => ({
        id: p.id,
        name: p.name || "—",
        wins: p.wins ?? 0,
        streak: p.streak ?? 0,
        disconnected: !!p.disconnected,
      }))
      .sort(
        (a, b) =>
          b.wins - a.wins || b.streak - a.streak || a.name.localeCompare(b.name)
      );
  }, [players]);

  // ---- UI ----
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-2 sm:px-3 pt-2 pb-1">
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

        <div className="flex items-center gap-2">
          {/* Leaderboard button appears always; modal shows on demand */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--card-text)",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "var(--card-hover)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "var(--card-bg)";
            }}
            title="Show leaderboard"
          >
            🏆 Leaderboard
          </button>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--card-text-muted)" }}
            >
              Room:
            </span>
            <span
              className="font-mono font-bold text-sm"
              style={{ color: "var(--card-text)" }}
            >
              {room?.id}
            </span>
            <button
              onClick={onCopyRoomId}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--card-text-muted)" }}
              aria-label="Copy room ID"
            >
              📋
            </button>
            <span
              className="ml-2 text-xs"
              style={{ color: "var(--card-text-muted)" }}
            >
              {connectedCount}/{players.length} online
            </span>
          </div>
        </div>
      </div>

      {/* Title / status */}
      <div className="text-center mt-1 mb-3">
        {roundActive ? (
          <>
            <h3 className="text-lg font-semibold text-slate-700">
              Player Progress
            </h3>
            <p className="text-sm text-slate-600">
              Watch players compete in real time.
            </p>
          </>
        ) : (
          <>
            {roundFinished ? (
              <div className="mx-auto max-w-xl mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
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
              <p className="text-sm text-slate-600 mb-2">
                Enter a word to start the game.
              </p>
            )}
            {!room?.battle?.started && (
              <SecretWordInputRow
                onSubmit={onWordSubmit}
                submitHint="Press Enter to set word"
                showGenerate={true}
                size={64}
              />
            )}
          </>
        )}
      </div>

      {/* Spectate grid: full-height, responsive columns, no overlap */}
      {roundActive && (
        <section className="flex-1 min-h-0 px-2 sm:px-3 pb-3">
          <div
            className="h-[calc(100vh-180px)] overflow-auto"
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              alignContent: "start",
            }}
          >
            {players.map((p) => (
              <SpectateCard key={p.id} player={p} room={room} dense />
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard modal (on demand) */}
      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            className="w-full max-w-md rounded-xl shadow-lg border p-3"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4
                className="font-semibold"
                style={{ color: "var(--card-text)" }}
              >
                Leaderboard
              </h4>
              <button
                className="rounded px-2 py-1 text-sm border"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--card-text)",
                  backgroundColor: "var(--card-hover)",
                }}
                onClick={() => setShowLeaderboard(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-auto">
              {leaderboard.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm py-1 px-2 rounded"
                  style={{
                    color: "var(--card-text, #f1f5f9)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "var(--card-hover)";
                    // Ensure text remains visible on hover
                    const nameSpan = e.target.querySelector("span[title]");
                    if (nameSpan) {
                      nameSpan.style.color = "var(--card-text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    // Ensure text remains visible after hover
                    const nameSpan = e.target.querySelector("span[title]");
                    if (nameSpan) {
                      nameSpan.style.color = "var(--card-text)";
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5"
                      style={{ color: "var(--card-text-muted, #94a3b8)" }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      className={[
                        "truncate",
                        p.disconnected ? "opacity-60" : "",
                      ].join(" ")}
                      title={p.name}
                      style={{
                        color: "var(--card-text, #f1f5f9)",
                        fontWeight: "500",
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                <div
                  className="text-xs text-center py-6"
                  style={{ color: "var(--card-text-muted, #94a3b8)" }}
                >
                  No players yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostSpectateScreen;
