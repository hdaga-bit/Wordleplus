// import React, { useState, useEffect } from "react";
// import Board from "../components/Board.jsx";
// import Keyboard from "../components/Keyboard.jsx";
// import PlayerProgressCard from "../components/PlayerProgressCard.jsx";
// import MobileBattleLayout from "../components/MobileBattleLayout.jsx";
// import GameResults from "../components/GameResults.jsx";

// function BattleGameScreen({
//   room,
//   players,
//   allPlayers,
//   otherPlayers,
//   me,
//   isHost,
//   currentGuess,
//   shakeKey,
//   showActiveError,
//   letterStates,
//   canGuessBattle,
//   onKeyPress,
// }) {
//   const [isMobile, setIsMobile] = useState(false);

//   // Mobile detection
//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };
//     checkMobile();
//     window.addEventListener("resize", checkMobile);
//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   return (
//     <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
//       {/* Header */}
//       <header className="px-4 pt-4 pb-6">
//         <div className="max-w-7xl mx-auto">
//           {/* App Branding */}
//           <div className="flex items-center justify-between mb-4">
//             <div className="flex items-center gap-2">
//               <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
//                 W+
//               </div>
//               <h1 className="text-lg font-bold text-slate-800">WordlePlus</h1>
//             </div>

//             {/* Room ID */}
//             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
//               <span className="text-xs text-slate-600 font-medium">Room:</span>
//               <span className="font-mono font-bold text-slate-800 text-sm">
//                 {room?.id}
//               </span>
//               <button
//                 onClick={() => {
//                   navigator.clipboard.writeText(room?.id || "");
//                 }}
//                 className="text-slate-500 hover:text-slate-700 transition-colors"
//                 aria-label="Copy room ID"
//               >
//                 📋
//               </button>
//             </div>
//           </div>

//           {/* Game Mode Title */}
//           <h2 className="text-2xl font-bold text-slate-800 text-center mb-3">
//             Battle Royale
//           </h2>

//           {/* Game Status for Players - No word spoilers */}
//           {!isHost && (
//             <div className="text-center space-y-1">
//               {room?.battle?.started &&
//                 !room?.battle?.winner &&
//                 !room?.battle?.reveal && (
//                   <p className="text-xs text-emerald-600 font-medium">
//                     Game in progress... Good luck!
//                   </p>
//                 )}
//               {room?.battle?.winner && (
//                 <p className="text-xs text-blue-600 font-medium">
//                   Winner:{" "}
//                   {players.find((p) => p.id === room.battle.winner)?.name ||
//                     "Unknown"}
//                 </p>
//               )}
//               {room?.battle?.reveal && !room?.battle?.winner && (
//                 <p className="text-xs text-amber-600 font-medium">
//                   No winner - word revealed
//                 </p>
//               )}
//               {!room?.battle?.started &&
//                 !room?.battle?.winner &&
//                 !room?.battle?.reveal && (
//                   <p className="text-xs text-slate-600 font-medium">
//                     Waiting for host to start the game...
//                   </p>
//                 )}
//             </div>
//           )}
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="flex-1 px-4 pb-6">
//         {isMobile ? (
//           /* Mobile Layout */
//           room?.battle?.started ? (
//             <MobileBattleLayout
//               me={me}
//               otherPlayers={otherPlayers}
//               currentGuess={currentGuess}
//               shakeKey={shakeKey}
//               showActiveError={showActiveError}
//               letterStates={letterStates}
//               canGuessBattle={canGuessBattle}
//               onKeyPress={onKeyPress}
//               className="h-full"
//             />
//           ) : (
//             /* Game Results on Mobile */
//             <div className="w-full h-full flex items-center justify-center">
//               <GameResults
//                 room={room}
//                 players={allPlayers}
//                 correctWord={room?.battle?.secret}
//               />
//             </div>
//           )
//         ) : (
//           /* Desktop Layout - Original */
//           <div className="flex-1 px-4 flex items-center justify-center min-h-0">
//             {/* Room ID Display for Players */}
//             <div className="absolute top-4 left-4 z-10">
//               <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg shadow-sm">
//                 <span className="text-xs text-slate-600 font-medium">
//                   Room:
//                 </span>
//                 <span className="font-mono font-bold text-slate-800 text-sm">
//                   {room?.id}
//                 </span>
//                 <button
//                   onClick={() => {
//                     navigator.clipboard.writeText(room?.id || "");
//                     // Note: This will need to be handled by parent component
//                   }}
//                   className="text-slate-500 hover:text-slate-700 transition-colors"
//                   aria-label="Copy room ID"
//                 >
//                   📋
//                 </button>
//               </div>
//             </div>

