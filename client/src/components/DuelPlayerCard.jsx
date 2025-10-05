import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Crown, Wifi, WifiOff, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function DuelPlayerCard({
  name,
  wins = 0,
  streak = 0,
  avatar,
  host = false,
  isTyping = false,
  hasSecret = false,
  disconnected = false,
  highlight = "none",
  size = "sm",
  className,
  rightExtras,
  active = false,
}) {
  const isWinner = highlight === "winner";

  // scale tokens
  const scale = {
    xs: {
      pad: "p-2",
      gap: "gap-2",
      name: "text-sm",
      sub: "text-[10px]",
      avatar: "w-8 h-8 text-base",
      icon: 12,
      dot: "w-2 h-2",
    },
    sm: {
      pad: "p-3",
      gap: "gap-3",
      name: "text-base",
      sub: "text-[11px]",
      avatar: "w-9 h-9 text-lg",
      icon: 14,
      dot: "w-2.5 h-2.5",
    },
    md: {
      pad: "p-4",
      gap: "gap-3",
      name: "text-lg",
      sub: "text-xs",
      avatar: "w-10 h-10 text-xl",
      icon: 16,
      dot: "w-3 h-3",
    },
  }[size];

  return (
    <Card
      className={cn(
        // compact, horizontal card
        "border bg-card",
        scale.pad,
        "flex items-center justify-between",
        className
      )}
    >
      {/* left: status & avatar + name */}
      <div className={cn("flex items-center min-w-0 pl-7", scale.gap)}>
        {/* connection */}
        <div className="shrink-0">
          {disconnected ? (
            <WifiOff className="text-rose-500" size={scale.icon} />
          ) : (
            <Wifi className="text-emerald-600" size={scale.icon} />
          )}
        </div>

        {/* avatar */}
        <div
          className={cn(
            "rounded-full grid place-items-center border bg-muted text-foreground/80 shrink-0",
            scale.avatar,
            isWinner && "border-emerald-500",
            host && !isWinner && "border-indigo-500",
            disconnected && "opacity-60 grayscale",
            active && "shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all animate-pulse"
          )}
        >
          {avatar}
        </div>

        {/* name + chips */}
        <div className="min-w-0">
          <div className={cn("flex items-center gap-1.5 truncate", scale.name)}>
            <span className="font-semibold truncate">{name}</span>
            {isWinner && (
              <Trophy size={scale.icon} className="text-emerald-600 shrink-0" />
            )}
            {host && !isWinner && (
              <Crown size={scale.icon} className="text-indigo-600 shrink-0" />
            )}
          </div>

          <div
            className={cn(
              "flex items-center flex-wrap gap-1.5 mt-0.5",
              scale.sub
            )}
          >
            <Badge variant="outline" className="px-1 py-0 h-4">
              W:{wins}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "px-1 py-0 h-4",
                streak > 0 && "border-accent text-accent-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1">
                {streak > 0 && <Zap size={scale.icon - 2} />}
                Stk:{streak}
              </span>
            </Badge>

            {isTyping && !disconnected && (
              <Badge variant="secondary" className="px-1 py-0 h-4">
                typing…
              </Badge>
            )}
            {hasSecret && !disconnected && !isTyping && (
              <Badge variant="secondary" className="px-1 py-0 h-4">
                ready
              </Badge>
            )}
            {disconnected && (
              <Badge variant="destructive" className="px-1 py-0 h-4">
                offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* right: tiny metrics + extras */}
      <div className={cn("flex items-center", scale.gap)}>
        <div className="text-right">
          <div
            className={cn(
              "inline-block rounded-full",
              scale.dot,
              hasSecret
                ? isWinner
                  ? "bg-emerald-600"
                  : "bg-emerald-500"
                : "bg-muted-foreground/20"
            )}
            title={hasSecret ? "Ready" : "Not ready"}
          />
        </div>
        {rightExtras}
      </div>
    </Card>
  );
}
