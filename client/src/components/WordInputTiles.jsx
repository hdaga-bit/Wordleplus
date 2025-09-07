// components/SecretWordInput.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { validateWord } from "../api"; // same as WordInputTiles used

export default function SecretWordInput({
  onSubmit, // (word) => Promise|void
  placeholder = "Enter 5-letter word",
  submitHint = "Press Enter to start",
  validate = true, // set false if you don't want /api validation
  disabled = false,
  className = "",
  gap = 8,
  padding = 16,
  autoFit = true,
  minTile = 28,
  maxTile = 92,
}) {
  const [value, setValue] = useState(""); // typed word (0..5)
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // ---- same “auto-fit” sizing approach as Board/WordInputTiles ----
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const focusInput = () => inputRef.current?.focus();

  useEffect(() => {
    if (!wrapRef.current || !autoFit) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect;
      if (r) setWrapSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [autoFit]);

  const computedTile = useMemo(() => {
    if (!autoFit || !wrapSize.w || !wrapSize.h) return 48;
    const cols = 5,
      rows = 1;
    const innerW = Math.max(0, wrapSize.w - padding * 2);
    const innerH = Math.max(0, wrapSize.h - padding * 2);
    const usableW = innerW - gap * (cols - 1);
    const usableH = innerH - gap * (rows - 1);
    const perCol = Math.floor(usableW / cols);
    const perRow = Math.floor(usableH / rows);
    let t = Math.min(perCol, perRow);
    if (!Number.isFinite(t) || t <= 0) t = 48;
    return Math.max(minTile, Math.min(maxTile, t));
  }, [autoFit, wrapSize, padding, gap, minTile, maxTile]);

  // --- local key handling on a hidden input; no window listeners ---
  const onKeyDown = (e) => {
    if (disabled) return;
    e.stopPropagation(); // prevent App's global key handler
    const k = e.key;

    if (k === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (k === "Backspace") {
      e.preventDefault();
      setError("");
      setValue((prev) => prev.slice(0, -1));
      return;
    }
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      setError("");
      setValue((prev) => (prev.length < 5 ? prev + k.toUpperCase() : prev));
      return;
    }
  };

  async function submit() {
    const word = value.trim().toUpperCase();
    if (word.length !== 5) {
      setError("Word must be 5 letters");
      return;
    }

    if (validate) {
      setIsValidating(true);
      try {
        const v = await validateWord(word);
        if (!v?.valid) {
          setError("Not a valid word");
          setValue(""); // clear invalid word like Duel behavior
          return;
        }
      } catch (err) {
        console.error(err);
        setError("Validation failed");
        return;
      } finally {
        setIsValidating(false);
      }
    }

    await onSubmit?.(word);
    // Keep the word visible; once the round starts your Host screen will switch to spectate.
    inputRef.current?.focus();
  }

  const tiles = Array.from({ length: 5 }).map((_, i) => {
    const ch = value[i] || "";
    const typingLen = value.length;
    const isEmpty = ch === "";
    const isActive = !disabled && isEmpty && i === typingLen;

    let bg = "#fff",
      color = "#000",
      border = "1px solid #ccc";
    if (isActive) {
      bg = "#e3f2fd"; // light blue (like Duel typing cue)
      color = "#1976d2";
      border = "2px solid #1976d2";
    } else if (ch) {
      bg = "#fff";
      color = "#374151";
      border = "1px solid #9ca3af";
    } else {
      bg = "#f9fafb";
      color = "#9ca3af";
      border = "1px solid #d1d5db";
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
          transition: "all 0.2s ease",
        }}
      >
        {ch}
      </div>
    );
  });

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(5, ${computedTile}px)`,
    gridTemplateRows: `${computedTile}px`,
    gap,
  };

  return (
    <div
      className={["flex flex-col items-center space-y-2", className].join(" ")}
    >
      {/* Hidden input to capture keys locally (prevents global handler) */}
      <input
        ref={inputRef}
        aria-label={placeholder}
        value="" // we keep the visual state in `value`
        onChange={() => {}}
        onKeyDown={onKeyDown}
        disabled={disabled}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />

      <div
        ref={wrapRef}
        onClick={() => !disabled && focusInput()}
        style={{
          width: "100%",
          height: "100%",
          padding,
          boxSizing: "border-box",
          display: "grid",
          placeItems: "center",
          cursor: disabled ? "default" : "text",
        }}
      >
        <div style={gridStyle}>{tiles}</div>
      </div>

      {/* Hints / status */}
      {!isValidating && !error && value.length === 0 && (
        <div className="text-xs text-slate-500">{placeholder}</div>
      )}
      {!isValidating && !error && value.length > 0 && value.length < 5 && (
        <div className="text-xs text-slate-500">Type a 5-letter word…</div>
      )}
      {!isValidating && !error && value.length === 5 && (
        <div className="text-xs text-slate-500">{submitHint}</div>
      )}
      {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
      {isValidating && (
        <div className="text-blue-600 text-sm font-medium">Validating…</div>
      )}
    </div>
  );
}
