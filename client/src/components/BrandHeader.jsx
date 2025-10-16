import React from "react";
import { cn } from "@/lib/utils";
import BrandLogo from "./BrandLogo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function BrandHeader({
  onHomeClick,
  right = null,
  className = "",
  roomId,
  modeLabel,
}) {
  return (
    <header
      className={cn(
        "w-full border-b border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 py-3 relative">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onHomeClick}
            className="inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition"
            aria-label="Go to Home"
          >
            <BrandLogo />
          </button>
          {roomId && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground border-l border-border/40 pl-3">
              <span className="uppercase tracking-[0.25em] text-[10px] text-muted-foreground">
                Room
              </span>
              <span className="font-mono text-sm text-foreground tracking-wide">
                {roomId}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0 justify-end">
          {right}
          <ThemeToggle />
        </div>

        {modeLabel && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
              <p className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-muted-foreground text-center">
                {modeLabel}
              </p>
            </div>
            <span className="sr-only">Mode: {modeLabel}</span>
          </>
        )}
      </div>
    </header>
  );
}
