// import React from "react";

// function GameResults({ room, players, correctWord }) {
//   // CRITICAL: Props validation to prevent crashes
//   if (!room || !players || !Array.isArray(players)) {
//     console.warn("GameResults: Invalid props received", {
//       room,
//       players,
//       correctWord,
//     });
//     return (
//       <div className="w-full max-w-4xl mx-auto space-y-6 text-center">
//         <div className="text-red-500">
//           <h2 className="text-2xl font-bold">Error Loading Game Results</h2>
//           <p className="text-sm">
//             Unable to display results due to invalid data.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // SAFE: Filter out the host from the leaderboard (host doesn't play)
//   const nonHostPlayers = players.filter(
//     (player) => player && player.id && player.id !== room?.hostId
//   );

//   // SAFE: Sort players by wins (descending), then by current streak (descending)
//   const sortedPlayers = [...nonHostPlayers].sort((a, b) => {
//     if (!a || !b) return 0; // Safe fallback
//     const aWins = a.wins || 0;
//     const bWins = b.wins || 0;
//     const aStreak = a.streak || 0;
//     const bStreak = b.streak || 0;

//     if (bWins !== aWins) return bWins - aWins;
//     return bStreak - aStreak;
//   });

//   const getStreakColor = (streak) => {
//     if (!streak || typeof streak !== "number") return "text-gray-400";
//     if (streak >= 10) return "text-orange-600"; // Orange fire for high streaks
//     if (streak >= 5) return "text-red-500"; // Red fire for medium streaks
//     if (streak >= 3) return "text-yellow-500"; // Yellow fire for low streaks
//     return "text-gray-400"; // Gray for no streak
//   };

//   const getStreakIcon = (streak) => {
//     if (!streak || typeof streak !== "number") return "✨";
//     if (streak >= 10) return "🔥"; // Hot fire for high streaks
//     if (streak >= 5) return "🔥"; // Regular fire for medium streaks
//     if (streak >= 3) return "🔥"; // Small fire for low streaks
//     return "✨"; // Sparkle for no streak
//   };

//   // Fun competitive taglines based on performance
//   const getPlayerTagline = (player) => {
//     if (!player || !player.guesses) return "🎮 Player";

//     const guesses = player.guesses.length || 0;
//     const isWinner = player.done && guesses <= 6;

//     if (!isWinner) {
//       // Didn't get the word - these should be ridiculing
//       if (guesses === 0) return "🎭 Ghost Player - Never showed up!";
//       if (guesses === 1) return "💨 One and Done - Did you even try? Pathetic!";
//       if (guesses === 2) return "🤷‍♂️ Two Tries - At least you tried... sort of";
//       if (guesses === 3) return "😴 Three Strikes - Wake up call needed!";
//       if (guesses === 4)
//         return "🤔 Four Attempts - Getting warmer... not really";
//       if (guesses === 5) return "😤 Five Fumbles - So close, yet so far!";
//       if (guesses === 6)
//         return "💀 Six Strikes - You're out! Better luck next time!";
//     } else {
//       // Got the word - performance based (these are positive)
//       if (guesses === 1)
//         return "🚨 CHEATER ALERT! - Did you peek at the answer?";
//       if (guesses === 2)
//         return "🎯 Mind Reader - Are you psychic or just lucky?";
//       if (guesses === 3) return "⚡ Speed Demon - Lightning fast!";
//       if (guesses === 4) return "🎪 Show Off - Making it look easy!";
//       if (guesses === 5) return "😅 Close Call - Cut it a bit close there!";
//       if (guesses === 6) return "🎭 Drama Queen - Last second heroics!";
//     }

//     return "🎮 Player"; // Default fallback
//   };

//   // Enhanced taglines with pattern analysis for extra banter
//   const getEnhancedTagline = (player) => {
//     if (!player) return "🎮 Player";

//     const baseTagline = getPlayerTagline(player);
//     const guesses = player.guesses || [];

