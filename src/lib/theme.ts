import React, { createContext, useContext, useState, useEffect } from 'react';
import { config } from '../config/app';
import { getUserAccentColor, DEFAULT_ACCENT_COLOR } from './userSettings';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children, username }: { children: React.ReactNode; username?: string }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return saved as Theme || config.defaultTheme as Theme;
  });

  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [isLoadingColor, setIsLoadingColor] = useState(!!username);

  // Load user's accent color on mount or when username changes
  useEffect(() => {
    if (username) {
      setIsLoadingColor(true);
      getUserAccentColor(username)
        .then(color => {
          setAccentColorState(color);
          applyAccentColor(color);
        })
        .catch(() => {
          // Keep default color on error
          applyAccentColor(DEFAULT_ACCENT_COLOR);
        })
        .finally(() => {
          setIsLoadingColor(false);
        });
    } else {
      setIsLoadingColor(false);
      applyAccentColor(DEFAULT_ACCENT_COLOR);
    }
  }, [username]);

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    // Apply color immediately to CSS variables
    applyAccentColor(color);
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply accent color to CSS variables
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme, accentColor, setAccentColor } },
    children
  );
}

function applyAccentColor(color: string) {
  // Extract RGB values from rgb(r, g, b) format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    document.documentElement.style.setProperty('--accent-r', r);
    document.documentElement.style.setProperty('--accent-g', g);
    document.documentElement.style.setProperty('--accent-b', b);
    document.documentElement.style.setProperty('--accent-color', color);
  }
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};