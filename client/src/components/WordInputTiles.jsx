import React, { useState, useEffect } from "react";
import { validateWord } from "../api";

function WordInputTiles({
  onWordSubmit,
  placeholder = "Enter 5-letter word",
  submitButtonText = "Start Game",
  className = "",
}) {
  const [letters, setLetters] = useState(Array(5).fill(""));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  // Handle letter input
  const handleLetterInput = (letter) => {
    if (currentIndex < 5 && /^[A-Za-z]$/.test(letter)) {
      const newLetters = [...letters];
      newLetters[currentIndex] = letter.toUpperCase();
      setLetters(newLetters);
      setCurrentIndex(currentIndex + 1);
      setError("");
      console.log("Letter input:", letter, "New letters array:", newLetters);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    if (currentIndex > 0) {
      const newLetters = [...letters];
      newLetters[currentIndex - 1] = "";
      setLetters(newLetters);
      setCurrentIndex(currentIndex - 1);
      setError("");
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (/^[A-Za-z]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, letters]);

  // Handle submit
  const handleSubmit = async () => {
    // Filter out empty strings and join
    const word = letters
      .filter((letter) => letter && letter.trim() !== "")
      .join("");
    console.log(
      "Submitting word:",
      word,
      "Length:",
      word.length,
      "Letters array:",
      letters
    );

    if (word.length !== 5) {
      setError("Word must be 5 letters");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const result = await validateWord(word);
      console.log("Validation result:", result);
      if (result.valid) {
        onWordSubmit(word);
        // Reset after successful submission
        setLetters(Array(5).fill(""));
        setCurrentIndex(0);
      } else {
        setError("Not a valid word");
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError("Error validating word");
    } finally {
      setIsValidating(false);
    }
  };

  // Check if word is complete
  const isWordComplete = letters.every(
    (letter) => letter && letter.trim() !== ""
  );

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Word Input Tiles */}
      <div className="flex justify-center">
        <div className="grid grid-cols-5 gap-2">
          {letters.map((letter, index) => (
            <div
              key={index}
              className={`w-12 h-12 border-2 rounded-md flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                index === currentIndex
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : letter
                  ? "border-slate-400 bg-white text-slate-700"
                  : "border-slate-300 bg-slate-50 text-slate-400"
              }`}
            >
              {letter || ""}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isWordComplete || isValidating}
        className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {isValidating ? "Validating..." : submitButtonText}
      </button>
    </div>
  );
}

export default WordInputTiles;