//     // Check for complete misses (no green/yellow tiles)
//     const hasAnyHits = guesses.some(
//       (guess) =>
//         guess &&
//         guess.pattern &&
//         Array.isArray(guess.pattern) &&
//         guess.pattern.some(
//           (result) =>
//             result === "green" ||
//             result === "yellow" ||
//             result === "correct" ||
//             result === "present"
//         )
//     );

//     if (!hasAnyHits && guesses.length > 0) {
//       // Player got absolutely nothing right - extra banter
//       if (guesses.length === 1)
//         return "🎯 Blindfolded - One guess and you're done? What a quitter!";
//       if (guesses.length === 2)
//         return "🌫️ Lost in the Fog - Can't see a thing!";
//       if (guesses.length === 3) return "🕳️ Bottomless Pit - Falling deeper!";
//       if (guesses.length === 4) return "🚫 Zero Hero - Master of missing!";
//       if (guesses.length === 5)
//         return "💸 Money Down the Drain - Nothing to show!";
//       if (guesses.length === 6)
//         return "🏴‍☠️ Captain Clueless - Sailed the wrong way!";
//     }

//     // Check for mostly misses
//     const totalTiles = guesses.length * 5;
//     const hitTiles = guesses.reduce((count, guess) => {
//       if (!guess || !guess.pattern || !Array.isArray(guess.pattern))
//         return count;
//       return (
//         count +
//         (guess.pattern.filter(
//           (result) =>
//             result === "green" ||
//             result === "yellow" ||
//             result === "correct" ||
//             result === "present"
//         ).length || 0)
//       );
//     }, 0);

//     if (totalTiles > 0 && hitTiles / totalTiles < 0.2) {
//       return `${baseTagline} 🎲 Lucky to hit anything!`;
//     }

//     return baseTagline;
//   };

//   // Get tagline color based on performance
//   const getTaglineColor = (player) => {
//     if (!player || !player.guesses) return "text-gray-500";

//     const guesses = player.guesses.length || 0;
//     const isWinner = player.done && guesses <= 6;

//     if (!isWinner) {
//       if (guesses === 0) return "text-gray-500";
//       if (guesses <= 2) return "text-red-500";
//       if (guesses <= 4) return "text-orange-500";
//       return "text-yellow-600";
//     } else {
//       if (guesses === 1) return "text-purple-600 font-bold";
//       if (guesses === 2) return "text-blue-600 font-bold";
//       if (guesses === 3) return "text-green-600 font-bold";
//       if (guesses === 4) return "text-emerald-600";
//       if (guesses === 5) return "text-teal-600";
//       return "text-cyan-600";
//     }
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto space-y-6">
//       {/* Game Results Header */}
//       <div className="text-center space-y-4">
//         <h2 className="text-2xl font-bold text-slate-800">Game Results</h2>

//         {/* Correct Word Display */}
//         <div className="space-y-2">
//           <p className="text-sm text-slate-600">The word was:</p>
//           <div className="flex justify-center">
//             {(() => {
//               // SAFE: Try to get the word from the winner's guesses
//               // First, try to find someone who actually has a winning guess (all green tiles)
//               const winner = players.find((p) => {
//                 if (
//                   !p ||
//                   !p.guesses ||
//                   !Array.isArray(p.guesses) ||
//                   p.guesses.length === 0
//                 )
//                   return false;

//                 // Check if they have a winning guess (all green tiles)
//                 return p.guesses.some(
//                   (guess) =>
//                     guess &&
//                     guess.pattern &&
//                     Array.isArray(guess.pattern) &&
//                     guess.pattern.every(
//                       (result) =>
//                         result === "green" ||
//                         result === "correct" ||
//                         result === "G" ||
//                         result === "C"
//                     )
//                 );
//               });

