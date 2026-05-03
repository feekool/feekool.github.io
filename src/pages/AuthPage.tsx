import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTranslation } from '../lib/i18n';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
export function AuthPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [usernameError, setUsernameError] = useState('');
  const { login, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setUsernameError(t('enterUsername'));
      setIsUsernameValid(false);
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      setIsUsernameValid(false);
      return false;
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      setIsUsernameValid(false);
      return false;
    }
    if (value.length > 20) {
      setUsernameError('Username must be no more than 20 characters long');
      setIsUsernameValid(false);
      return false;
    }
    setUsernameError('');
    setIsUsernameValid(true);
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (error) setError(''); // Clear general error on change
    validateUsername(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUsername(username)) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login(username.trim().toLowerCase());
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 dark:text-blue-400">
          <MessageSquare className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Feekool
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('login')} / {t('register')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 sm:px-10 mobile-form shadow sm:rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                
                {t('username')}
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  className={`appearance-none block w-full mobile-input border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 ${
                    isUsernameValid ? 'border-gray-300 dark:border-gray-600' : 'border-red-500 dark:border-red-400'
                  }`}
                  placeholder={t('enterUsername')}
                  disabled={isSubmitting}
                  aria-describedby={usernameError ? 'username-error' : undefined}
                  aria-invalid={!isUsernameValid} />
                
              </div>
              {usernameError && (
                <p
                  id="username-error"
                  className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                  {usernameError}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !isUsernameValid}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95">
                
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {t('loading')}
                  </>
                ) : (
                  t('continue')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>);

}