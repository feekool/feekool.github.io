import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, User as UserIcon, Calendar, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { putFile, getFile } from '../lib/github';
import { stringifyFrontmatter, generateGravatarUrl, safeLogError } from '../lib/utils';
import { ColorPicker } from '../components/ColorPicker';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingGravatar, setIsResettingGravatar] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;

          // Generate unique filename
          const fileName = `avatar-${user.username}-${Date.now()}.${file.type.split('/')[1]}`;
          const path = `avatars/${fileName}`;

          // Upload to GitHub
          await putFile(path, base64.split(',')[1], `Upload avatar for ${user.username}`, true);

          // Update user profile
          const updatedUser = {
            ...user,
            avatar: `https://raw.githubusercontent.com/feekool/feekool.github.io/master/avatars/${fileName}`
          };

          const content = stringifyFrontmatter(updatedUser, '');
          
          // Get the current file with SHA to avoid 422 error
          const userPath = `users/${user.username}.md`;
          let existingFile = null;
          try {
            existingFile = await getFile(userPath);
          } catch (error: any) {
            if (error.status !== 401 && error.status !== 404) {
              throw error;
            }
          }
          
          try {
            await putFile(userPath, content, `Update profile for ${user.username}`, false, existingFile?.sha);
          } catch (error: any) {
            if (error.status === 401) {
              alert('GitHub token not configured. Avatar saved locally only. Set VITE_API_KEY to sync to GitHub.');
            } else {
              throw error;
            }
          }

          // Update local storage
          localStorage.setItem('user', JSON.stringify(updatedUser));

          // Reload page to update avatar in UI
          window.location.reload();
        } catch (error) {
          safeLogError('Error uploading avatar:', error);
          alert('Failed to upload avatar. Make sure VITE_API_KEY is set.');
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      safeLogError('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;

    setIsSaving(true);
    try {
      const updatedUser = {
        ...user,
        displayName: displayName.trim()
      };

      const content = stringifyFrontmatter(updatedUser, '');
      
      // Get the current file with SHA to avoid 422 error
      const userPath = `users/${user.username}.md`;
      let existingFile = null;
      try {
        existingFile = await getFile(userPath);
      } catch (error: any) {
        if (error.status !== 401 && error.status !== 404) {
          throw error;
        }
      }
      
      try {
        await putFile(userPath, content, `Update profile for ${user.username}`, false, existingFile?.sha);
      } catch (error: any) {
        if (error.status === 401) {
          alert('GitHub token not configured. Profile saved locally only. Set VITE_API_KEY to sync to GitHub.');
        } else {
          throw error;
        }
      }

      // Update local storage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setIsEditing(false);

      // Reload page to update display name in UI
      window.location.reload();
    } catch (error) {
      safeLogError('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetGravatar = async () => {
    setIsResettingGravatar(true);
    try {
      const defaultAvatarUrl = await generateGravatarUrl(user.username);
      const updatedUser = {
        ...user,
        avatar: defaultAvatarUrl
      };
      const content = stringifyFrontmatter(updatedUser, '');
      
      // Get the current file with SHA to avoid 422 error
      const userPath = `users/${user.username}.md`;
      let existingFile = null;
      try {
        existingFile = await getFile(userPath);
      } catch (error: any) {
        if (error.status !== 401 && error.status !== 404) {
          throw error;
        }
      }
      
      try {
        await putFile(userPath, content, `Reset avatar to Gravatar for ${user.username}`, false, existingFile?.sha);
      } catch (error: any) {
        if (error.status === 401) {
          alert('GitHub token not configured. Avatar reset locally only. Set VITE_API_KEY to sync to GitHub.');
        } else {
          throw error;
        }
      }
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (error) {
      safeLogError('Error resetting avatar:', error);
      alert('Failed to reset avatar. Please try again.');
    } finally {
      setIsResettingGravatar(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t('profile')}</h1>
      </div>

      {user.username === 'admin' && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 rounded-md btn-accent hover:opacity-90 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            {t('adminPanel')}
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Avatar Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isResettingGravatar}
                className="absolute bottom-0 right-0 w-8 h-8 btn-accent hover:opacity-90 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                title={t('uploadAvatar')}
              >
                {isUploading || isResettingGravatar ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">{user.displayName}</h2>
              <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {t('joined')} {new Date(user.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('displayName')}
            </label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  placeholder={t('enterDisplayName')}
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !displayName.trim()}
                  className="px-4 py-2 btn-accent hover:opacity-90 text-white rounded-md flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.displayName);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md"
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-gray-100">{user.displayName}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="link-accent hover:opacity-80 text-sm transition-colors"
                >
                  {t('edit')}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('username')}
            </label>
            <span className="text-gray-600 dark:text-gray-400">@{user.username}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('language')}
            </label>
            <select
              value={user?.lang || 'en'}
              onChange={async (e) => {
                const newLang = e.target.value;
                setIsSaving(true);
                try {
                  const updatedUser = { ...user!, lang: newLang };
                  const content = stringifyFrontmatter(updatedUser, '');
                  let existingFile = null;
                  try {
                    existingFile = await getFile(`users/${user!.username}.md`);
                  } catch (error: any) {
                    if (error.status !== 401 && error.status !== 404) {
                      throw error;
                    }
                  }
                  
                  try {
                    await putFile(`users/${user!.username}.md`, content, `Update language for ${user!.username}`, false, existingFile?.sha);
                  } catch (error: any) {
                    if (error.status === 401) {
                      console.warn('Language saved locally only - GitHub token not configured.');
                    } else {
                      throw error;
                    }
                  }
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  localStorage.setItem('lang', newLang);
                  window.location.reload(); // Reload to apply language
                } catch (error) {
                  safeLogError('Error saving language:', error);
                  alert('Failed to save language. Please try again.');
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('theme')}
            </label>
            <select
              value={theme}
              onChange={(e) => {
                const newTheme = e.target.value as 'light' | 'dark';
                setTheme(newTheme);
                // Update user file
                const updateUserTheme = async () => {
                  try {
                    const updatedUser = { ...user!, theme: newTheme };
                    const content = stringifyFrontmatter(updatedUser, '');
                    let existingFile = null;
                    try {
                      existingFile = await getFile(`users/${user!.username}.md`);
                    } catch (error: any) {
                      if (error.status !== 401 && error.status !== 404) {
                        throw error;
                      }
                    }
                    
                    try {
                      await putFile(`users/${user!.username}.md`, content, `Update theme for ${user!.username}`, false, existingFile?.sha);
                    } catch (error: any) {
                      if (error.status === 401) {
                        console.warn('Theme saved locally only - GitHub token not configured.');
                      } else {
                        throw error;
                      }
                    }
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                  } catch (error) {
                    safeLogError('Error saving theme:', error);
                    alert('Failed to save theme. Please try again.');
                  }
                };
                updateUserTheme();
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
                  } catch (error) {
                    safeLogError('Error saving theme:', error);
                    alert('Failed to save theme. Please try again.');
                  }
                };
                updateUserTheme();
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        {/* Color Picker */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <ColorPicker
            username={user.username}
            onColorChange={(color) => {
              console.log('Accent color changed to:', color);
            }}
          />
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <button
            onClick={handleResetGravatar}
            disabled={isResettingGravatar}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isResettingGravatar ? t('resetting') : t('resetToGravatar')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Avatar Upload Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{t('avatarUploadTitle')}</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• {t('avatarUploadFormats')}</li>
          <li>• {t('avatarUploadMaxSize')}</li>
          <li>• {t('avatarUploadRecommended')}</li>
          <li>• {t('avatarUploadStored')}</li>
        </ul>
      </div>
    </div>
  );
}