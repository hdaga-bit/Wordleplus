import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SecretWordTiles({
  secret = "",
  isTyping = false,
  onWordSubmit,
  className = "",
  style = {},
  // Match Board component parameters
  gap = 8,
  padding = 16,
  autoFit = true,
  minTile = 28,
  maxTile = 92,
}) {
  // --- Measurement & responsive sizing (same as Board component)
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

  // Compute tile based on both width & height (same calculation as Board)
  const computedTile = useMemo(() => {
    if (!autoFit || !wrapSize.w || !wrapSize.h) return 48; // fallback

    const cols = 5;
    const rowsCount = 1; // Only one row for secret word
    // subtract internal padding from the measured box
    const innerW = Math.max(0, wrapSize.w - padding * 2);
    const innerH = Math.max(0, wrapSize.h - padding * 2);

    // usable space after accounting for gaps
    const usableW = innerW - gap * (cols - 1);
    const usableH = innerH - gap * (rowsCount - 1);

    const perCol = Math.floor(usableW / cols);
    const perRow = Math.floor(usableH / rowsCount);
    let t = Math.min(perCol, perRow);

    if (!Number.isFinite(t) || t <= 0) t = 48;
    t = Math.max(minTile, Math.min(maxTile, t));
    return t;
  }, [autoFit, wrapSize.w, wrapSize.h, padding, gap, minTile, maxTile]);

  // Grid style (same as Board component)
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(5, ${computedTile}px)`,
    gridTemplateRows: `repeat(1, ${computedTile}px)`,
    gap,
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
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
        {Array.from({ length: 5 }).map((_, i) => {
          const letter = secret[i] || "";
          const isEmpty = !letter;
          const isActive = isEmpty && i === secret.length;

          let bg = "#fff",
            color = "#000",
            border = "1px solid #ccc";

          if (isTyping && isEmpty) {
            bg = "#000";
            color = "#fff";
            border = "1px solid #666";
          } else if (secret && !isEmpty) {
            bg = "#e3f2fd";
            color = "#1976d2";
            border = "1px solid #1976d2";
          } else if (isActive) {
            border = "1px solid #999";
          }

          return (
            <div
              key={i}
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
              }}
            >
              {isTyping && isEmpty ? "?" : letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}
