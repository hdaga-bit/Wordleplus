import { useEffect, useState, useCallback } from "react";

const LS_KEY = "pw.theme"; // 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(LS_KEY) || "system"
  );

  const apply = useCallback((t) => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    )?.matches;
    const shouldDark = t === "dark" || (t === "system" && systemDark);
    root.classList.toggle("dark", shouldDark);
  }, []);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(LS_KEY, theme);
  }, [theme, apply]);

  useEffect(() => {
    // Live update if user switches OS theme while on 'system'
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [theme, apply]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, setTheme, toggle };
}
