import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
export function LanguageToggle() {
  const { lang, setLang } = useTranslation();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
      aria-label="Toggle language">
      
      <Languages className="w-5 h-5" />
      <span className="uppercase">{lang}</span>
    </button>);

}