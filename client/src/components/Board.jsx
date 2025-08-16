// Board.jsx
import React from "react";

export default function Board({
  guesses = [],
  activeGuess = "",
  tile = 48,
  gap = 6,
  errorShakeKey = 0, // NEW
  missShakeKey,
  errorActiveRow = false, // NEW: should we mark the active row as error?
}) {
  const [missRowIndex, setMissRowIndex] = React.useState(null);
  React.useEffect(() => {
    if (!missShakeKey) return;
    // last submitted row index = guesses.length - 1 (if there is at least one guess)
    const lastIdx = Math.max(0, Math.min(guesses.length - 1, 5));
    if (guesses.length > 0) {
      setMissRowIndex(lastIdx);
      const t = setTimeout(() => setMissRowIndex(null), 600);
      return () => clearTimeout(t);
    }
  }, [missShakeKey, guesses.length]);
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
        const isActive = rowIdx === activeRow;
        const isMiss = missRowIndex === rowIdx; // NEW
        return (
          <div
            key={rowIdx}
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
                bg = "#fff";
                color = "#000";
                border = "1px solid #999";
              }

              const cellClass =
                (isActive && errorActiveRow
                  ? "tile-error-red animate-wiggle-red"
                  : "") + (isMiss ? " tile-error-red" : ""); // Missed guess: red flash + shake on the whole row

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
