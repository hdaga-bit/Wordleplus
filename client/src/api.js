// client/src/api.js
import { SERVER_URL } from "./config";

export async function validateWord(word) {
  // Ensure word is a valid string
  if (!word || typeof word !== "string") {
    return { valid: false, error: "Invalid word format" };
  }

  const response = await fetch(
    `${SERVER_URL}/api/validate?word=${encodeURIComponent(word)}`,
    { credentials: "omit" }
  );

  if (!response.ok) {
    throw new Error("Validation failed");
  }

  return response.json();
}

export async function getRandomWord() {
  const res = await fetch(`${SERVER_URL}/api/random-word`, {
    credentials: "omit",
  });
  const data = await res.json();
  // support either {word:"HELLO"} or "HELLO"
  return typeof data === "string" ? data : data.word;
}