//               // SAFE: If no winner with winning guess found, fall back to room.battle.winner
//               if (!winner && room?.battle?.winner) {
//                 const winnerId = room.battle.winner;
//                 const winnerFromRoom = players.find(
//                   (p) => p && p.id === winnerId
//                 );
//                 if (
//                   winnerFromRoom &&
//                   room?.battle?.reveal &&
//                   typeof room.battle.reveal === "string"
//                 ) {
//                   return (
//                     <div className="grid grid-cols-5 gap-2">
//                       {room.battle.reveal.split("").map((letter, index) => (
//                         <div
//                           key={index}
//                           className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                         >
//                           {letter.toUpperCase()}
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 }
//               }

//               if (
//                 winner &&
//                 winner.guesses &&
//                 Array.isArray(winner.guesses) &&
//                 winner.guesses.length > 0
//               ) {
//                 // SAFE: Find the winning guess (the one that matches the pattern)
//                 // Try multiple pattern formats
//                 const winningGuess = winner.guesses.find((guess) => {
//                   if (!guess || !guess.pattern || !Array.isArray(guess.pattern))
//                     return false;

//                   // Check if all tiles are green/correct
//                   return guess.pattern.every(
//                     (result) =>
//                       result === "green" ||
//                       result === "correct" ||
//                       result === "G" ||
//                       result === "C"
//                   );
//                 });

//                 if (
//                   winningGuess &&
//                   winningGuess.guess &&
//                   typeof winningGuess.guess === "string"
//                 ) {
//                   return (
//                     <div className="grid grid-cols-5 gap-2">
//                       {winningGuess.guess.split("").map((letter, index) => (
//                         <div
//                           key={index}
//                           className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                         >
//                           {letter.toUpperCase()}
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 }

//                 // SAFE: If no perfect pattern found, try to find the last guess (most likely the winning one)
//                 const lastGuess = winner.guesses[winner.guesses.length - 1];
//                 if (
//                   lastGuess &&
//                   lastGuess.guess &&
//                   typeof lastGuess.guess === "string"
//                 ) {
//                   return (
//                     <div className="grid grid-cols-5 gap-2">
//                       {lastGuess.guess.split("").map((letter, index) => (
//                         <div
//                           key={index}
//                           className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                         >
//                           {letter.toUpperCase()}
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 }
//               }

//               // SAFE: Fallback: try to get from room.battle.reveal (this is where the word is stored!)
//               if (
//                 room?.battle?.reveal &&
//                 typeof room.battle.reveal === "string"
//               ) {
//                 return (
//                   <div className="grid grid-cols-5 gap-2">
//                     {room.battle.reveal.split("").map((letter, index) => (
//                       <div
//                         key={index}
//                         className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                       >
//                         {letter.toUpperCase()}
//                       </div>
//                     ))}
//                   </div>
//                 );
//               }

//               // SAFE: Fallback: try to get from room.battle.secret or revealedWord
//               const wordToShow =
//                 room?.battle?.revealedWord || room?.battle?.secret;
//               if (wordToShow && typeof wordToShow === "string") {
//                 return (
//                   <div className="grid grid-cols-5 gap-2">
//                     {wordToShow.split("").map((letter, index) => (
//                       <div
//                         key={index}
//                         className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                       >
//                         {letter.toUpperCase()}
//                       </div>
//                     ))}
//                   </div>
//                 );
//               }

//               // SAFE: Last resort: try to find ANY player who got it right and extract their winning word
//               const anyWinner = players.find(
//                 (p) =>
//                   p &&
//                   p.done &&
//                   p.guesses &&
//                   Array.isArray(p.guesses) &&
//                   p.guesses.length <= 6
//               );
//               if (
//                 anyWinner &&
//                 anyWinner.guesses &&
//                 Array.isArray(anyWinner.guesses) &&
//                 anyWinner.guesses.length > 0
//               ) {
//                 const lastGuess =
//                   anyWinner.guesses[anyWinner.guesses.length - 1];
//                 if (
//                   lastGuess &&
//                   lastGuess.guess &&
//                   typeof lastGuess.guess === "string"
//                 ) {
//                   return (
//                     <div className="grid grid-cols-5 gap-2">
//                       {lastGuess.guess.split("").map((letter, index) => (
//                         <div
//                           key={index}
//                           className="w-12 h-12 bg-green-500 text-white rounded-md flex items-center justify-center text-xl font-bold shadow-md"
//                         >
//                           {letter.toUpperCase()}
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 }
//               }

