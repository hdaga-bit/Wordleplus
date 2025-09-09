// client/src/api.js
const BASE =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8080"
    : "https://wordleplus-production.up.railway.app");

export async function validateWord(word) {
  // Ensure word is a valid string
  if (!word || typeof word !== "string") {
    return { valid: false, error: "Invalid word format" };
  }

  const response = await fetch(
    `${BASE}/api/validate?word=${word.toLowerCase()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Validation failed");
  }

  return response.json();
}

export async function getRandomWord() {
  const r = await fetch(`${BASE}/api/random?letters=5`);
  if (!r.ok) throw new Error("random failed");
  const j = await r.json();
  return (j.word || "").toUpperCase();
}
