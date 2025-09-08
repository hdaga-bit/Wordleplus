import React from "react";

export default function BrandLogo({ withText = true, size = "md" }) {
  const sizeMap = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const textSizeMap = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeMap[size]} rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white font-black grid place-items-center shadow-md`}
      >
        W
      </div>
      {withText && (
        <span
          className={`${textSizeMap[size]} font-extrabold tracking-tight text-slate-900 dark:text-slate-100`}
        >
          WordlePlus
        </span>
      )}
    </div>
  );
}
