import React, { useRef, useState, useEffect } from "react";
import { validateWord } from "../api"; // same API your old component used

export default function SecretWordInputRow({
  onSubmit, // (word) => Promise|void
  validate = true, // call /api/validate
  disabled = false,
  size = 56, // tile px (use clamp in parent if you want)
  gap = 8,
  placeholder = "Enter 5-letter word",
  submitHint = "Press Enter to start",
  className = "",
}) {
  const [value, setValue] = useState(""); // typed word (0..5)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = async (e) => {
    if (disabled) return;
    e.stopPropagation(); // don't let window/global listeners fire
    const k = e.key;

    if (k === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (k === "Backspace") {
      e.preventDefault();
      setError("");
      setValue((s) => s.slice(0, -1));
      return;
    }
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      setError("");
      setValue((s) => (s.length < 5 ? s + k.toUpperCase() : s));
    }
  };

  async function submit() {
    const word = value.trim().toUpperCase();
    if (word.length !== 5) {
      setError("Word must be 5 letters");
      return;
    }
    if (validate) {
      setBusy(true);
      try {
        const v = await validateWord(word);
        if (!v?.valid) {
          setError("Not a valid word");
          setValue("");
          return;
        }
      } catch (err) {
        console.error(err);
        setError("Validation failed");
        return;
      } finally {
        setBusy(false);
      }
    }
    await onSubmit?.(word);
    // keep the word visible; host screen will flip to spectate when the round starts
    inputRef.current?.focus();
  }

  // CSS calc: simple inline-grid; NO height:100%; no ResizeObserver
  const gridStyle = {
    display: "inline-grid",
    gridTemplateColumns: `repeat(5, ${size}px)`,
    gridTemplateRows: `${size}px`,
    gap,
  };

  return (
    <div className={["flex flex-col items-center", className].join(" ")}>
      {/* hidden input catches keys locally */}
      <input
        ref={inputRef}
        value=""
        onChange={() => {}}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label={placeholder}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />

      <div
        style={gridStyle}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const ch = value[i] || "";
          const isActive = !disabled && i === value.length;

          let bg = "#f9fafb",
            color = "#9ca3af",
            border = "1px solid #d1d5db";
          if (ch) {
            bg = "#fff";
            color = "#111827";
            border = "1px solid #9ca3af";
          }
          if (isActive) {
            bg = "#e3f2fd";
            color = "#1976d2";
            border = "2px solid #1976d2";
          }

          return (
            <div
              key={i}
              style={{
                width: size,
                height: size,
                display: "grid",
                placeItems: "center",
                background: bg,
                color,
                fontWeight: "bold",
                textTransform: "uppercase",
                border,
                borderRadius: 6,
                transition: "all 0.15s ease",
              }}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* tiny hint row (never duplicates layout) */}
      <div className="mt-2 text-xs text-slate-500 h-5">
        {busy ? (
          <span className="text-blue-600">Validating…</span>
        ) : error ? (
          <span className="text-red-600">{error}</span>
        ) : value.length === 0 ? (
          placeholder
        ) : value.length < 5 ? (
          "Type a 5-letter word…"
        ) : (
          submitHint
        )}
      </div>
    </div>
  );
}
