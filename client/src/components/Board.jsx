// Board.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function Board({
  guesses = [],
  activeGuess = "",
  // layout & visuals
  gap = 8,
  tile = 48,            // fallback tile for non-autoFit
  padding = 16,         // internal padding, matches p-4 feel
  autoFit = true,       // auto-fit to parent (width & height). Set false for fixed tile grids (spectate)
  minTile = 28,         // clamp to keep cells usable on tiny screens
  maxTile = 92,         // clamp to avoid giant tiles on large screens
  className = "",
  style = {},
  // feedback
  errorShakeKey = 0,
  errorActiveRow = false,
}) {
  // --- Build 6 rows (guesses + active + empty)
  const rows = useMemo(() => {
    const r = [...guesses];
    const activeRowIdx = r.length;
    if (r.length < 6) {
      r.push({
        guess: activeGuess.padEnd(5, " "),
        pattern: Array(5).fill("empty"),
      });
    }
    while (r.length < 6) r.push({ guess: "", pattern: [] });
    return { data: r, activeRowIdx };
  }, [guesses, activeGuess]);

  // --- Measurement & responsive sizing
  const wrapRef = useRef(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!wrapRef.current || !autoFit) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setWrapSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [autoFit]);

  // Compute tile based on both width & height (keep cells square)
  const computedTile = useMemo(() => {
    if (!autoFit || !wrapSize.w || !wrapSize.h) return tile;

    const cols = 5;
    const rowsCount = 6;
    // subtract internal padding from the measured box
    const innerW = Math.max(0, wrapSize.w - padding * 2);
    const innerH = Math.max(0, wrapSize.h - padding * 2);

    // usable space after accounting for gaps
    const usableW = innerW - gap * (cols - 1);
    const usableH = innerH - gap * (rowsCount - 1);

    const perCol = Math.floor(usableW / cols);
    const perRow = Math.floor(usableH / rowsCount);
    let t = Math.min(perCol, perRow);

    if (!Number.isFinite(t) || t <= 0) t = tile;
    t = Math.max(minTile, Math.min(maxTile, t));
    return t;
  }, [autoFit, wrapSize.w, wrapSize.h, padding, gap, tile, minTile, maxTile]);

  // simple CSS helpers
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(5, ${computedTile}px)`,
    gridTemplateRows: `repeat(6, ${computedTile}px)`,
    gap,
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        // Let parent decide final width/height; we center the grid within.
        width: "100%",
        height: "100%",
        padding,
        boxSizing: "border-box",
        display: "grid",
        placeItems: "center",
        ...style,
      }}
    >
      <div style={gridStyle}>
        {rows.data.map((row, rowIdx) => {
          const isActive = rowIdx === rows.activeRowIdx;
          const rowKey = isActive ? `active-${rowIdx}-${errorShakeKey}` : `row-${rowIdx}`;
          return (
            <div
              key={rowKey}
              className={isActive && errorActiveRow ? "shake-hard" : ""}
              style={{
                display: "contents", // render tiles directly into the grid
              }}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const ch = row.guess?.[i] || "";
                const state = row.pattern?.[i] || "empty";

                let bg = "#fff", color = "#000", border = "1px solid #ccc";
                if (state === "green") {
                  bg = "#6aaa64"; color = "#fff"; border = "1px solid #6aaa64";
                } else if (state === "yellow") {
                  bg = "#c9b458"; color = "#fff"; border = "1px solid #c9b458";
                } else if (state === "gray") {
                  bg = "#787c7e"; color = "#fff"; border = "1px solid #787c7e";
                } else if (isActive && ch.trim() !== "") {
                  border = "1px solid #999";
                }

                const tileClass = isActive && errorActiveRow ? "tile-error" : "";

                return (
                  <div
                    key={i}
                    className={tileClass}
                    style={{
                      width: computedTile,
                      height: computedTile,
                      display: "grid",
                      placeItems: "center",
                      background: bg,
                      color,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      border,
                      borderRadius: 6,
                      // Prevent overflow visual jitter
                      overflow: "hidden",
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
    </div>
  );
}