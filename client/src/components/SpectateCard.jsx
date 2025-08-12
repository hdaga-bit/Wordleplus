function SpectateCard({ player }) {
    const initials = getInitials(player.name);
  
    return (
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold">
              {initials}
            </div>
            <div>
              <CardTitle className="text-base">{player.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {player.done ? "Done" : `${player.guesses?.length ?? 0}/6`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Board guesses={player.guesses || []} tile={50} gap={8} />
        </CardContent>
      </Card>
    );
  }
  
  function getInitials(name = "") {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || "").join("");
  }