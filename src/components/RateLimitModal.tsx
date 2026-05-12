import React from 'react';
import { useTranslation } from '../lib/i18n';
import { X, AlertTriangle, Shield } from 'lucide-react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const messages = {
    en: {
      title: 'Rate Limit Exceeded',
      message: 'You have exceeded the GitHub API rate limit. To continue using the application, please enable VPN or change your IP address.',
      close: 'Close'
    },
    ru: {
      title: 'Превышен лимит запросов',
      message: 'Вы превысили лимит запросов к API GitHub. Чтобы продолжить пользоваться приложением, включите VPN или смените IP-адрес.',
      close: 'Закрыть'
    }
  };

  const currentLang = localStorage.getItem('lang') || 'en';
  const content = messages[currentLang as keyof typeof messages] || messages.en;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {content.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 accent-bg rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 accent-text" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {content.message}
              </p>
            </div>
          </div>

          {/* Additional info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {currentLang === 'ru' ? 'Что делать:' : 'What to do:'}
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• {currentLang === 'ru' ? 'Включите VPN' : 'Enable VPN'}</li>
              <li>• {currentLang === 'ru' ? 'Смените IP-адрес' : 'Change your IP address'}</li>
              <li>• {currentLang === 'ru' ? 'Подождите сброса лимита (обычно 1 час)' : 'Wait for limit reset (usually 1 hour)'}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
          >
            {content.close}
          </button>
        </div>
      </div>
    </div>
  );
}