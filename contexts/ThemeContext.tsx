"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { appStorage } from "@/lib/storage";

interface ThemeContextType {
  theme: "light" | "dark";
  toggle: () => void;
  set: (theme: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = appStorage.getTheme();
    setTheme(stored);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
      appStorage.setTheme(theme);
    }
  }, [theme, mounted]);

  const toggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const set = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, set }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
