import { buildLetterStates } from "../utils.js";

export function createSelectors({ room, me, opponent }) {
  const canGuess =
    room?.mode === "duel" && Boolean(room?.started) && Boolean(me) && !me?.done;

  const letterStates = buildLetterStates(me?.guesses);

  const shouldShowVictory = Boolean(room?.winner) || Boolean(room?.duelReveal);

  const duelSecrets = (() => {
    if (room?.mode !== "duel") {
      return { leftSecret: null, rightSecret: null };
    }

    const allGreenGuessWord = (guesses = []) =>
      guesses.find((g) => g.pattern?.every((p) => p === "green"))?.guess || null;

    const leftSecret =
      allGreenGuessWord(opponent?.guesses) || room?.duelReveal?.[me?.id] || null;
    const rightSecret =
      allGreenGuessWord(me?.guesses) || room?.duelReveal?.[opponent?.id] || null;

    return { leftSecret, rightSecret };
  })();

  return {
    canGuess,
    letterStates,
    shouldShowVictory,
    duelSecrets,
  };
}
