// components/PlayerCard.jsx
import React from "react";
import { cn } from "@/lib/utils";

export default function PlayerCard({
  name = "Player",
  wins = 0,
  streak = 0,
  avatar,
  host = false,
  className,
  rightExtras,
  size = "md", // "sm" | "md"
}) {
  const onStreak = (streak ?? 0) > 1;
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "?";

  const avatarSize = size === "sm" ? "w-8 h-8 text-base" : "w-10 h-10 text-xl";
  const textName = size === "sm" ? "text-sm" : "text-base";

  return (
    <div
      className={cn(
        // 🔸 No border, no card background, no backdrop blur
        "w-full px-0 py-1.5 md:py-2",
        "flex items-center justify-between gap-3",
        onStreak && "ring-0 shadow-[0_0_24px_-8px_rgba(16,185,129,.5)]",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "grid place-items-center rounded-full bg-muted shrink-0",
            avatarSize
          )}
          aria-hidden
        >
          {avatar || initials}
        </div>
        <div className="min-w-0">
          <div className={cn("font-semibold truncate", textName)}>{name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            {host && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wider">
                Host
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              W:{wins ?? 0}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded ring-1",
                onStreak
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-300 animate-[glow_1.8s_ease-in-out_infinite]"
                  : "bg-indigo-50 text-indigo-700 ring-indigo-200"
              )}
              title="Current streak"
            >
              Stk:{streak ?? 0}
            </span>
          </div>
        </div>
      </div>

      {rightExtras && <div className="shrink-0">{rightExtras}</div>}

      <style>{`
        @keyframes glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.35) }
          50% { box-shadow: 0 0 16px 0 rgba(16,185,129,.55) }
        }
      `}</style>
    </div>
  );
}