//             <div className="w-full h-full flex items-center justify-center relative">
//               {room?.battle?.started ? (
//                 <div className="w-full h-full flex items-center justify-center">
//                   <div className="w-full h-full max-w-[min(99.8vw,2000px)] max-h-[calc(100vh-80px)] flex items-center justify-center">
//                     <Board
//                       guesses={me?.guesses || []}
//                       activeGuess={currentGuess}
//                       errorShakeKey={shakeKey}
//                       errorActiveRow={showActiveError}
//                       maxTile={200}
//                       minTile={70}
//                     />
//                   </div>
//                 </div>
//               ) : (
//                 // Game ended - show results and scoreboard
//                 <div className="w-full h-full flex items-center justify-center">
//                   <GameResults
//                     room={room}
//                     players={allPlayers}
//                     correctWord={room?.battle?.secret}
//                   />
//                 </div>
//               )}

//               {/* Other Players Progress Cards - Positioned on the right */}
//               {room?.battle?.started && (
//                 <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-3 max-h-[80vh] overflow-y-auto">
//                   {/* Show other players' progress */}
//                   {otherPlayers?.map((player) => (
//                     <PlayerProgressCard
//                       key={player.id}
//                       player={player}
//                       isCurrentPlayer={false}
//                     />
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </main>

//       {/* Footer - Keyboard for Players */}
//       <footer className="px-2 sm:px-4 pb-3 flex-shrink-0">
//         <div className="max-w-5xl mx-auto">
//           {canGuessBattle ? (
//             <Keyboard onKeyPress={onKeyPress} letterStates={letterStates} />
//           ) : (
//             <div className="text-center text-sm text-slate-500 py-2">
//               {room?.battle?.winner || room?.battle?.reveal
//                 ? "Game ended - waiting for host to start next round..."
//                 : "Waiting for host to start the game..."}
//             </div>
//           )}
//         </div>
//       </footer>
//     </div>
//   );
// }

// export default BattleGameScreen;
import React, { useState, useEffect, useMemo } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import PlayerProgressCard from "../components/PlayerProgressCard.jsx";
import MobileBattleLayout from "../components/MobileBattleLayout.jsx";
import GameResults from "../components/GameResults.jsx";

function BattleGameScreen({
  room,
  players,
  allPlayers,
  otherPlayers,
  me,
  isHost,
  currentGuess,
  shakeKey,
  showActiveError,
  letterStates,
  canGuessBattle,
  onKeyPress,
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const roundActive = !!room?.battle?.started;
  const roundFinished = !!(room?.battle?.winner || room?.battle?.reveal);

  // Prevent leaking the word before the round is finished
  const correctWord = useMemo(
    () =>
      roundFinished ? room?.battle?.secret || room?.battle?.revealedWord : null,
    [roundFinished, room?.battle?.secret, room?.battle?.revealedWord]
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 pt-4 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                W+
              </div>
              <h1 className="text-lg font-bold text-slate-800">WordlePlus</h1>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-600 font-medium">Room:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {room?.id}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(room?.id || "")}
                className="text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Copy room ID"
              >
                📋
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">
            Battle Royale
          </h2>

          {!isHost && (
            <div className="text-center space-y-1">
              {roundActive && !roundFinished && (
                <p className="text-xs text-emerald-600 font-medium">
                  Game in progress… good luck!
                </p>
              )}
              {room?.battle?.winner && (
                <p className="text-xs text-blue-600 font-medium">
                  Winner:&nbsp;
                  {players.find((p) => p.id === room.battle.winner)?.name ||
                    "Unknown"}
                </p>
              )}
              {!roundActive && !roundFinished && (
                <p className="text-xs text-slate-600 font-medium">
                  Waiting for host to start the game…
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 pb-4" style={{ minHeight: 0 }}>
        {isMobile ? (
          roundActive ? (
            <MobileBattleLayout
              me={me}
              otherPlayers={otherPlayers}
              currentGuess={currentGuess}
              shakeKey={shakeKey}
              showActiveError={showActiveError}
              letterStates={letterStates}
              canGuessBattle={canGuessBattle}
              onKeyPress={onKeyPress}
              className="h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <GameResults
                room={room}
                players={allPlayers}
                correctWord={correctWord}
              />
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            {/* Center board */}
            {roundActive ? (
              <div className="w-full h-full max-w-[min(1100px,95vw)] max-h-[calc(100vh-180px)] flex items-center justify-center">
                <Board
                  guesses={me?.guesses || []}
                  activeGuess={currentGuess}
                  errorShakeKey={shakeKey}
                  errorActiveRow={showActiveError}
                  maxTile={112}
                  minTile={56}
                  gap={10}
                  padding={12}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <GameResults
                  room={room}
                  players={allPlayers}
                  correctWord={correctWord}
                />
              </div>
            )}

            {/* Right rail: other players */}
            {roundActive && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
                {otherPlayers?.map((player) => (
                  <PlayerProgressCard
                    key={player.id}
                    player={player}
                    isCurrentPlayer={false}
                  />
                ))}
                {/* fade */}
                <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-background to-transparent" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer (players only) */}
      <footer className="px-2 sm:px-4 pb-3 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          {canGuessBattle ? (
            <Keyboard onKeyPress={onKeyPress} letterStates={letterStates} />
          ) : (
            <div className="text-center text-sm text-slate-500 py-2">
              {roundFinished
                ? "Game ended — waiting for host to start the next round…"
                : "Waiting for host to start the game…"}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default BattleGameScreen;
