// Board.jsx
import React from "react";

export default function Board({
  guesses = [],
  activeGuess = "",
  tile = 48,         // NEW: tile size in px
  gap = 6,           // NEW: gap in px
}) {
  const rows = [...guesses];
  const activeRow = rows.length;

  if (rows.length < 6) {
    rows.push({ guess: activeGuess.padEnd(5, " "), pattern: Array(5).fill("empty") });
  }
  while (rows.length < 6) rows.push({ guess: "", pattern: [] });

  return (
    <div style={{ display: "grid", gap }}>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(5, ${tile}px)`,
            gap,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const ch = row.guess?.[i] || "";
            const state = row.pattern?.[i] || "empty";
            let bg = "#fff", color = "#000", border = "1px solid #ccc";

            if (state === "green") { bg = "#6aaa64"; color = "#fff"; border = "1px solid #6aaa64"; }
            else if (state === "yellow") { bg = "#c9b458"; color = "#fff"; border = "1px solid #c9b458"; }
            else if (state === "gray") { bg = "#787c7e"; color = "#fff"; border = "1px solid #787c7e"; }
            else if (rowIdx === activeRow && ch.trim() !== "") {
              bg = "#fff"; color = "#000"; border = "1px solid #999";
            } else if (state === "empty" && ch.trim() === "") {
              border = "1px solid #ddd";
            }

            return (
              <div
                key={i}
                style={{
                  height: tile,
                  display: "grid",
                  placeItems: "center",
                  background: bg,
                  color,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  border,
                  borderRadius: 6,
                }}
              >
                {ch.trim()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}