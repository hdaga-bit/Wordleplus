import React from "react";
import { cn } from "../lib/utils.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

function PlayersList({
  players,
  hostId,
  showProgress,
  showStats = true,
  className,
}) {
  return (
    <section
      className={cn("space-y-3", className)}
      aria-labelledby="players-heading"
    >
      <h2
        id="players-heading"
        className="text-base font-semibold tracking-tight"
      >
        Players
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => {
          const progress = p.done ? "Done" : `${p.guesses?.length ?? 0}/6`;
          const isHost = p.id === hostId;
          const onStreak = (p.streak ?? 0) > 1; // 2+ looks more "streaky"

          return (
            <Card
              key={p.id}
              className={cn(
                "border bg-card/60 backdrop-blur transition-shadow",
                onStreak &&
                  "ring-1 ring-emerald-300/60 shadow-[0_0_24px_-8px_rgba(16,185,129,.5)]"
              )}
            >
              <CardHeader className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    {isHost && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wider">
                        Host
                      </span>
                    )}
                  </CardTitle>

                  {/* Right-aligned: progress + compact stats line */}
                  <div className="flex items-center gap-2">
                    {showProgress && (
                      <CardDescription className="text-xs font-medium text-foreground/80">
                        {progress}
                      </CardDescription>
                    )}
                    {showStats && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          W:{p.wins ?? 0}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded ring-1",
                            onStreak
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-300 animate-[glow_1.8s_ease-in-out_infinite]"
                              : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          )}
                        >
                          Stk:{p.streak ?? 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {showStats && p.disconnected && (
                  <div className="mt-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      Reconnecting…
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  ID: {p.id.slice(0, 6)}…
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* streak glow keyframes */}
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,.35) }
          50% { box-shadow: 0 0 16px 0 rgba(16,185,129,.55) }
        }
      `}</style>
    </section>
  );
}

export default PlayersList;