//               // SAFE: If still no word, show user-friendly message
//               return (
//                 <div className="text-red-500 text-sm">
//                   <div>Word not available</div>
//                 </div>
//               );
//             })()}
//           </div>
//         </div>

//         {/* SAFE: Winner Celebration */}
//         {(() => {
//           // SAFE: Find the actual winner (someone with a winning guess)
//           const actualWinner = players.find((p) => {
//             if (
//               !p ||
//               !p.guesses ||
//               !Array.isArray(p.guesses) ||
//               p.guesses.length === 0
//             )
//               return false;
//             return p.guesses.some(
//               (guess) =>
//                 guess &&
//                 guess.pattern &&
//                 Array.isArray(guess.pattern) &&
//                 guess.pattern.every(
//                   (result) =>
//                     result === "green" ||
//                     result === "correct" ||
//                     result === "G" ||
//                     result === "C"
//                 )
//             );
//           });

//           // SAFE: Fallback to room.battle.winner if no actual winner found
//           const winner =
//             actualWinner ||
//             (room?.battle?.winner
//               ? players.find((p) => p && p.id === room.battle.winner)
//               : null);

//           if (winner && winner.name) {
//             const guesses = winner.guesses?.length || 0;
//             return (
//               <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
//                 <div className="flex flex-col items-center gap-2">
//                   <div className="flex items-center gap-2">
//                     <span className="text-2xl">🎉</span>
//                     <span className="text-lg font-semibold text-green-800">
//                       {winner.name} got it right!
//                     </span>
//                     <span className="text-2xl">🎉</span>
//                   </div>
//                   {/* Winner Tagline */}
//                   <div className="text-sm text-green-700 font-medium">
//                     {guesses === 1
//                       ? "🚨 CHEATER ALERT! - Did you peek at the answer?"
//                       : guesses === 2
//                       ? "🎯 Mind Reader - Are you psychic or just lucky?"
//                       : guesses === 3
//                       ? "⚡ Speed Demon - Lightning fast!"
//                       : guesses === 4
//                       ? "🎪 Show Off - Making it look easy!"
//                       : guesses === 5
//                       ? "😅 Close Call - Cut it a bit close there!"
//                       : guesses === 6
//                       ? "🎭 Drama Queen - Last second heroics!"
//                       : "🎮 Champion!"}
//                   </div>
//                 </div>
//               </div>
//             );
//           }
//           return null;
//         })()}
//       </div>

//       {/* SAFE: Scoreboard */}
//       <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
//         <div className="px-6 py-4 border-b border-slate-200">
//           <h3 className="text-lg font-semibold text-slate-800">Leaderboard</h3>
//         </div>

//         {/* Scrollable leaderboard container */}
//         <div className="max-h-96 overflow-y-auto">
//           <div className="divide-y divide-slate-100">
//             {sortedPlayers.map((player, index) => {
//               // SAFE: Validate player before rendering
//               if (!player || !player.id || !player.name) return null;

//               return (
//                 <div
//                   key={player.id}
//                   className={`px-6 py-4 flex items-center gap-4 ${
//                     index === 0
//                       ? "bg-gradient-to-r from-yellow-50 to-amber-50"
//                       : ""
//                   }`}
//                 >
//                   {/* Rank */}
//                   <div
//                     className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
//                       index === 0
//                         ? "bg-yellow-400 text-white"
//                         : index === 1
//                         ? "bg-slate-300 text-white"
//                         : index === 2
//                         ? "bg-amber-600 text-white"
//                         : "bg-slate-100 text-slate-600"
//                     }`}
//                   >
//                     {index + 1}
//                   </div>

