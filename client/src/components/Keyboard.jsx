// components/Keyboard.jsx
import React, { useMemo, useState } from "react";
import { cn } from "../lib/utils";

// letterStates: { A: 'correct'|'present'|'absent' }
export default function Keyboard({
  onKeyPress,
  letterStates = {},
  sticky = true,
  className,
}) {
  const rows = useMemo(
    () => [
      ["Q","W","E","R","T","Y","U","I","O","P"],
      ["A","S","D","F","G","H","J","K","L"],
      ["ENTER","Z","X","C","V","B","N","M","BACKSPACE"],
    ],
    []
  );

  const press = (k) => {
    if (!onKeyPress) return;
    onKeyPress(k);
  };

  const Key = ({ label }) => {
    const state = letterStates[label] || "idle";
    const isAction = label === "ENTER" || label === "BACKSPACE";
    const aria = label === "BACKSPACE" ? "Backspace" : label === "ENTER" ? "Enter" : `Letter ${label}`;
    const [active, setActive] = useState(false);

    const bg = state === "correct" ? "bg-emerald-600 text-white"
      : state === "present" ? "bg-amber-500 text-white"
      : state === "absent"  ? "bg-neutral-500 text-white"
      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100";

    return (
      <button
        type="button"
        aria-label={aria}
        aria-pressed={active ? "true" : "false"}
        onPointerDown={() => { setActive(true); press(label); }}
        onPointerUp={() => setActive(false)}
        onKeyDown={(e)=> {
          if (e.key === "Enter" && label === "ENTER") press("ENTER");
          if (e.key === "Backspace" && label === "BACKSPACE") press("BACKSPACE");
        }}
        className={cn(
          "select-none rounded-md px-2 sm:px-3 py-3 sm:py-3.5 font-semibold",
          "leading-none uppercase tracking-wide",
          "transition-[transform,background-color,box-shadow] duration-150",
          "focus:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-background ring-primary",
          bg,
          isAction ? "text-[12px] sm:text-sm basis-[18%] sm:basis-[12%]" : "text-base sm:text-lg basis-[9.5%] sm:basis-[8%]",
          active ? "scale-95" : "active:scale-95"
        )}
      >
        {label === "BACKSPACE" ? "⌫" : label}
      </button>
    );
  };

  return (
    <div
      className={cn(
        sticky
          ? "fixed md:static bottom-0 left-0 right-0 z-30 md:z-auto"
          : "",
        className
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className={cn(
        // Bar container
        "mx-auto w-full max-w-7xl",
        sticky
          ? "bg-white/95 dark:bg-neutral-900/95 md:bg-transparent backdrop-blur supports-[backdrop-filter]:backdrop-blur md:backdrop-blur-0 border-t md:border-0 border-neutral-200/80 dark:border-neutral-800/80"
          : ""
      )}>
        <div className="px-3 pt-2 pb-3 md:p-0">
          <div className="flex flex-col gap-2 items-center justify-center">
            {rows.map((row, idx) => (
              <div key={idx} className={cn(
                "w-full flex items-center justify-center gap-2",
                idx === 1 && "px-4",
                idx === 2 && "px-0"
              )}>
                {row.map((k) => <Key key={k} label={k} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}