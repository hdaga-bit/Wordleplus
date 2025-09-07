import React from "react";
import { cn } from "@/lib/utils";

/**
 * Clean, no-glow player card for Duel mode.
 *
 * New optional props (all default false):
 *  - isTyping: show a tiny "Typing…" pill
 *  - hasSecret: show a tiny "Secret set" pill
 *  - disconnected: show "Offline" pill
 *  - highlight: "none" | "active" | "winner"
 *      - "active": thin blue left bar
 *      - "winner": thin emerald left bar + small trophy next to name
 */
export default function PlayerCard({
  name = "Player",
  wins = 0,
  streak = 0,
  avatar,
  host = false,
  className,
  rightExtras,
  size = "md", // "sm" | "md"
  // new (optional)
  isTyping = false,
  hasSecret = false,
  disconnected = false,
  highlight = "none", // "none" | "active" | "winner"
}) {
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "?";

  const avatarSize = size === "sm" ? "w-8 h-8 text-base" : "w-10 h-10 text-xl";
  const textName = size === "sm" ? "text-sm" : "text-base";
  const chipText = "text-[10px]";
  const chipPad = "px-1.5 py-0.5";
  const rowGap = size === "sm" ? "gap-1" : "gap-1.5";

  // TL accent bar (thin, subtle)
  const accentClass =
    highlight === "active"
      ? "before:bg-blue-500"
      : highlight === "winner"
      ? "before:bg-emerald-600"
      : "before:bg-transparent";

  return (
    <div
      className={cn(
        "relative w-full px-0 py-1.5 md:py-2",
        "flex items-center justify-between gap-3",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1", // thin accent
        accentClass,
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div
          className={cn(
            "grid place-items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0",
            avatarSize
          )}
          aria-hidden
        >
          {avatar || initials}
        </div>

        {/* Name + chips */}
        <div className="min-w-0">
          <div
            className={cn(
              "font-semibold truncate flex items-center gap-1.5",
              textName
            )}
          >
            {name}
            {highlight === "winner" && (
              <span
                title="Winner"
                className="text-emerald-600"
                aria-label="Winner"
              >
                🏆
              </span>
            )}
          </div>

          <div className={cn("flex items-center flex-wrap", rowGap, "mt-1")}>
            {host && (
              <span
                className={cn(
                  chipText,
                  chipPad,
                  "rounded bg-slate-900 text-white uppercase tracking-wider"
                )}
                title="Room host"
              >
                Host
              </span>
            )}

            {/* Score chips */}
            <span
              className={cn(
                chipText,
                chipPad,
                "rounded bg-slate-50 text-slate-700 border border-slate-200"
              )}
              title="Wins"
            >
              W:{wins ?? 0}
            </span>
            <span
              className={cn(
                chipText,
                chipPad,
                "rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
              )}
              title="Current streak"
            >
              Stk:{streak ?? 0}
            </span>

            {/* Live-state chips (mutually independent) */}
            {isTyping && !disconnected && (
              <span
                className={cn(
                  chipText,
                  chipPad,
                  "rounded bg-amber-50 text-amber-700 border border-amber-200"
                )}
              >
                Typing…
              </span>
            )}
            {hasSecret && !disconnected && (
              <span
                className={cn(
                  chipText,
                  chipPad,
                  "rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                )}
              >
                Secret set
              </span>
            )}
            {disconnected && (
              <span
                className={cn(
                  chipText,
                  chipPad,
                  "rounded bg-rose-50 text-rose-700 border border-rose-200"
                )}
              >
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {rightExtras && <div className="shrink-0">{rightExtras}</div>}
    </div>
  );
}