//                   {/* Player Info */}
//                   <div className="flex-1">
//                     <div className="flex items-center gap-2">
//                       <span className="font-medium text-slate-800">
//                         {player.name}
//                         {player.done &&
//                           player.guesses &&
//                           Array.isArray(player.guesses) &&
//                           player.guesses.length <= 6 && (
//                             <span className="ml-2 text-green-600 font-bold">
//                               ✓
//                             </span>
//                           )}
//                       </span>
//                       {index === 0 && (
//                         <span className="text-yellow-500 text-lg">👑</span>
//                       )}
//                     </div>
//                     <div className="text-sm text-slate-500">
//                       {player.guesses && Array.isArray(player.guesses)
//                         ? player.guesses.length
//                         : 0}
//                       /6 guesses
//                     </div>
//                     {/* SAFE: Fun Competitive Tagline */}
//                     <div className={`text-xs mt-1 ${getTaglineColor(player)}`}>
//                       {getEnhancedTagline(player)}
//                     </div>
//                   </div>

//                   {/* Stats */}
//                   <div className="text-right space-y-1">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-slate-600">Wins:</span>
//                       <span className="font-semibold text-slate-800">
//                         {player.wins || 0}
//                       </span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm text-slate-600">Streak:</span>
//                       <span
//                         className={`font-semibold ${getStreakColor(
//                           player.streak || 0
//                         )}`}
//                       >
//                         {player.streak || 0}
//                       </span>
//                       <span
//                         className={`text-lg ${getStreakColor(
//                           player.streak || 0
//                         )}`}
//                       >
//                         {getStreakIcon(player.streak || 0)}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>

//       {/* SAFE: Waiting Message */}
//       <div className="text-center text-slate-600">
//         <p className="text-lg">Waiting for host to start the next round...</p>
//         <p className="text-sm">Get ready for another challenge! 🚀</p>
//         {/* SAFE: Fun Competitive Message */}
//         <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
//           <p className="text-xs text-purple-700 font-medium">
//             💪 Ready to redeem yourself? Or will you continue the streak of...
//             interesting choices?
//             {(() => {
//               // SAFE: Find worst player with validation
//               const worstPlayer = sortedPlayers.find(
//                 (p) =>
//                   p &&
//                   (!p.done ||
//                     (p.guesses &&
//                       Array.isArray(p.guesses) &&
//                       p.guesses.length >= 6))
//               );
//               if (worstPlayer) {
//                 const guesses =
//                   worstPlayer.guesses && Array.isArray(worstPlayer.guesses)
//                     ? worstPlayer.guesses.length
//                     : 0;
//                 if (guesses === 0)
//                   return " Even the ghost players are embarrassed!";
//                 if (guesses <= 2)
//                   return " At least you're consistent... consistently wrong!";
//                 if (guesses <= 4)
//                   return " Maybe try reading the dictionary first?";
//                 return " Time to step up your game!";
//               }
//               return " Let's see who's the real word wizard!";
//             })()}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default GameResults;
// components/GameResults.jsx
import React, { useMemo } from "react";
import { Trophy } from "lucide-react";

