"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("korual-theme") : null;
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("korual-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("korual-theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="
        flex items-center gap-2 px-3 py-1.5
        rounded-full border border-[var(--border)]
        bg-[var(--bg-2)]/70 backdrop-blur
        text-xs text-[var(--text-soft)]
      "
    >
      <span
        className={`
          w-5 h-5 rounded-full flex items-center justify-center text-[10px]
          ${dark ? "bg-black text-white" : "bg-yellow-300 text-black"}
        `}
      >
        {dark ? "☾" : "☀"}
      </span>
      <span>{dark ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}
