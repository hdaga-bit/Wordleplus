// Board.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function Board({
  guesses = [],
  activeGuess = "",
  // secret word (optional)
  secretWord = null, // secret word to display above the board
  secretWordState = "empty", // "empty", "typing", "set"
  onSecretWordSubmit = null, // callback for secret word input
  isOwnBoard = true, // whether this is the player's own board (true) or opponent's board (false)
  // layout & visuals
  gap = 8,
  tile = 48, // fallback tile for non-autoFit
  padding = 16, // internal padding, matches p-4 feel
  autoFit = true, // auto-fit to parent (width & height). Set false for fixed tile grids (spectate)
  minTile = 28, // clamp to keep cells usable on tiny screens
  maxTile = 92, // clamp to avoid giant tiles on large screens
  showGuessesLabel = true,

  className = "",
  style = {},
  // feedback
  errorShakeKey = 0,
  errorActiveRow = false,
  secretErrorKey = 0,
  secretErrorActive = false,
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
    const hasSecretRow = secretWord !== null;
    const baseRows = hasSecretRow ? 7 : 6; // 1 secret + 6 guesses, or just 6 guesses
    const includeLabel = showGuessesLabel && hasSecretRow;
    const labelHeight = 18; // px – small, readable label    // subtract internal padding from the measured box
    const innerW = Math.max(0, wrapSize.w - padding * 2);
    const innerH = Math.max(0, wrapSize.h - padding * 2);

    // usable space after accounting for gaps (+ label height if present)
    const totalRowsForGaps = baseRows + (includeLabel ? 1 : 0);
    const usableW = innerW - gap * (cols - 1);
    const usableH =
      innerH - gap * (totalRowsForGaps - 1) - (includeLabel ? labelHeight : 0);

    const perCol = Math.floor(usableW / cols);
    const perRow = Math.floor(usableH / baseRows);
    let t = Math.min(perCol, perRow);

    if (!Number.isFinite(t) || t <= 0) t = tile;
    t = Math.max(minTile, Math.min(maxTile, t));
    return t;
  }, [
    autoFit,
    wrapSize.w,
    wrapSize.h,
    padding,
    gap,
    tile,
    minTile,
    maxTile,
    secretWord,
    showGuessesLabel,
  ]);

  // simple CSS helpers
  const hasSecretRow = secretWord !== null;
  const includeLabel = showGuessesLabel && hasSecretRow;
  const labelHeight = 18;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(5, ${computedTile}px)`,
    gridTemplateRows: includeLabel
      ? `${computedTile}px ${labelHeight}px repeat(6, ${computedTile}px)`
      : `repeat(${hasSecretRow ? 7 : 6}, ${computedTile}px)`,
    gap,
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
           @keyframes shakeX {
     0%,100% { transform: translateX(0) }
     20% { transform: translateX(-4px) }
     40% { transform: translateX(4px) }
     60% { transform: translateX(-3px) }
     80% { transform: translateX(3px) }
   }
   /* Apply shake to tiles in the active row */
   .shake-hard > div { animation: shakeX 250ms ease-in-out; }
   .tile-error { box-shadow: inset 0 0 0 2px #ef4444; }
        `}
      </style>
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
          {/* Secret Word Row (if provided) */}
          {/* Secret Word Row (if provided) */}
          {secretWord !== null && (
            <div
              style={{ display: "contents" }}
              className={secretErrorActive ? "shake-hard" : ""}
              key={
                secretErrorActive
                  ? `secret-error-${secretErrorKey}`
                  : "secret-row"
              }
            >
              {" "}
              {Array.from({ length: 5 }).map((_, i) => {
                // Use the raw (unmasked) length to know the caret position while typing
                const raw = secretWord || "";
                const typingLen = raw.length;

                // While typing: pad to 5 so we render 5 tiles; after set: use whatever is passed ("?????" typically)
                const show =
                  secretWordState === "typing"
                    ? raw.padEnd(5, " ")
                    : secretWord || "";
                const letter = show[i] || "";
                const isEmpty = letter === "" || letter === " ";
                const isActive =
                  secretWordState === "typing" && isEmpty && i === typingLen;

                let bg = "#fff",
                  color = "#000",
                  border = "1px solid #ccc";

                if (secretWordState === "typing" && isEmpty && !isOwnBoard) {
                  bg = "#000";
                  color = "#fff";
                  border = "1px solid #666";
                } else if (secretWordState === "set" && !isEmpty) {
                  bg = "#e3f2fd";
                  color = "#1976d2";
                  border = "1px solid #1976d2";
                } else if (isActive) {
                  border = "1px solid #999";
                }

                // If this is the active row and we're flashing an error, paint it red
                if (secretErrorActive) {
                  bg = "#fee2e2"; // red-100
                  color = "#991b1b"; // red-800 for contrast
                  border = "1px solid #ef4444"; // red-500
                }

                return (
                  <div
                    key={`secret-${i}`}
                    data-secret-word="true"
                    className={secretErrorActive ? "tile-error" : ""}
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
                      overflow: "hidden",
                      cursor: onSecretWordSubmit ? "pointer" : "default",
                      // Enhanced transitions
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform:
                        secretWordState === "typing" && isEmpty
                          ? "scale(1.05)"
                          : "scale(1)",
                      boxShadow:
                        secretWordState === "set" && !isEmpty
                          ? "0 4px 12px rgba(25, 118, 210, 0.3)"
                          : secretWordState === "typing" && isEmpty
                          ? "0 2px 8px rgba(0, 0, 0, 0.2)"
                          : "0 1px 3px rgba(0, 0, 0, 0.1)",
                      // Pulse animation for typing state
                      animation:
                        secretWordState === "typing" && isEmpty
                          ? "pulse 1.5s ease-in-out infinite"
                          : "none",
                    }}
                    onClick={
                      onSecretWordSubmit
                        ? () => {
                            // Handle secret word tile click if needed
                          }
                        : undefined
                    }
                  >
                    {
                      // What to show in the tile:
                      // - YOUR board while typing: show actual letters you type
                      // - OPPONENT view while typing: show '?' on empty slots, never reveal letters
                      // - After set: render whatever was passed in (typically "?????")
                      secretWordState === "empty"
                        ? ""
                        : isOwnBoard && secretWordState === "typing"
                        ? letter.trim() /* your typed letter, blanks stay blank */
                        : !isOwnBoard && secretWordState === "typing"
                        ? isEmpty
                          ? "?"
                          : ""
                        : letter || ""
                    }
                  </div>
                );
              })}
            </div>
          )}
          {/* Label row between secret and guesses */}
          {includeLabel && (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                lineHeight: 1,
                color: "#64748b", // slate-500
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Guesses
            </div>
          )}

          {rows.data.map((row, rowIdx) => {
            const isActive = rowIdx === rows.activeRowIdx;
            const rowKey = isActive
              ? `active-${rowIdx}-${errorShakeKey}`
              : `row-${rowIdx}`;
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

                  const tileClass =
                    isActive && errorActiveRow ? "tile-error" : "";

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
    </>
  );
}
