import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { MessageSquare, LogOut, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from '../lib/auth';
import { useAdminSettings } from '../lib/admin';
import { useTranslation } from '../lib/i18n';
export function Layout() {
  const { user, logout } = useAuth();
  const { settings } = useAdminSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/auth');
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
            
            <MessageSquare className="w-6 h-6" />
            <span>Feekool</span>
          </Link>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ThemeToggle />

            {user ?
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline">{user.displayName}</span>
                </Link>
                <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title={t('logout')}>
                
                  <LogOut className="w-5 h-5" />
                </button>
              </div> :

            <Link
              to="/auth"
              className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
              
                {t('login')}
              </Link>
            }
          </div>
        </div>
      </header>

      {settings.adminNotice ? (
        <div className="max-w-5xl mx-auto px-4 py-4 bg-blue-50 dark:bg-blue-900/60 border-b border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
          {settings.adminNotice}
        </div>
      ) : null}

      {settings.maintenanceMode && user?.username !== 'admin' ? (
        <div className="max-w-5xl mx-auto px-4 py-4 bg-yellow-100 dark:bg-yellow-900/40 border-b border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100">
          {t('maintenanceBanner')}
        </div>
      ) : null}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      <OfflineIndicator />
    </div>);

}