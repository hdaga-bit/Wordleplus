// client/src/api.js
export async function validateWord(word) {
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "https://amusing-endurance-production.up.railway.app" // Use hosted backend for local testing
      : "https://amusing-endurance-production.up.railway.app"; // Adjust for Vercel if needed later

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
