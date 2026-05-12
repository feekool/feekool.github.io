import React, { useState } from 'react';
import { ArrowLeft, Save, ShieldCheck, Settings } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useAdminSettings } from '../lib/admin';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings, setSettings, saveSettings, isLoading } = useAdminSettings();
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Загрузка настроек администратора...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.username !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
    } catch (error) {
      console.error('Failed to save admin settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors"
          title="Назад в профиль"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Админ-панель</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Здесь доступны настройки только для пользователя <span className="font-semibold">admin</span>.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Settings className="w-6 h-6 accent-text" />
          <div>
            <h2 className="text-lg font-semibold">Настройки сайта</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Изменения сохраняются локально в браузере.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium">Режим обслуживания</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Отключает некоторые функции для посетителей.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(event) =>
                  setSettings({ ...settings, maintenanceMode: event.target.checked })
                }
                className="h-5 w-5 accent-text rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium">Разрешить регистрацию</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Включает или отключает создание новых аккаунтов.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowSignups}
                onChange={(event) =>
                  setSettings({ ...settings, allowSignups: event.target.checked })
                }
                className="h-5 w-5 accent-text rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium">Показывать количество дней от первого поста</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Отображать на постах темы количество дней с момента создания темы.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showDaysSinceFirstPost}
                onChange={(event) =>
                  setSettings({ ...settings, showDaysSinceFirstPost: event.target.checked })
                }
                className="h-5 w-5 accent-text rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Сообщение для пользователей</label>
            <textarea
              value={settings.adminNotice}
              onChange={(event) => setSettings({ ...settings, adminNotice: event.target.value })}
              rows={4}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Только администратор может видеть эту страницу.
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
              {!isSaving && <Save className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
