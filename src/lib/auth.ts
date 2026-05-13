import React, { createContext, useContext, useState, useEffect } from 'react';
import { config } from '../config/app';
import { getFile, putFile } from './github';
import { parseFrontmatter, stringifyFrontmatter, generateGravatarUrl } from './utils';
import { swManager } from './serviceWorker';
import { DEFAULT_ACCENT_COLOR } from './userSettings';

export interface User {
  username: string;
  displayName: string;
  avatar?: string; // URL to avatar image
  joinedAt: string;
  lang: string;
  theme: string;
  accentColor?: string; // RGB color string like "rgb(59, 130, 246)"
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('user'); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string) => {
    setIsLoading(true);
    try {
      const path = `users/${username}.md`;
      let file = null;
      
      // Try to fetch user file if token is available
      try {
        if (config.github.token) {
          file = await getFile(path);
        }
      } catch (error: any) {
        // Treat 401/404 as user not found - this is OK
        if (error.status === 401 || error.status === 404) {
          file = null;
        } else {
          // Only throw other errors
          throw error;
        }
      }

      let userData: User;
      let isNewUser = false;

      if (file) {
        const { data } = parseFrontmatter<User>(file.content);
        userData = { ...data, username };
      } else {
        isNewUser = true;
        const defaultAvatarUrl = await generateGravatarUrl(username);
        userData = {
          username,
          displayName: username,
          avatar: defaultAvatarUrl,
          joinedAt: new Date().toISOString(),
          lang: 'en',
          theme: 'light'
        };
        // Only create file if token is available
        if (config.github.token) {
          const content = stringifyFrontmatter(userData, '');
          await putFile(path, content, `Create user ${username}`);
        }
      }

      // Create default settings file if it doesn't exist
      const settingsPath = `users/${username}-settings.md`;
      let settingsFile = null;
      
      // Try to fetch settings file if token is available
      try {
        if (config.github.token) {
          settingsFile = await getFile(settingsPath);
        }
      } catch (error: any) {
        // Treat 401/404 as settings not found - this is OK
        if (error.status === 401 || error.status === 404) {
          settingsFile = null;
        }
      }
      
      if (!settingsFile) {
        const defaultSettings = {
          accentColor: DEFAULT_ACCENT_COLOR,
          updatedAt: new Date().toISOString()
        };
        // Only create if token is available
        if (config.github.token) {
          const settingsContent = stringifyFrontmatter(defaultSettings, '');
          await putFile(settingsPath, settingsContent, `Create settings for ${username}`);
        }
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Apply user settings
      localStorage.setItem('theme', userData.theme);
      localStorage.setItem('lang', userData.lang);
      // Apply theme class
      if (userData.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Clear token from service worker
    swManager.clearToken();
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, login, logout, isLoading } },
    children
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};