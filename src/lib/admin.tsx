import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFile, putFile } from './github';
import { parseFrontmatter, stringifyFrontmatter } from './utils';

export interface AdminSettings {
  maintenanceMode: boolean;
  allowSignups: boolean;
  adminNotice: string;
  showDaysSinceFirstPost: boolean;
}

export const adminSettingsFile = 'admin-settings.md';

export const defaultAdminSettings: AdminSettings = {
  maintenanceMode: false,
  allowSignups: true,
  adminNotice: 'Добро пожаловать в админ-панель.',
  showDaysSinceFirstPost: false
};

export async function loadAdminSettings(): Promise<AdminSettings> {
  const file = await getFile(adminSettingsFile);
  if (!file) {
    return defaultAdminSettings;
  }

  const { data } = parseFrontmatter<AdminSettings>(file.content);
  return { ...defaultAdminSettings, ...data };
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  const content = stringifyFrontmatter(settings, '');
  const existingFile = await getFile(adminSettingsFile);
  await putFile(adminSettingsFile, content, 'Update admin settings', false, existingFile?.sha);
}

interface AdminSettingsContextType {
  settings: AdminSettings;
  setSettings: React.Dispatch<React.SetStateAction<AdminSettings>>;
  saveSettings: (settings: AdminSettings) => Promise<void>;
  isLoading: boolean;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | null>(null);

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminSettings()
      .then((loadedSettings) => {
        setSettings(loadedSettings);
      })
      .catch((error) => {
        console.error('Failed to load admin settings:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const saveSettings = async (updatedSettings: AdminSettings) => {
    await saveAdminSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  return (
    <AdminSettingsContext.Provider
      value={{ settings, setSettings, saveSettings, isLoading }}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error('useAdminSettings must be used within AdminSettingsProvider');
  }
  return context;
}