export default function GameResults({ room, players = [], correctWord }) {
  const winnerId = room?.battle?.winner || null;
  const roundFinished = !!winnerId || !!correctWord;

  // Per-round stats from guesses vs. correctWord
  const results = useMemo(() => {
    const word = (correctWord || "").toUpperCase();
    return players.map((p) => {
      const guesses = Array.isArray(p.guesses) ? p.guesses : [];
      const ix =
        word && guesses.length
          ? guesses.findIndex((g) => (g?.guess || "").toUpperCase() === word)
          : -1;
      const steps = ix >= 0 ? ix + 1 : null;
      return {
        id: p.id,
        name: p.name || "—",
        guesses: guesses.length,
        solved: steps !== null,
        steps,
        wins: p.wins ?? 0,
        streak: p.streak ?? 0,
        disconnected: !!p.disconnected,
      };
    });
  }, [players, correctWord]);

  // Sort for podium / table
  const sorted = useMemo(() => {
    const copy = [...results];
    copy.sort((a, b) => {
      // winner always first if present
      if (winnerId) {
        if (a.id === winnerId && b.id !== winnerId) return -1;
        if (b.id === winnerId && a.id !== winnerId) return 1;
      }
      // then solved first, fewest steps first
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      if (a.solved && b.solved) return a.steps - b.steps;
      // both unsolved: fewer guesses used first
      if (!a.solved && !b.solved) return a.guesses - b.guesses;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [results, winnerId]);

  const podium = sorted.slice(0, 3);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-slate-800">Round Results</h3>
        </div>
        <p className="text-sm text-slate-600">
          {roundFinished
            ? winnerId
              ? `Winner: ${
                  players.find((p) => p.id === winnerId)?.name || "Unknown"
                }`
              : "No winner — the word is revealed below."
            : "Waiting for host to start the next round…"}
        </p>
      </div>

      {/* Revealed word tiles (only when we have it) */}
      {correctWord ? (
        <div className="flex items-center justify-center mb-6">
          <div className="grid grid-cols-5 gap-2">
            {correctWord
              .toUpperCase()
              .padEnd(5, " ")
              .slice(0, 5)
              .split("")
              .map((ch, i) => (
                <div
                  key={i}
                  className="w-12 h-14 md:w-14 md:h-16 grid place-items-center rounded-md border font-extrabold uppercase tracking-wider shadow-sm"
                  style={{
                    backgroundColor: "#6aaa64",
                    color: "#fff",
                    borderColor: "#6aaa64",
                    animation: `tileFlip 0.6s ease-in-out ${i * 100}ms both`,
                  }}
                >
                  {ch.trim()}
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-500 mb-6">
          Word is hidden until the round ends.
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {podium.map((p, idx) => (
            <div
              key={p.id}
              className={[
                "rounded-lg border p-3 text-center",
                idx === 0
                  ? "bg-amber-50 border-amber-200"
                  : idx === 1
                  ? "bg-slate-50 border-slate-200"
                  : "bg-orange-50 border-orange-200",
              ].join(" ")}
            >
              <div className="text-2xl mb-1">
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
              </div>
              <div
                className={[
                  "font-semibold truncate",
                  p.id === winnerId ? "text-amber-800" : "text-slate-800",
                ].join(" ")}
                title={p.name}
              >
                {p.name}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {p.solved ? `Solved in ${p.steps}` : "Not solved"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
          <div className="col-span-5 px-3 py-2">Player</div>
          <div className="col-span-3 px-3 py-2">Round</div>
          <div className="col-span-2 px-3 py-2 text-center">Wins</div>
          <div className="col-span-2 px-3 py-2 text-center">Streak</div>
        </div>

        <div className="max-h-[45vh] overflow-auto">
          {sorted.map((p) => (
            <div
              key={p.id}
              className={[
                "grid grid-cols-12 items-center border-b last:border-b-0",
                "px-3 py-2 text-sm",
                p.id === winnerId ? "bg-amber-50/60" : "bg-white",
                p.disconnected ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <div
                  className={[
                    "w-1.5 h-1.5 rounded-full",
                    p.id === winnerId
                      ? "bg-amber-500"
                      : p.solved
                      ? "bg-emerald-500"
                      : "bg-slate-300",
                  ].join(" ")}
                />
                <span className="truncate" title={p.name}>
                  {p.name}
                </span>
              </div>

              <div className="col-span-3 text-slate-700">
                {p.solved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    ✅ <span>Solved in {p.steps}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    ❌ <span>Not solved</span>
                  </span>
                )}
              </div>

              <div className="col-span-2 text-center">
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {p.wins}
                </span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {p.streak}
                </span>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="text-center text-xs text-slate-500 py-6">
              No players yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
