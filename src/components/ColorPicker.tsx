// Color Picker Component for User Accent Color Selection

import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { DEFAULT_ACCENT_COLORS, updateUserAccentColor } from '../lib/userSettings';
import { useTheme } from '../lib/theme';
import { safeLogError } from '../lib/utils';

interface ColorPickerProps {
  username: string;
  onColorChange?: (color: string) => void;
}

export function ColorPicker({ username, onColorChange }: ColorPickerProps) {
  const { accentColor, setAccentColor } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [customColor, setCustomColor] = useState(accentColor);

  const handleColorSelect = async (color: string) => {
    setIsSaving(true);
    try {
      await updateUserAccentColor(username, color);
      setAccentColor(color);
      onColorChange?.(color);
    } catch (error) {
      safeLogError('Error saving accent color:', error);
      alert('Failed to save color preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
  };

  const handleCustomColorApply = () => {
    handleColorSelect(customColor);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Accent Color
        </h3>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose your accent color that will be applied throughout the interface.
        </p>

        {/* Preset colors */}
        <div className="grid grid-cols-4 gap-3">
          {DEFAULT_ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              disabled={isSaving}
              className={`relative w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                accentColor === color
                  ? 'border-gray-900 dark:border-gray-100 shadow-lg'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            >
              {accentColor === color && (
                <Check className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>

        {/* Custom color picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="rgb(59, 130, 246)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCustomColorApply}
              disabled={isSaving || customColor === accentColor}
              className="px-4 py-2 btn-accent hover:opacity-90 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              {isSaving ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Current color preview */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: accentColor }}
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Current: {accentColor}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This color is applied to buttons, links, and interactive elements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}