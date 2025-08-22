// client/src/api.js
export async function validateWord(word) {
  // Ensure word is a valid string
  if (!word || typeof word !== "string") {
    return { valid: false, error: "Invalid word format" };
  }

  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8080" // Local development backend
      : "https://amusing-endurance-production.up.railway.app"; // Production backend

  const response = await fetch(
    `${baseUrl}/api/validate?word=${word.toLowerCase()}`,
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
