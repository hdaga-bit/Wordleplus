import React from "react";
import BrandLogo from "./BrandLogo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function BrandHeader({
  onHomeClick,
  right = null,
  className = "",
}) {
  return (
    <header className={`w-full px-4 py-2 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <button
          onClick={onHomeClick}
          className="inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition"
          aria-label="Go to Home"
        >
          <BrandLogo />
        </button>
        <div className="flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
