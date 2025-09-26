import { socket } from "../socket";
import { validateWord } from "../api";

export function useGameActions() {
  // Duel actions
  const submitSecret = async (roomId, secret) => {
    const v = await validateWord(secret);
    if (!v.valid) return { error: "Secret must be a valid 5-letter word" };

    return new Promise((resolve) => {
      socket.emit("setSecret", { roomId, secret }, resolve);
    });
  };

  const submitDuelGuess = async (roomId, currentGuess, canGuessDuel) => {
    if (!canGuessDuel) return { error: "Cannot guess right now" };
    if (currentGuess.length !== 5) return { error: "Guess must be 5 letters" };

    const v = await validateWord(currentGuess);
    if (!v.valid) return { error: "Invalid word" };

    return new Promise((resolve) => {
      socket.emit("makeGuess", { roomId, guess: currentGuess }, (ack) => {
        if (ack?.error) {
          console.warn("[duel makeGuess] error:", ack.error);
          resolve({ error: ack.error });
        } else {
          resolve(ack);
        }
      });
    });
  };

  const duelPlayAgain = (roomId) => {
    return new Promise((resolve) => {
      socket.emit("duelPlayAgain", { roomId }, resolve);
    });
  };

  // Battle actions
  const setWordAndStart = async (roomId, word) => {
    // Ensure word is a valid string
    if (!word || typeof word !== "string" || word.length !== 5) {
      return { error: "Invalid word format" };
    }

    const v = await validateWord(word);
    if (!v.valid) return { error: "Host word must be valid" };

    return new Promise((resolve) => {
      socket.emit("setHostWord", { roomId, secret: word }, (r) => {
        if (r?.error) {
          resolve(r);
        } else {
          socket.emit("startBattle", { roomId }, (r2) => {
            if (r2?.error) resolve(r2);
            else resolve({ success: true });
          });
        }
      });
    });
  };

  const battleGuess = async (roomId, guess, canGuessBattle) => {
    if (!canGuessBattle) return { error: "Cannot guess right now" };
    if (guess.length !== 5) return { error: "Guess must be 5 letters" };

    const v = await validateWord(guess);
    if (!v.valid) return { error: "Invalid word" };

    return new Promise((resolve) => {
      socket.emit("makeGuess", { roomId, guess }, (ack) => {
        if (ack?.error) {
          console.warn("[makeGuess] error:", ack.error);
          // return the real error so the caller can show a specific message
          resolve({ error: ack.error });
        } else {
          resolve(ack);
        }
      });
    });
  };

  return {
    submitSecret,
    submitDuelGuess,
    duelPlayAgain,
    setWordAndStart,
    battleGuess,
  };
}
