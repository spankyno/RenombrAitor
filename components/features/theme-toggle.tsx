"use client";

import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore } from "@/store/theme-store";

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  // Apply class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span key="moon"
            initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}>
            <Moon size={15} />
          </motion.span>
        ) : (
          <motion.span key="sun"
            initial={{ rotate: 30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -30, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}>
            <Sun size={15} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
