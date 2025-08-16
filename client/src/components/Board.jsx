// src/components/Board.jsx
import React, { useEffect, useState } from "react";

export default function Board({
  guesses = [],
  activeGuess = "",
  tile = 48,
  gap = 6,
  // Active-row invalid (length < 5 or invalid word)
  errorShakeKey,
  errorActiveRow = false,
  // Valid but wrong guess just submitted (Battle)
  missShakeKey,
}) {
  // Build rows: past guesses + 1 active guess row + empty rows to 6
  const rows = [...guesses];
  const activeRow = rows.length; // <- THIS defines activeRow
  if (rows.length < 6) {
    rows.push({
      guess: (activeGuess || "").padEnd(5, " "),
      pattern: Array(5).fill("empty"),
    });
  }
  while (rows.length < 6) rows.push({ guess: "", pattern: [] });

  // Track which row should "miss shake" (last submitted real row)
  const [missRowIndex, setMissRowIndex] = useState(null);

  useEffect(() => {
    if (!missShakeKey) return;
    if (guesses.length > 0) {
      const lastIdx = Math.min(guesses.length - 1, 5);
      setMissRowIndex(lastIdx);
      const t = setTimeout(() => setMissRowIndex(null), 600);
      return () => clearTimeout(t);
    }
  }, [missShakeKey, guesses.length]);

  return (
    <div style={{ display: "grid", gap }}>
      {rows.map((row, rowIdx) => {
        const isActive = rowIdx === activeRow;
        const isMiss = missRowIndex === rowIdx;

        // Use a changing key on the *row* to reliably retrigger CSS animations
        const rowKey = `${rowIdx}-${isActive ? errorShakeKey ?? 0 : 0}-${isMiss ? missShakeKey ?? 0 : 0}`;

        return (
          <div
            key={rowKey}
            className={isMiss ? "animate-wiggle-red" : ""}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(5, ${tile}px)`,
              gap,
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const ch = row.guess?.[i] || "";
              const state = row.pattern?.[i] || "empty";

              let bg = "#fff";
              let color = "#000";
              let border = "1px solid #ddd";

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
                // active typing cells
                bg = "#fff";
                color = "#000";
                border = "1px solid #999";
              }

              const cellClass =
                (isActive && errorActiveRow ? "tile-error-red animate-wiggle-red " : "") +
                (isMiss ? "tile-error-red " : "");

              return (
                <div
                  key={i}
                  className={cellClass}
                  style={{
                    height: tile,
                    display: "grid",
                    placeItems: "center",
                    background: bg,
                    color,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    border,
                    borderRadius: 4,
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