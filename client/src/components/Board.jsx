// import React from 'react'
// export default function Board({ guesses }) {
//   const rows = [...guesses, ...Array(Math.max(0, 6 - guesses.length)).fill({ guess: '', pattern: [] })].slice(0,6)
//   return (<div style={{ display:'grid', gap:6 }}>
//     {rows.map((row, idx) => (<div key={idx} style={{ display:'grid', gridTemplateColumns:'repeat(5, 48px)', gap:6 }}>
//       {Array.from({ length: 5 }).map((_, i) => {
//         const ch = row.guess?.[i] || ''; const state = row.pattern?.[i] || 'empty'
//         const bg = state==='green' ? '#6aaa64' : state==='yellow' ? '#c9b458' : state==='gray' ? '#787c7e' : '#fff'
//         const color = state==='empty' ? '#000' : '#fff'
//         return (<div key={i} style={{ height:48, border:'1px solid #ccc', display:'grid', placeItems:'center', background:bg, color, fontWeight:'bold', textTransform:'uppercase' }}>{ch}</div>)
//       })}
//     </div>))}
//   </div>)
// }

import React from "react";

export default function Board({ guesses = [], currentGuess = "" }) {
  // Pad to exactly 6 rows: past guesses + current + empty future rows
  const rows = [...guesses];
  const activeRow = rows.length; // Index for currentGuess
  if (rows.length < 6) {
    rows.push({
      guess: currentGuess.padEnd(5, " "),
      pattern: Array(5).fill("empty"),
    }); // Display current as empty state
  }
  while (rows.length < 6) {
    rows.push({ guess: "", pattern: [] });
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 48px)",
            gap: 6,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const ch = row.guess?.[i] || ""; // Space for empty in currentGuess
            const state = row.pattern?.[i] || "empty";
            let bg = "#fff"; // Default empty
            let color = "#000"; // Black text for unfilled
            let border = "1px solid #ccc"; // Subtle border

            if (state === "green") {
              bg = "#6aaa64";
              color = "#fff";
              border = "1px solid #6aaa64"; // Match Wordle (no border visible, but for consistency)
            } else if (state === "yellow") {
              bg = "#c9b458";
              color = "#fff";
              border = "1px solid #c9b458";
            } else if (state === "gray") {
              bg = "#787c7e";
              color = "#fff";
              border = "1px solid #787c7e";
            } else if (rowIdx === activeRow && ch.trim() !== "") {
              // For current guess: filled letters are bold black on white
              bg = "#fff";
              color = "#000";
              border = "1px solid #999"; // Slightly darker for active
            } else if (state === "empty" && ch.trim() === "") {
              // Future empty: lighter border
              border = "1px solid #ddd";
            }

            return (
              <div
                key={i}
                style={{
                  height: 48,
                  display: "grid",
                  placeItems: "center",
                  background: bg,
                  color,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  border,
                  borderRadius: 4, // Subtle rounding like screenshots
                }}
              >
                {ch.trim()} {/* Hide spaces */}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
