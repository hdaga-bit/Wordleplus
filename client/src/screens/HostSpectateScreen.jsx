import React from "react";
import SpectateCard from "../components/SpectateCard.jsx";
import WordInputTiles from "../components/WordInputTiles.jsx";

function HostSpectateScreen({ room, players, onWordSubmit, onCopyRoomId }) {
  const isReconnectedHost =
    localStorage.getItem("wp.lastSocketId.wasHost") === "true";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Host Status Indicator */}
      <div className="text-center mb-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-600 text-lg">👑</span>
          <span className="text-sm font-medium text-blue-800">
            You are the Host
          </span>
          <span className="text-blue-600 text-lg">👑</span>
        </div>

        {/* Reconnection Status */}
        {isReconnectedHost && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 text-sm">🔄</span>
            <span className="text-xs text-green-700 font-medium">
              Reconnected as Host
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Header - Game Status or New Word Input */}
      <div className="text-center mb-6">
        {room?.battle?.started ? (
          // Game in progress - show status
          <>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Player Progress
            </h3>
            <p className="text-sm text-slate-600">
              Watch players compete in real-time!
            </p>
          </>
        ) : (
          // Game ended or not started - show new word input for host
          <>
            {room?.battle?.winner || room?.battle?.reveal ? (
              // Game ended - show status message
              <div className="mb-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-green-800 font-medium">
                      {room?.battle?.winner
                        ? `Game ended! ${
                            room.players?.[room.battle.winner]?.name || "Unknown player"
                          } won!`
                        : "Game ended! No one got the word."}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Enter a new word to start another round
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Game not started yet
              <div className="mb-4">
                <p className="text-sm text-slate-600">
                  Enter a word to start the game
                </p>
              </div>
            )}

            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              Enter New Word
            </h3>
            <WordInputTiles
              onWordSubmit={onWordSubmit}
              submitButtonText="Start Game"
            />
          </>
        )}
      </div>

      {/* Player Cards Grid - Show during active game and after game ends */}
      {(room?.battle?.started ||
        room?.battle?.winner ||
        room?.battle?.reveal) && (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 place-items-start">
          {players.map((player) => (
            <SpectateCard key={player.id} player={player} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HostSpectateScreen;
