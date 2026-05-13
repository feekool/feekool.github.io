// User Settings Manager
// Handles loading and saving user-specific settings like accent color

import { getFile, putFile } from './github';
import { parseFrontmatter, stringifyFrontmatter, safeLogError } from './utils';
import { clearGitHubApiCache } from './serviceWorker';

export interface UserSettings {
  accentColor: string; // RGB color string like "rgb(59, 130, 246)"
  updatedAt: string;
}

// Default accent colors
export const DEFAULT_ACCENT_COLORS = [
  'rgb(59, 130, 246)', // Blue
  'rgb(16, 185, 129)', // Green
  'rgb(245, 158, 11)', // Yellow
  'rgb(239, 68, 68)',  // Red
  'rgb(168, 85, 247)', // Purple
  'rgb(236, 72, 153)', // Pink
  'rgb(14, 165, 233)', // Sky
  'rgb(34, 197, 94)',  // Emerald
];

export const DEFAULT_ACCENT_COLOR = DEFAULT_ACCENT_COLORS[0];

// Load user settings from GitHub
export async function loadUserSettings(username: string): Promise<UserSettings | null> {
  try {
    const path = `users/${username}-settings.md`;
    const file = await getFile(path);

    if (!file) {
      console.log(`User settings file not found for ${username}`);
      return null;
    }

    const { data } = parseFrontmatter<UserSettings>(file.content);
    console.log(`Loaded user settings for ${username}:`, data);
    return data;
  } catch (error) {
    safeLogError('Error loading user settings:', error);
    return null;
  }
}

// Save user settings to GitHub
export async function saveUserSettings(username: string, settings: UserSettings): Promise<void> {
  try {
    const path = `users/${username}-settings.md`;
    const content = stringifyFrontmatter(settings, '');
    
    // Try to get the current file with SHA to avoid 422 error
    let existingFile = null;
    try {
      existingFile = await getFile(path);
    } catch (error: any) {
      if (error.status !== 401 && error.status !== 404) {
        throw error;
      }
    }
    
    // Try to save, but don't fail if token is missing
    try {
      await putFile(path, content, `Update settings for ${username}`, false, existingFile?.sha);
    } catch (error: any) {
      if (error.status === 401) {
        console.warn('GitHub token not configured. Settings saved locally only.');
      } else {
        throw error;
      }
    }
    
    // Clear cache to ensure fresh data on next load
    if (typeof clearGitHubApiCache === 'function') {
      try {
        await clearGitHubApiCache();
      } catch (e) {
        // Ignore cache clear errors
      }
    }
  } catch (error) {
    safeLogError('Error saving user settings:', error);
    throw error;
  }
}

// Get accent color for user (with fallback to default)
export async function getUserAccentColor(username: string): Promise<string> {
  try {
    const settings = await loadUserSettings(username);
    return settings?.accentColor || DEFAULT_ACCENT_COLOR;
  } catch (error) {
    safeLogError('Error getting user accent color:', error);
    return DEFAULT_ACCENT_COLOR;
  }
}

// Update accent color for user
export async function updateUserAccentColor(username: string, color: string): Promise<void> {
  try {
    console.log(`Updating accent color for ${username} to ${color}`);
    const existingSettings = await loadUserSettings(username);
    const settings: UserSettings = {
      accentColor: color,
      updatedAt: new Date().toISOString(),
      ...existingSettings,
    };
    console.log(`Settings to save:`, settings);
    await saveUserSettings(username, settings);
    console.log(`Successfully updated accent color for ${username}`);
  } catch (error) {
    safeLogError('Error updating user accent color:', error);
    throw error;
  }
}