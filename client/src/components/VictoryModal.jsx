import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

// Accessible, animated modal without external deps.
// Props:
// - open, onOpenChange(boolean)
// - mode: "duel" | "battle"
// - winnerName: string
// - leftName, rightName (duel)
// - leftSecret, rightSecret (duel)
// - battleSecret (battle)
// - onPlayAgain?() optional
export default function VictoryModal(props) {
  const {
    open,
    onOpenChange,
    mode,
    winnerName = "",
    leftName,
    rightName,
    leftSecret,
    rightSecret,
    battleSecret,
    onPlayAgain,
  } = props;

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Focus management: trap + restore
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      // next tick to ensure mounted
      setTimeout(() => {
        const btn = dialogRef.current?.querySelector("[data-autofocus]");
        (btn || dialogRef.current)?.focus();
      }, 0);
      // ESC to close
      const onKey = (e) => {
        if (e.key === "Escape") onOpenChange?.(false);
        if (e.key === "Tab") {
          // simple trap
          const focusables = dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables || focusables.length === 0) return;
          const list = Array.from(focusables).filter(
            (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
          );
          const first = list[0];
          const last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    } else {
      // restore focus
      previouslyFocused.current?.focus?.();
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onOpenChange?.(false);
  };

  const title =
    mode === "duel"
      ? (winnerName ? `${winnerName} wins` : "Round complete")
      : (winnerName ? `${winnerName} wins` : "Round complete");

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm
                 opacity-100 animate-[fadeIn_180ms_ease-out]"
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        tabIndex={-1}
        className="w-full max-w-lg mx-4 rounded-xl bg-white dark:bg-neutral-900 shadow-2xl
                   outline-none ring-1 ring-black/10
                   animate-[popIn_200ms_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <div className="p-6">
          <h3 id="victory-title" className="text-2xl font-bold tracking-tight">
            {title}
          </h3>

          {mode === "duel" ? (
            <div className="mt-4">
              <div className="flex items-center gap-4">
                <Avatar name={leftName} />
                <div className="flex-1">
                  <p className="font-semibold">{leftName}</p>
                  <p className="text-sm text-muted-foreground">
                    Secret: <code className="font-semibold">{leftSecret || "—"}</code>
                  </p>
                </div>
              </div>
              <div className="h-px bg-border my-4" />
              <div className="flex items-center gap-4">
                <Avatar name={rightName} />
                <div className="flex-1">
                  <p className="font-semibold">{rightName}</p>
                  <p className="text-sm text-muted-foreground">
                    Secret: <code className="font-semibold">{rightSecret || "—"}</code>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Secret word:&nbsp;
                <code className="font-semibold">{battleSecret || "—"}</code>
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
            {onPlayAgain && (
              <Button data-autofocus onClick={onPlayAgain}>
                Play again
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { 
          0% { opacity: 0; transform: translateY(6px) scale(.96) }
          100% { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
  return (
    <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-sm font-semibold">
      {initials || "?"}
    </div>
  );
}