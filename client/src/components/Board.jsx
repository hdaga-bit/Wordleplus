// Board.jsx
export default function Board({ guesses = [], activeGuess = "" }) {
  // Completed rows
  const rows = guesses.map(g => ({ guess: g.guess ?? "", pattern: g.pattern ?? [] }));

  // If there’s room and we’re currently typing, show a live row
  if (rows.length < 6 && activeGuess) {
    rows.push({ guess: activeGuess, pattern: [] });
  }

  // Pad to 6 rows
  while (rows.length < 6) rows.push({ guess: "", pattern: [] });

  return (
    <div className="grid gap-2">
      {rows.slice(0,6).map((row, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const ch = row.guess?.[i] || "";
            const state = row.pattern?.[i]; // undefined or 'gray' | 'yellow' | 'green'
            const base = "h-12 w-12 grid place-items-center text-xl font-bold uppercase rounded-md border";
            const color =
              state === "green"  ? "bg-[#6aaa64] text-white border-[#6aaa64]" :
              state === "yellow" ? "bg-[#c9b458] text-white border-[#c9b458]" :
              state === "gray"   ? "bg-[#787c7e] text-white border-[#787c7e]" :
                                   "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600";
            return <div key={i} className={`${base} ${color}`}>{ch}</div>;
          })}
        </div>
      ))}
    </div>
  );
}