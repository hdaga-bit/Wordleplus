// Board.jsx
import React from "react";
//my branch
export default function Board({
  guesses = [],
  activeGuess = "",
  tile = 48,
  gap = 6,
  errorShakeKey = 0, // NEW
  errorActiveRow = false, // NEW: should we mark the active row as error?
}) {
  const rows = [...guesses];
  const activeRowIdx = rows.length;

  if (rows.length < 6) {
    rows.push({
      guess: activeGuess.padEnd(5, " "),
      pattern: Array(5).fill("empty"),
    });
  }
  while (rows.length < 6) rows.push({ guess: "", pattern: [] });

  return (
    <div style={{ display: "grid", gap }}>
      {rows.map((row, rowIdx) => {
        const isActive = rowIdx === activeRowIdx;
        // To re-trigger CSS animation, change the key when errorShakeKey increments
        const rowKey = isActive
          ? `active-${rowIdx}-${errorShakeKey}`
          : `row-${rowIdx}`;
        return (
          <div
            key={rowKey}
            className={isActive && errorActiveRow ? "shake-hard" : ""}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(5, ${tile}px)`,
              gap,
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const ch = row.guess?.[i] || "";
              const state = row.pattern?.[i] || "empty";

              let bg = "#fff",
                color = "#000",
                border = "1px solid #ccc";
              if (state === "green") {
                bg = "#6aaa64";
                color = "#fff";
                border = "1px solid #6aaa64";
              } else if (state === "yellow") {
                bg = "#c9b458";
                color = "#fff";
                border = "1px solid #c9b458";
              } else if (state === "gray") {
                bg = "#787c7e";
                color = "#fff";
                border = "1px solid #787c7e";
              } else if (isActive && ch.trim() !== "") {
                border = "1px solid #999";
              }

              const tileClass = isActive && errorActiveRow ? "tile-error" : "";

              return (
                <div
                  key={i}
                  className={tileClass}
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
        );
      })}
    </div>
  );
}
