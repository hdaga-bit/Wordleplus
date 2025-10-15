import { buildLetterStates } from "../utils.js";

export function createSelectors({ room, me }) {
  const shared = room?.shared;

  const canGuess =
    room?.mode === "shared" &&
    Boolean(shared?.started) &&
    Boolean(me) &&
    !shared?.winner &&
    shared?.turn === me?.id;

  const letterStates = buildLetterStates(shared?.guesses || []);

  const shouldShowVictory = Boolean(shared?.winner) || Boolean(shared?.lastRevealedWord);

  return {
    canGuess,
    letterStates,
    shouldShowVictory,
  };
}
