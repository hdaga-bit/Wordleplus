import React from "react";

/**
 * Subtle layered gradient + noise. Sits behind everything.
 * Place it as the first child in the page container (position: fixed).
 */
export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900"
    >
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-[60vmax] w-[60vmax] rounded-full blur-3xl opacity-30 
                      bg-[radial-gradient(circle_at_30%_20%,_rgba(99,102,241,0.35),_transparent_60%)] dark:opacity-25"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[65vmax] w-[65vmax] rounded-full blur-3xl opacity-30 
                      bg-[radial-gradient(circle_at_70%_70%,_rgba(236,72,153,0.35),_transparent_60%)] dark:opacity-25"
      />
      {/* tiny noise layer */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
        }}
      />
    </div>
  );
}
