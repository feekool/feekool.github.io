import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme">
      
      {theme === 'light' ?
      <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" /> :

      <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      }
    </button>);

}