import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, User as UserIcon, Calendar, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTranslation } from '../lib/i18n';
import { putFile } from '../lib/github';
import { stringifyFrontmatter, generateGravatarUrl, safeLogError } from '../lib/utils';

export function ProfilePage() {
  const { user, logout } = useAuth();
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
        await putFile(`users/${user.username}.md`, content, `Update profile for ${user.username}`);

        // Update local storage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Reload page to update avatar in UI
        window.location.reload();
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
      await putFile(`users/${user.username}.md`, content, `Update profile for ${user.username}`);

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
      await putFile(`users/${user.username}.md`, content, `Reset avatar to Gravatar for ${user.username}`);
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
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Админская панель
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
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                title="Upload avatar"
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
                Joined {new Date(user.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Display Name
            </label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  placeholder="Enter display name"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !displayName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
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
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Username
            </label>
            <span className="text-gray-600 dark:text-gray-400">@{user.username}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Language
            </label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 capitalize">{user.lang}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Theme
            </label>
            <span className="text-gray-600 dark:text-gray-400 capitalize">{user.theme}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <button
            onClick={handleResetGravatar}
            disabled={isResettingGravatar}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isResettingGravatar ? 'Resetting...' : 'Reset to Gravatar Avatar'}
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
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Avatar Upload</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Supported formats: JPG, PNG, GIF, WebP</li>
          <li>• Maximum file size: 2MB</li>
          <li>• Recommended size: 200x200px or larger (square)</li>
          <li>• Images are stored in the repository</li>
        </ul>
      </div>
    </div>
  );
}