// Color Picker Component for User Accent Color Selection

import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { DEFAULT_ACCENT_COLORS, updateUserAccentColor, getUserAccentColor } from '../lib/userSettings';
import { useTheme } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { safeLogError } from '../lib/utils';

interface ColorPickerProps {
  username: string;
  onColorChange?: (color: string) => void;
}

export function ColorPicker({ username, onColorChange }: ColorPickerProps) {
  const { accentColor, setAccentColor } = useTheme();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [customColor, setCustomColor] = useState(accentColor);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's actual accent color on mount
  useEffect(() => {
    const loadUserColor = async () => {
      try {
        console.log(`Loading accent color for ${username}`);
        const userColor = await getUserAccentColor(username);
        console.log(`Loaded accent color: ${userColor}`);
        setAccentColor(userColor);
        setCustomColor(userColor);
      } catch (error) {
        console.error('Error loading user color:', error);
        // Keep default color on error
      } finally {
        setIsLoading(false);
      }
    };
    loadUserColor();
  }, [username, setAccentColor]);

  // Keep customColor in sync with accentColor but don't override if it was just changed
  useEffect(() => {
    if (!isSaving) {
      setCustomColor(accentColor);
    }
  }, [accentColor, isSaving]);

  const handleColorSelect = async (color: string) => {
    console.log(`Selected color: ${color}`);
    // Apply color immediately for instant feedback
    setAccentColor(color);
    setCustomColor(color);
    onColorChange?.(color);

    setIsSaving(true);
    try {
      await updateUserAccentColor(username, color);
      console.log(`Successfully saved accent color: ${color}`);
    } catch (error: any) {
      safeLogError('Error saving accent color:', error);
      // Revert color back to previous if save failed (but not for 401)
      if (error.status !== 401) {
        const previousColor = await getUserAccentColor(username);
        setAccentColor(previousColor);
        setCustomColor(previousColor);
        onColorChange?.(previousColor);
        alert(t('colorSaveError'));
      }
      // For 401, keep the color but silently warn (handled in userSettings)
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomColorChange = (color: string) => {
    console.log(`Custom color input changed to: ${color}`);
    setCustomColor(color);
  };

  const handleCustomColorApply = () => {
    console.log(`Applying custom color: ${customColor}`);
    handleColorSelect(customColor);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t('accentColor')}
        </h3>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('accentColorDescription')}
        </p>

        {/* Preset colors */}
        <div className="grid grid-cols-4 gap-3">
          {DEFAULT_ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              disabled={isSaving || isLoading}
              className={`relative w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                accentColor === color
                  ? 'border-gray-900 dark:border-gray-100 shadow-lg'
                  : 'border-gray-300 dark:border-gray-600'
              } ${isLoading || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            {t('customColor')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              disabled={isSaving || isLoading}
              className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-50"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="rgb(59, 130, 246)"
              disabled={isSaving || isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            />
            <button
              onClick={handleCustomColorApply}
              disabled={isSaving || isLoading || customColor === accentColor}
              className="px-4 py-2 btn-accent hover:opacity-90 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              {isSaving ? t('savingColor') : t('apply')}
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
              {t('currentColor')}: {accentColor}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('colorAppliedTo')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}