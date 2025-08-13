// components/VictoryModal.jsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function Avatar({ name, emoji = "🧑" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-lg">{emoji}</div>
      <span className="font-medium">{name}</span>
    </div>
  );
}

function SecretChip({ word, label }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="inline-flex items-center gap-1">
        {String(word || "")
          .toUpperCase()
          .split("")
          .map((ch, i) => (
            <span
              key={i}
              className="h-9 w-9 grid place-items-center rounded-md border text-sm font-bold"
            >
              {ch}
            </span>
          ))}
      </div>
    </div>
  );
}

export default function VictoryModal({
  open,
  onOpenChange,
  mode,                  // "duel" | "battle"
  winnerName,
  leftName,
  rightName,
  leftSecret,           // player on the RIGHT guessed this (your secret)
  rightSecret,          // player on the LEFT guessed this (opponent’s secret)
  battleSecret          // battle reveal word
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {winnerName ? `${winnerName} wins` : "Round over"}
          </DialogTitle>
          <DialogDescription className="sr-only">Round results</DialogDescription>
        </DialogHeader>

        {mode === "duel" ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Avatar name={leftName} emoji="🧑" />
              <Avatar name={rightName} emoji="🧑‍💻" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SecretChip label={`${leftName}'s secret`} word={leftSecret} />
              <SecretChip label={`${rightName}'s secret`} word={rightSecret} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Battle Royale</p>
            <SecretChip label="Secret word" word={battleSecret} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}