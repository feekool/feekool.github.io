import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFile, putFile } from './github';
import { parseFrontmatter, stringifyFrontmatter, generateGravatarUrl } from './utils';
import { swManager } from './serviceWorker';

export interface User {
  username: string;
  displayName: string;
  avatar?: string; // URL to avatar image
  joinedAt: string;
  lang: string;
  theme: string;
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
      const file = await getFile(path);

      let userData: User;

      if (file) {
        const { data } = parseFrontmatter<User>(file.content);
        userData = { ...data, username };
      } else {
        const defaultAvatarUrl = await generateGravatarUrl(username);
        userData = {
          username,
          displayName: username,
          avatar: defaultAvatarUrl,
          joinedAt: new Date().toISOString(),
          lang: 'en',
          theme: 'light'
        };
        const content = stringifyFrontmatter(userData, '');
        await putFile(path, content, `Create user ${username}`);
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
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